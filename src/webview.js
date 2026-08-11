(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let state = null;
  let settings = { wikiTag: 'wiki', createNoteByDefault: true };
  let I18N = { locale: 'en', locales: [], en: {}, builtin: {}, custom: {}, dict: {} };
  let draggedCardId = null;
  let draggedColumnId = null;
  let wikiPages = [];
  let currentWikiId = null;
  let currentWikiPage = null;
  let wikiEditMode = true;
  let transLang = null;
  let toastTimer = null;

  const post = (m) => webviewApi.postMessage(m);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => (w[0] || '').toUpperCase()).join('') || '?';
  const normalizeTag = (r) => String(r || '').trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-ZА-ЯЁ0-9\-_]/g, '').slice(0, 24);
  const projectTag = () => (state && state.project && state.project.tag) ? String(state.project.tag) : '';

  function T(key, params) {
    let s = (I18N.dict && I18N.dict[key]) || (I18N.en && I18N.en[key]) || key;
    if (params) for (const k of Object.keys(params)) s = s.split('{' + k + '}').join(params[k]);
    return s;
  }

  function statusName(st) {
    if (!st) return '—';
    if (st.id) {
      const k = 'status.' + st.id;
      const tr = T(k);
      if (tr !== k) return tr; // есть в словаре — используем перевод
    }
    return st.name || st.id || '—';
  }

  function applyI18nStatic() {
    $$('[data-i18n]').forEach((el) => { el.textContent = T(el.getAttribute('data-i18n')); });
    $$('[data-i18n-ph]').forEach((el) => { el.placeholder = T(el.getAttribute('data-i18n-ph')); });
    const wh = $('#wiki-hint');
    if (wh) wh.textContent = T('wiki.hint', { tag: settings.wikiTag });
  }

  function startNumber() {
    const n = parseInt(state && state.project ? state.project.startNumber : 1, 10);
    return isFinite(n) && n >= 1 ? n : 1;
  }
  function nextNum(tag) { return Math.max((state.counters || {})[tag] || 0, startNumber() - 1) + 1; }

  function fmtDate(ms) { if (!ms) return ''; try { return new Date(ms).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }
  function fmtShortMs(ms) { if (!ms) return ''; const d = new Date(ms); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0'); }
  function fmtShortStr(s) { if (!s) return ''; const p = String(s).split('-'); return p.length === 3 ? p[2] + '.' + p[1] : s; }
  function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function isOverdue(card) {
    if (!card.dueDate) return false;
    const st = state.statuses.find((s) => s.id === card.status);
    if (st && (st.id === 'done' || /готов|done/i.test(st.name))) return false;
    return String(card.dueDate) < todayStr();
  }

  function toast(msg, isErr) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('error', !!isErr);
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  async function apply(res) {
    if (!res) return;
    if (!res.ok) { toast(res.error || T('common.error'), true); return; }
    if (res.state) { state = res.state; renderBoard(); }
    if (res.settings) settings = Object.assign(settings, res.settings);
    if (res.i18n) { I18N = res.i18n; applyI18nStatic(); }
  }

  /* ================= ДОСКА ================= */

  function renderBoard() {
    const t = $('#board-title');
    if (t) t.textContent = '📋 ' + ((state.project && state.project.name) || T('app.title'));
    const wrap = $('#columns');
    wrap.innerHTML = '';
    if (!state) return;
    for (const col of state.columns) wrap.appendChild(buildColumn(col));
    const addBtn = document.createElement('button');
    addBtn.className = 'add-column';
    addBtn.textContent = T('col.addHolder');
    addBtn.onclick = showColumnModal;
    wrap.appendChild(addBtn);
  }

  function statusOptions(selected, allowNone) {
    let html = allowNone ? '<option value="">' + esc(T('col.statusKeep')) + '</option>' : '';
        return html + state.statuses.map((s) => '<option value="' + s.id + '"' + (s.id === selected ? ' selected' : '') + '>' + esc(statusName(s)) + '</option>').join('');
  }

  function buildColumn(col) {
    const el = document.createElement('section');
    el.className = 'column';
    el.dataset.id = col.id;
    el.innerHTML =
      '<header class="col-head">' +
      '<button class="icon-btn col-drag" title="' + esc(T('col.drag')) + '">⠿</button>' +
      '<span class="col-dot" style="background:' + esc(col.color) + '"></span>' +
      '<input class="col-title" value="' + esc(col.title) + '" title="' + esc(T('col.rename')) + '">' +
      '<span class="col-count">' + col.cardIds.length + '</span>' +
      '<button class="icon-btn col-gear" title="' + esc(T('col.holderSettings')) + '">⚙</button>' +
      '</header>' +
      '<div class="col-settings hidden">' +
      '<div class="field"><label>' + esc(T('col.name')) + '</label><input type="text" class="cs-title" value="' + esc(col.title) + '"></div>' +
      '<div class="field"><label>' + esc(T('col.color')) + '</label><input type="color" class="cs-color" value="' + esc(col.color) + '"></div>' +
      '<div class="field"><label>' + esc(T('col.status')) + '</label><select class="cs-status">' + statusOptions(col.status, true) + '</select></div>' +
      '<div class="cs-actions"><button class="btn cs-save">' + esc(T('col.save')) + '</button><button class="btn danger cs-delete">' + esc(T('col.delete')) + '</button></div>' +
      '</div>' +
      '<div class="cards" data-column-id="' + col.id + '"></div>' +
      '<button class="add-card-btn">' + esc(T('col.addCard')) + '</button>';

    const cardsEl = $('.cards', el);
    for (const id of col.cardIds) { const card = state.cards[id]; if (card) cardsEl.appendChild(buildCard(card)); }

    $('.col-title', el).addEventListener('change', async (e) => {
      await apply(await post({ action: 'updateColumn', columnId: col.id, patch: { title: e.target.value.trim() || col.title } }));
    });
    $('.col-gear', el).addEventListener('click', () => $('.col-settings', el).classList.toggle('hidden'));
    $('.cs-color', el).addEventListener('input', (e) => { $('.col-dot', el).style.background = e.target.value; post({ action: 'updateColumn', columnId: col.id, patch: { color: e.target.value } }); });
    $('.cs-save', el).addEventListener('click', async () => {
      await apply(await post({ action: 'updateColumn', columnId: col.id, patch: { title: $('.cs-title', el).value.trim() || col.title, color: $('.cs-color', el).value, status: $('.cs-status', el).value } }));
      toast(T('col.updated'));
    });
    $('.cs-delete', el).addEventListener('click', async () => {
      const n = col.cardIds.length;
      if (!confirm(T('col.confirmDelete', { title: col.title }) + (n ? '\n' + T('col.confirmDeleteCards', { n: String(n) }) : ''))) return;
      await apply(await post({ action: 'deleteColumn', columnId: col.id }));
    });
    $('.add-card-btn', el).addEventListener('click', () => showCardModal(null, col.id));

    const handle = $('.col-drag', el);
    handle.draggable = true;
    handle.addEventListener('dragstart', (e) => {
      draggedColumnId = col.id;
      e.dataTransfer.setData('text/plain', 'col:' + col.id);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => el.classList.add('dragging-col'), 0);
    });
    handle.addEventListener('dragend', () => { el.classList.remove('dragging-col'); removeColPlaceholder(); draggedColumnId = null; });

    cardsEl.addEventListener('dragover', (e) => {
      if (draggedColumnId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const after = getDragAfterElement(cardsEl, e.clientY);
      const ph = ensurePlaceholder();
      if (after == null) cardsEl.appendChild(ph); else cardsEl.insertBefore(ph, after);
    });
    cardsEl.addEventListener('drop', async (e) => {
      if (draggedColumnId) return;
      e.preventDefault();
      const cardId = draggedCardId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
      const index = computeDropIndex(cardsEl);
      removePlaceholder();
      draggedCardId = null;
      if (!cardId) return;
      await apply(await post({ action: 'moveCard', cardId, toColumnId: col.id, index }));
    });
    return el;
  }

  function buildCard(card) {
    const el = document.createElement('article');
    el.className = 'card';
    el.draggable = true;
    el.dataset.id = card.id;
    const st = state.statuses.find((s) => s.id === card.status) || { name: card.status || '—', color: '#6B778C' };
    const as = state.assignees.find((a) => a.id === card.assigneeId);

    const chips = ['<span class="date-chip" title="' + esc(T('card.created')) + '">🆕 ' + fmtShortMs(card.createdAt) + '</span>'];
    if (card.startDate) chips.push('<span class="date-chip" title="' + esc(T('card.start')) + '">▶ ' + fmtShortStr(card.startDate) + '</span>');
    if (card.dueDate) chips.push('<span class="date-chip' + (isOverdue(card) ? ' overdue' : '') + '" title="' + esc(T('card.due')) + '">⏰ ' + fmtShortStr(card.dueDate) + '</span>');

    el.innerHTML =
      '<div class="card-top"><span class="card-key">' + esc(card.key) + '</span>' +
      '<span class="status-chip" style="background:' + esc(st.color) + '">' + esc(statusName(st)) + '</span>' +
      '<span class="spacer"></span>' +
      '<button class="icon-btn card-edit" title="' + esc(T('card.edit')) + '">✎</button>' +
      '<button class="icon-btn card-del" title="' + esc(T('card.delete')) + '">🗑</button></div>' +
      '<h4 class="card-title">' + esc(card.title) + '</h4>' +
      '<div class="card-dates">' + chips.join('') + '</div>' +
      '<div class="card-foot">' +
      (as ? '<span class="avatar" style="background:' + esc(as.color) + '" title="' + esc(as.name + (as.role ? ' · ' + as.role : '')) + '">' + esc(initials(as.name)) + '</span>' : '<span class="avatar avatar-none" title="' + esc(T('card.unassigned')) + '">?</span>') +
      '<span class="tag-badge">#' + esc(card.tag) + '</span>' +
      (card.noteId ? '<button class="icon-btn card-note" title="' + esc(T('card.openNote')) + '">📝</button>' : '') +
      '</div>';

    el.addEventListener('dragstart', (e) => {
      draggedCardId = card.id;
      e.dataTransfer.setData('text/plain', card.id);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => el.classList.add('dragging'), 0);
    });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); removePlaceholder(); draggedCardId = null; });
    el.addEventListener('click', (e) => { if (e.target.closest('.icon-btn')) return; showCardModal(card.id); });
    $('.card-edit', el).addEventListener('click', (e) => { e.stopPropagation(); showCardModal(card.id); });
    $('.card-del', el).addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(T('card.confirmDelete', { key: card.key, title: card.title }))) return;
      let del = false;
      if (card.noteId) del = confirm(T('card.confirmNoteShort'));
      await apply(await post({ action: 'deleteCard', cardId: card.id, deleteNote: del }));
    });
    const nb = $('.card-note', el);
    if (nb) nb.addEventListener('click', async (e) => { e.stopPropagation(); await post({ action: 'openNote', noteId: card.noteId }); });
    return el;
  }

  function getDragAfterElement(container, y) {
    return $$('.card:not(.dragging)', container).reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: -Infinity, element: null }).element;
  }
  function ensurePlaceholder() { let ph = document.querySelector('.drop-placeholder'); if (!ph) { ph = document.createElement('div'); ph.className = 'drop-placeholder'; } return ph; }
  function removePlaceholder() { const ph = document.querySelector('.drop-placeholder'); if (ph) ph.remove(); }
  function computeDropIndex(cardsEl) {
    const ph = $('.drop-placeholder', cardsEl);
    if (!ph) return $$('.card:not(.dragging)', cardsEl).length;
    let i = 0, n = cardsEl.firstElementChild;
    while (n && n !== ph) { if (n.classList.contains('card') && !n.classList.contains('dragging')) i++; n = n.nextElementSibling; }
    return i;
  }
  function ensureColPlaceholder() { let ph = document.querySelector('.col-placeholder'); if (!ph) { ph = document.createElement('div'); ph.className = 'col-placeholder'; } return ph; }
  function removeColPlaceholder() { const ph = document.querySelector('.col-placeholder'); if (ph) ph.remove(); }
  function getDragAfterColumn(container, x) {
    return $$('.column:not(.dragging-col)', container).reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: -Infinity, element: null }).element;
  }
  function computeColumnIndex(wrap) {
    const ph = $('.col-placeholder', wrap);
    if (!ph) return $$('.column:not(.dragging-col)', wrap).length;
    let i = 0, n = wrap.firstElementChild;
    while (n && n !== ph) { if (n.classList.contains('column') && !n.classList.contains('dragging-col')) i++; n = n.nextElementSibling; }
    return i;
  }

  /* ================= МОДАЛКИ ================= */

  function openModal(title, html) { $('#modal-title').textContent = title; $('#modal-body').innerHTML = html; $('#modal-overlay').classList.remove('hidden'); }
  function closeModal() { $('#modal-overlay').classList.add('hidden'); $('#modal-body').innerHTML = ''; }
  const findColumnOf = (id) => state.columns.find((c) => c.cardIds.includes(id)) || null;

  function showCardModal(cardId, columnId) {
    const card = cardId ? state.cards[cardId] : null;
    const curCol = card ? (findColumnOf(card.id) || {}).id : columnId;
    const curStatus = card ? card.status : ((state.columns.find((c) => c.id === columnId) || {}).status);

    let html = '';
    if (!card) {
      html += '<div class="field"><label>' + esc(T('card.tag')) + '</label>' +
        '<input type="text" id="f-tag" list="tag-list" value="' + esc(projectTag()) + '" autocomplete="off">' +
        '<datalist id="tag-list">' + Object.keys(state.counters || {}).map((t) => '<option value="' + esc(t) + '">').join('') + '</datalist>' +
        '<div class="key-preview">' + esc(T('card.keyPreview')) + ' <b id="f-key-preview">—</b></div></div>';
    }
    html += '<div class="field"><label>' + esc(T('card.title')) + '</label><input type="text" id="f-title" value="' + (card ? esc(card.title) : '') + '"></div>';
    html += '<div class="field-row">' +
      '<div class="field"><label>' + esc(T('card.holder')) + '</label><select id="f-col">' + state.columns.map((c) => '<option value="' + c.id + '"' + (c.id === curCol ? ' selected' : '') + '>' + esc(c.title) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>' + esc(T('card.status')) + '</label><select id="f-status">' + statusOptions(curStatus, false) + '</select></div></div>';
    html += '<div class="field-row">' +
      '<div class="field"><label>' + esc(T('card.startDate')) + '</label><input type="date" id="f-start" value="' + (card && card.startDate ? card.startDate : '') + '"></div>' +
      '<div class="field"><label>' + esc(T('card.dueDate')) + '</label><input type="date" id="f-due" value="' + (card && card.dueDate ? card.dueDate : '') + '"></div></div>';
    html += '<div class="field"><label>' + esc(T('card.assignee')) + '</label><select id="f-assignee"><option value="">' + esc(T('card.noAssignee')) + '</option>' +
      state.assignees.map((a) => '<option value="' + a.id + '"' + (a.id === (card ? card.assigneeId : '') ? ' selected' : '') + '>' + esc(a.name) + (a.role ? ' — ' + esc(a.role) : '') + '</option>').join('') + '</select></div>';
    if (card) html += '<div class="hint">' + esc(T('card.created')) + ': ' + fmtDate(card.createdAt) + '</div>';
    if (!card) html += '<label class="check"><input type="checkbox" id="f-note"' + (settings.createNoteByDefault ? ' checked' : '') + '> ' + esc(T('card.createNote')) + '</label>';
    html += '<div class="modal-actions">' + (card ? '<button class="btn danger" id="f-delete">' + esc(T('card.delete')) + '</button>' : '') +
      '<span class="spacer"></span><button class="btn" id="f-cancel">' + esc(T('card.cancel')) + '</button>' +
      '<button class="btn primary" id="f-save">' + (card ? esc(T('card.save')) : esc(T('card.create'))) + '</button></div>';

    openModal(card ? T('card.editTitle', { key: card.key }) : T('card.new'), html);

    const tagInput = $('#f-tag');
    if (tagInput) {
      const upd = () => {
        const t = normalizeTag(tagInput.value);
        $('#f-key-preview').textContent = t ? t + '-' + nextNum(t) : '—';
      };
      tagInput.addEventListener('input', upd); upd();
    }
    $('#f-cancel').onclick = closeModal;
    $('#f-save').onclick = async () => {
      const titleVal = $('#f-title').value.trim();
      if (!titleVal) { toast(T('card.errTitle'), true); return; }
      if (card) {
        await apply(await post({
          action: 'updateCard', cardId: card.id, columnId: $('#f-col').value,
          patch: { title: titleVal, assigneeId: $('#f-assignee').value || null, status: $('#f-status').value, startDate: $('#f-start').value || null, dueDate: $('#f-due').value || null },
        }));
      } else {
        const tag = normalizeTag($('#f-tag').value) || normalizeTag(projectTag());
        if (!tag) { toast(T('card.errTag'), true); return; }
        await apply(await post({
          action: 'addCard',
          payload: { title: titleVal, tag, columnId: $('#f-col').value, statusId: $('#f-status').value, assigneeId: $('#f-assignee').value || null, startDate: $('#f-start').value || null, dueDate: $('#f-due').value || null, createNote: !!$('#f-note') && $('#f-note').checked },
        }));
      }
      closeModal();
    };
    const del = $('#f-delete');
    if (del) del.onclick = async () => {
      if (!confirm(T('card.confirmDelete', { key: card.key, title: card.title }))) return;
      let dn = false;
      if (card.noteId) dn = confirm(T('card.confirmNoteShort'));
      await apply(await post({ action: 'deleteCard', cardId: card.id, deleteNote: dn }));
      closeModal();
    };
    setTimeout(() => $('#f-title').focus(), 30);
  }

  function showColumnModal() {
    openModal(T('col.newTitle'),
      '<div class="field"><label>' + esc(T('col.name')) + '</label><input type="text" id="c-title" placeholder="' + esc(T('col.namePh')) + '"></div>' +
      '<div class="field"><label>' + esc(T('col.color')) + '</label><input type="color" id="c-color" value="#DFE1E6"></div>' +
      '<div class="field"><label>' + esc(T('col.status')) + '</label><select id="c-status">' + statusOptions('', true) + '</select></div>' +
      '<div class="modal-actions"><span class="spacer"></span><button class="btn" id="c-cancel">' + esc(T('common.cancel')) + '</button><button class="btn primary" id="c-save">' + esc(T('col.add')) + '</button></div>');
    $('#c-cancel').onclick = closeModal;
    $('#c-save').onclick = async () => {
      const t = $('#c-title').value.trim();
      if (!t) { toast(T('col.errName'), true); return; }
      await apply(await post({ action: 'addColumn', column: { title: t, color: $('#c-color').value, status: $('#c-status').value } }));
      closeModal();
    };
    setTimeout(() => $('#c-title').focus(), 30);
  }

  /* ================= НАСТРОЙКИ + ПЕРЕВОДЫ ================= */

    function fillSettings() {
    $('#s-proj-name').value = (state.project && state.project.name) || '';
    $('#s-proj-tag').value = (state.project && state.project.tag) || '';
    $('#s-start-num').value = String((state.project && state.project.startNumber) || 1);
    $('#s-proj-desc').value = (state.project && state.project.description) || '';
    $('#s-wiki-tag').value = settings.wikiTag || 'wiki';

    const sel = $('#s-locale');
    sel.innerHTML = '<option value="auto">' + esc(T('set.langAuto')) + '</option>' +
      (I18N.locales || []).map((l) => '<option value="' + l.id + '">' + esc(l.name) + '</option>').join('');
    sel.value = I18N.locale || 'auto';

    // Язык применяется СРАЗУ при выборе — приоритетнее автоопределения,
    // влияет только на плагин, не на весь Joplin
    sel.onchange = async () => {
      const loc = sel.value || 'auto';
      const r = await post({ action: 'i18n.setLocale', locale: loc });
      if (r && r.ok && r.i18n) {
        I18N = r.i18n;
        applyI18nStatic();
        renderBoard();
        if (currentWikiPage) renderWikiPage();
        renderWikiList($('#wiki-search').value);
        toast(T('set.saved'));
      } else if (r && r.error) {
        toast(r.error, true);
      }
      transLang = loc !== 'auto' ? loc : null;
      renderTransTable();
    };

    transLang = sel.value !== 'auto' ? sel.value : null;
    renderTransTable();
    renderSettingsAssignees();
  }

  function renderTransTable() {
    const box = $('#s-trans');
    if (!transLang) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const names = (I18N.locales || []).find((l) => l.id === transLang);
    $('#s-tr-title').textContent = T('set.trTitle', { lang: names ? names.name : transLang });

    const cur = ((I18N.custom || {})[transLang]) || ((I18N.builtin || {})[transLang]) || {};
    const keys = Object.keys(I18N.en || {});
    $('#s-tr-body').innerHTML = keys.map((k) =>
      '<tr><td>' + esc(I18N.en[k]) + '</td><td class="k">' + esc(k) + '</td>' +
      '<td><input type="text" data-trkey="' + esc(k) + '" value="' + esc(cur[k] || '') + '"></td></tr>'
    ).join('');
  }

  async function saveTranslations() {
    if (!transLang) return;
    const entries = {};
    $$('#s-tr-body input[data-trkey]').forEach((inp) => {
      const v = String(inp.value || '').trim();
      if (v) entries[inp.getAttribute('data-trkey')] = v;
    });
    const res = await post({ action: 'i18n.saveTranslations', locale: transLang, entries });
    if (res && res.ok) {
      I18N = res.i18n;
      applyI18nStatic();
      renderBoard();
      toast(T('set.trSaved'));
    } else toast((res && res.error) || T('common.error'), true);
  }

  function renderSettingsAssignees() {
    const wrap = $('#s-assignees');
    wrap.innerHTML = state.assignees.map((a) =>
      '<div class="assignee-row"><span class="avatar" style="background:' + esc(a.color) + '">' + esc(initials(a.name)) + '</span>' +
      '<span style="flex:1"><b>' + esc(a.name) + '</b>' + (a.role ? ' <span class="hint">· ' + esc(a.role) + '</span>' : '') + '</span>' +
      '<button class="icon-btn s-as-del" data-id="' + a.id + '" title="' + esc(T('card.delete')) + '">🗑</button></div>'
    ).join('') || '<div class="hint">' + esc(T('set.mNone')) + '</div>';
    $$('.s-as-del', wrap).forEach((b) => {
      b.onclick = async () => {
        if (!confirm(T('set.mConfirm'))) return;
        await apply(await post({ action: 'deleteAssignee', assigneeId: b.dataset.id }));
        renderSettingsAssignees();
      };
    });
  }

  /* ================= WIKI ================= */

  function wikiTree() {
    const ids = new Set(wikiPages.map((p) => p.id));
    const children = {};
    const roots = [];
    for (const p of wikiPages) {
      if (p.parent_id && ids.has(p.parent_id)) (children[p.parent_id] = children[p.parent_id] || []).push(p);
      else roots.push(p);
    }
    return { roots, children };
  }

  function wikiItemHtml(p, depth) {
    return '<li class="wiki-item' + (p.id === currentWikiId ? ' active' : '') + '" data-id="' + p.id + '" style="padding-left:' + (8 + depth * 14) + 'px">' +
      '<div class="t">' + (depth ? '└ ' : '') + esc(p.title || '—') + '</div>' +
      '<div class="d">' + esc(fmtDate(p.updated_time)) + '</div></li>';
  }

  function renderWikiList(filter) {
    const list = $('#wiki-list');
    const q = String(filter || '').toLowerCase();
    if (q) {
      const pages = wikiPages.filter((p) => String(p.title || '').toLowerCase().includes(q));
      list.innerHTML = pages.map((p) => wikiItemHtml(p, 0)).join('') || '<div class="hint">' + esc(T('wiki.nothing')) + '</div>';
    } else {
      const { roots, children } = wikiTree();
      let html = '';
      const walk = (p, d) => { html += wikiItemHtml(p, d); (children[p.id] || []).forEach((c) => walk(c, d + 1)); };
      roots.forEach((r) => walk(r, 0));
      list.innerHTML = html || '<div class="hint">' + esc(T('wiki.noPages')) + '</div>';
    }
    $$('.wiki-item', list).forEach((it) => { it.onclick = () => openWikiPage(it.dataset.id); });
  }

  async function refreshWikiList() {
    const res = await post({ action: 'wiki.list' });
    if (res && res.ok) {
      wikiPages = res.pages || [];
      // Открытая страница НЕ должна исчезать из списка ни при каких обстоятельствах
      if (currentWikiPage && !wikiPages.some((p) => p.id === currentWikiPage.id)) {
        wikiPages.unshift({
          id: currentWikiPage.id,
          title: currentWikiPage.title,
          updated_time: currentWikiPage.updated || Date.now(),
          parent_id: currentWikiPage.parentId || null,
        });
      }
      renderWikiList($('#wiki-search').value);
    }
  }

  async function loadWiki() {
    await refreshWikiList();
    if (currentWikiId && wikiPages.some((p) => p.id === currentWikiId)) await openWikiPage(currentWikiId);
    else if (wikiPages.length) await openWikiPage(wikiPages[0].id);
    else {
      currentWikiId = null;
      currentWikiPage = null;
      $('#wiki-main').innerHTML = '<div class="empty-wiki"><p style="font-size:15px">' + esc(T('wiki.empty1')) + '</p><p>' + esc(T('wiki.empty2')) + '</p><br><button class="btn primary" id="w-first">' + esc(T('wiki.createFirst')) + '</button></div>';
      $('#w-first').onclick = () => showWikiCreateModal(null);
    }
  }

  async function openWikiPage(id) {
    if (!id) { toast(T('wiki.notSelected'), true); return; }
    currentWikiId = id;
    renderWikiList($('#wiki-search').value);
    const res = await post({ action: 'wiki.get', id });
    if (!res || !res.ok) { toast((res && res.error) || T('common.error'), true); return; }
    currentWikiPage = res.page;
    wikiEditMode = true;
    renderWikiPage();
  }

  function renderWikiPage() {
    const p = currentWikiPage;
    if (!p) return;

    // Никогда не показываем [object Object]: тело — только строка
    const bodyStr = typeof p.body === 'string' ? p.body : (p.body == null ? '' : '');

    const content = wikiEditMode
      ? '<div class="wiki-edit"><textarea id="w-body">' + esc(bodyStr) + '</textarea></div>' +
        '<div class="modal-actions"><button class="btn" id="w-edit-cancel">' + esc(T('wiki.previewNoSave')) + '</button><span class="spacer"></span><button class="btn primary" id="w-save">' + esc(T('wiki.save')) + '</button></div>'
      : '<div class="md">' + mdToHtml(bodyStr) + '</div>';

    $('#wiki-main').innerHTML =
      '<div class="wiki-toolbar"><span class="wiki-updated">' + esc(T('wiki.updated')) + ' ' + esc(fmtDate(p.updated)) + '</span><span class="spacer"></span>' +
      '<button class="btn" id="w-refresh" title="⟳">⟳</button>' +
      '<button class="btn" id="w-child">' + esc(T('wiki.subpage')) + '</button>' +
      (wikiEditMode ? '<button class="btn" id="w-preview">' + esc(T('wiki.preview')) + '</button>' : '<button class="btn primary" id="w-edit">' + esc(T('wiki.edit')) + '</button>') +
      '<button class="btn" id="w-open">' + esc(T('wiki.inJoplin')) + '</button>' +
      '<button class="btn danger" id="w-del">' + esc(T('wiki.delete')) + '</button></div>' +
      (wikiEditMode
        ? '<input type="text" id="w-title-edit" class="doc-title-input" value="' + esc(p.title || '') + '" autocomplete="off">'
        : '<h1 class="doc-title">' + esc(p.title) + '</h1>') +
      content +
      '<div class="wiki-tags"><h4>🏷 ' + esc(T('wiki.tags')) + '</h4>' +
      '<div class="wiki-tags-list" id="w-tags"><span class="hint">' + esc(T('wiki.tagsLoading')) + '</span></div>' +
      '<div class="field-row"><div class="field" style="flex:1;margin-bottom:0"><input type="text" id="w-tag-input" placeholder="' + esc(T('wiki.addTagPh')) + '"></div>' +
      '<button class="btn" id="w-tag-add" title="＋">＋</button></div></div>';

    $('#w-refresh').onclick = () => openWikiPage(p.id);
    $('#w-child').onclick = () => showWikiCreateModal(p.id);
    $('#w-open').onclick = () => post({ action: 'wiki.open', id: p.id });
    $('#w-del').onclick = async () => {
      if (!confirm(T('wiki.confirmDelete', { title: p.title }))) return;
      currentWikiId = null; currentWikiPage = null;
      await post({ action: 'wiki.delete', id: p.id });
      await loadWiki();
    };
    const editBtn = $('#w-edit');
    if (editBtn) editBtn.onclick = () => { wikiEditMode = true; renderWikiPage(); };
    const prevBtn = $('#w-preview');
    if (prevBtn) prevBtn.onclick = () => { wikiEditMode = false; renderWikiPage(); };
    const cancelBtn = $('#w-edit-cancel');
    if (cancelBtn) cancelBtn.onclick = () => { wikiEditMode = false; renderWikiPage(); };
    const saveBtn = $('#w-save');
    if (saveBtn) saveBtn.onclick = async () => {
      const text = $('#w-body').value;
      const titleInput = $('#w-title-edit');
      const newTitle = titleInput ? String(titleInput.value || '').trim() : '';
      if (titleInput && !newTitle) { toast(T('wiki.errTitle'), true); return; }
      const res = await post({ action: 'wiki.save', id: p.id, body: text, title: newTitle || undefined });
      if (res && res.ok) {
        toast(T('wiki.saved'));
        currentWikiPage.body = text;
        if (newTitle) currentWikiPage.title = newTitle;
        wikiEditMode = false;
        renderWikiPage();
        await refreshWikiList();
      } else toast((res && res.error) || T('common.error'), true);
    };
    $('#w-tag-add').onclick = addWikiTag;
    const ti = $('#w-tag-input');
    if (ti) ti.addEventListener('keydown', (e) => { if (e.key === 'Enter') addWikiTag(); });

    loadWikiTags(p.id);
  }

  async function loadWikiTags(id) {
    const wrap = $('#w-tags');
    if (!id) { if (wrap) wrap.innerHTML = '<span class="hint">' + esc(T('wiki.notSelPage')) + '</span>'; return; }
    let res = await post({ action: 'wiki.tags', id });
    let tags = (res && res.ok && Array.isArray(res.tags)) ? res.tags : [];
    const wt = String(settings.wikiTag || 'wiki').toLowerCase();
    if (!tags.some((t) => String(t.title || '').toLowerCase() === wt)) {
      const r2 = await post({ action: 'wiki.tags.add', id, tag: settings.wikiTag });
      if (r2 && r2.ok) { tags = r2.tags || []; refreshWikiList(); }
      else if (r2 && r2.error) toast(T('wiki.tagFail', { err: r2.error }), true);
    }
    renderWikiTags(tags);
  }

  function renderWikiTags(tags) {
    const wrap = $('#w-tags');
    if (!wrap) return;
    const safe = (tags || []).filter((t) => t && t.id && String(t.title || '').trim());
    wrap.innerHTML = safe.map((t) => {
      return '<span class="tag-chip">#' + esc(t.title) + '<button class="chip-x" data-id="' + t.id + '" title="✕">✕</button></span>';
    }).join('') || '<span class="hint">' + esc(T('wiki.noTags')) + '</span>';
    $$('.chip-x', wrap).forEach((b) => {
      b.onclick = async () => {
        const res = await post({ action: 'wiki.tags.remove', id: currentWikiId, tagId: b.dataset.id });
        if (res && res.ok) renderWikiTags(res.tags);
        else toast((res && res.error) || T('common.error'), true);
      };
    });
  }

  async function addWikiTag() {
    const inp = $('#w-tag-input');
    if (!inp) return;
    const v = String(inp.value || '').trim();
    if (!v) return;
    if (!currentWikiId) { toast(T('wiki.notSelected'), true); return; }
    const res = await post({ action: 'wiki.tags.add', id: currentWikiId, tag: v });
    if (res && res.ok) { inp.value = ''; renderWikiTags(res.tags); }
    else toast((res && res.error) || T('common.error'), true);
  }

  function showWikiCreateModal(parentId) {
    const { roots, children } = wikiTree();
    let opts = '<option value="">' + esc(T('wiki.root')) + '</option>';
    const walk = (p, d) => {
      opts += '<option value="' + p.id + '"' + (p.id === parentId ? ' selected' : '') + '>' + '&nbsp;'.repeat(d * 3) + (d ? '└ ' : '') + esc(p.title || '—') + '</option>';
      (children[p.id] || []).forEach((c) => walk(c, d + 1));
    };
    roots.forEach((r) => walk(r, 0));

    openModal(T('wiki.newTitle'),
      '<div class="field"><label>' + esc(T('wiki.pageTitle')) + '</label><input type="text" id="w-title" placeholder="' + esc(T('wiki.pageTitlePh')) + '"></div>' +
      '<div class="field"><label>' + esc(T('wiki.parent')) + '</label><select id="w-parent">' + opts + '</select></div>' +
      '<div class="hint">' + esc(T('wiki.hintTag', { tag: settings.wikiTag })) + '</div>' +
      '<div class="modal-actions"><span class="spacer"></span><button class="btn" id="w-cancel">' + esc(T('common.cancel')) + '</button><button class="btn primary" id="w-create">' + esc(T('wiki.create')) + '</button></div>');
    $('#w-cancel').onclick = closeModal;
    $('#w-create').onclick = async () => {
      const t = String($('#w-title').value || '').trim();
      if (!t) { toast(T('wiki.errTitle'), true); return; }
      const res = await post({ action: 'wiki.create', title: t, parentId: $('#w-parent').value || null });
      if (res && res.ok) {
        closeModal();
        toast(T('wiki.created'));
        await refreshWikiList();
        if (res.id) {
          if (!wikiPages.some((p) => p.id === res.id)) {
            const g = await post({ action: 'wiki.get', id: res.id });
            if (g && g.ok) {
              wikiPages.unshift({ id: g.page.id, title: g.page.title, updated_time: g.page.updated, parent_id: g.page.parentId });
              renderWikiList($('#wiki-search').value);
            }
          }
          await openWikiPage(res.id);
        }
      } else toast((res && res.error) || T('common.error'), true);
    };
    setTimeout(() => $('#w-title').focus(), 30);
  }

  function mdToHtml(src) {
    const lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
    const out = []; let inCode = false, codeBuf = [], listType = null;
    const closeList = () => { if (listType) { out.push('</' + listType + '>'); listType = null; } };
    const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inline = (s) => {
      s = escHtml(s);
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
      s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
      s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">');
      s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      return s;
    };
    for (const line of lines) {
      if (/^```/.test(line)) { if (inCode) { out.push('<pre><code>' + escHtml(codeBuf.join('\n')) + '</code></pre>'); codeBuf = []; inCode = false; } else { closeList(); inCode = true; } continue; }
      if (inCode) { codeBuf.push(line); continue; }
      const h = line.match(/^(#{1,6})\s+(.*)$/); if (h) { closeList(); const l = h[1].length; out.push('<h' + l + '>' + inline(h[2]) + '</h' + l + '>'); continue; }
      if (/^\s*(---|\*\*\*)\s*$/.test(line)) { closeList(); out.push('<hr>'); continue; }
      const bq = line.match(/^>\s?(.*)$/); if (bq) { closeList(); out.push('<blockquote>' + inline(bq[1]) + '</blockquote>'); continue; }
      const task = line.match(/^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/);
      if (task) { if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; } out.push('<li class="task"><input type="checkbox" disabled' + (task[1] !== ' ' ? ' checked' : '') + '> ' + inline(task[2]) + '</li>'); continue; }
      const ul = line.match(/^\s*[-*+]\s+(.*)$/);
      if (ul) { if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; } out.push('<li>' + inline(ul[1]) + '</li>'); continue; }
      const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ol) { if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; } out.push('<li>' + inline(ol[1]) + '</li>'); continue; }
      if (line.trim() === '') { closeList(); continue; }
      closeList(); out.push('<p>' + inline(line) + '</p>');
    }
    if (inCode) out.push('<pre><code>' + escHtml(codeBuf.join('\n')) + '</code></pre>');
    closeList();
    return out.join('\n');
  }

  /* ================= ВКЛАДКИ / INIT ================= */

  function switchTab(tab) {
    $$('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    $('#tab-board').classList.toggle('hidden', tab !== 'board');
    $('#tab-wiki').classList.toggle('hidden', tab !== 'wiki');
    $('#tab-settings').classList.toggle('hidden', tab !== 'settings');
    if (tab === 'wiki') loadWiki();
    if (tab === 'settings') fillSettings();
  }

  async function init() {
    $$('.tab-btn').forEach((b) => { b.onclick = () => switchTab(b.dataset.tab); });
    $('#btn-add-card').onclick = () => showCardModal(null, state && state.columns[0] ? state.columns[0].id : null);
    $('#modal-close').onclick = closeModal;
    $('#modal-overlay').addEventListener('click', (e) => { if (e.target === $('#modal-overlay')) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    $('#wiki-search').addEventListener('input', (e) => renderWikiList(e.target.value));
    $('#wiki-new').onclick = () => showWikiCreateModal(null);

    $('#s-save').onclick = async () => {
      await apply(await post({
        action: 'updateProject',
        patch: {
          name: $('#s-proj-name').value.trim(),
          description: $('#s-proj-desc').value,
          tag: $('#s-proj-tag').value.trim(),
          startNumber: parseInt($('#s-start-num').value, 10) || 1,
        },
      }));
      await apply(await post({ action: 'setWikiTag', tag: $('#s-wiki-tag').value.trim() || 'wiki' }));
      const loc = $('#s-locale').value || 'auto';
      const r3 = await post({ action: 'i18n.setLocale', locale: loc });
      if (r3 && r3.ok) { I18N = r3.i18n; }
      const res = await post({ action: 'getState' });
      if (res && res.ok) { state = res.state; settings = Object.assign(settings, res.settings || {}); if (res.i18n) I18N = res.i18n; }
      applyI18nStatic();
      renderBoard();
      fillSettings();
      toast(T('set.saved'));
    };

    $('#s-tr-save').onclick = saveTranslations;

    $('#s-as-add').onclick = async () => {
      const name = $('#s-as-name').value.trim();
      if (!name) { toast(T('set.mErrName'), true); return; }
      await apply(await post({ action: 'addAssignee', name, role: $('#s-as-role').value.trim(), color: $('#s-as-color').value }));
      $('#s-as-name').value = ''; $('#s-as-role').value = '';
      renderSettingsAssignees();
    };

    const wrap = $('#columns');
    wrap.addEventListener('dragover', (e) => {
      if (!draggedColumnId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const after = getDragAfterColumn(wrap, e.clientX);
      const ph = ensureColPlaceholder();
      if (after == null) wrap.appendChild(ph); else wrap.insertBefore(ph, after);
    });
    wrap.addEventListener('drop', async (e) => {
      if (!draggedColumnId) return;
      e.preventDefault();
      const index = computeColumnIndex(wrap);
      removeColPlaceholder();
      const colId = draggedColumnId; draggedColumnId = null;
      await apply(await post({ action: 'moveColumn', columnId: colId, index }));
    });

    const res = await post({ action: 'getState' });
    if (!res || !res.ok) { toast(T('board.loadFail'), true); return; }
    state = res.state;
    settings = Object.assign(settings, res.settings || {});
    if (res.i18n) I18N = res.i18n;
    applyI18nStatic();
    renderBoard();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();