import { joplin } from './api';

export async function getFirstFolderId(): Promise<string | null> {
  try {
    const folders = await joplin.data.get(['folders'], { fields: ['id', 'title'], limit: 1 });
    return folders && folders.items && folders.items.length ? String(folders.items[0].id) : null;
  } catch (e) { console.warn('Kanban: не удалось получить папки', e); return null; }
}

/* ---------- нормализация тэгов ---------- */

function normTagItem(t: any): { id: string | null; title: string } {
  if (!t || typeof t !== 'object') return { id: null, title: '' };
  const id = t.id != null ? String(t.id) : (t.tag_id != null ? String(t.tag_id) : null);
  const title = t.title != null ? String(t.title) : (t.name != null ? String(t.name) : '');
  return { id, title };
}

export async function listAllTags(): Promise<Array<{ id: string; title: string }>> {
  const out: Array<{ id: string; title: string }> = [];
  for (let page = 1; page <= 5; page++) {
    let items: any[] = [];
    try {
      const res = await joplin.data.get(['tags'], { limit: 100, page });
      items = (res && res.items) || [];
    } catch (e) { console.warn('Kanban: ошибка списка тэгов', e); break; }
    if (!items.length) break;
    for (const it of items) {
      const n = normTagItem(it);
      if (n.id) out.push({ id: n.id, title: n.title });
    }
    if (items.length < 100) break;
  }
  return out;
}

export async function findTag(title: string): Promise<string | null> {
  const all = await listAllTags();
  const f = all.find((t) => t.title.toLowerCase() === String(title).toLowerCase());
  return f ? f.id : null;
}

async function tryCreateTag(title: string): Promise<string | null> {
  const safe = String(title);
  const shapes: any[] = [{ body: { title: safe } }, { title: safe }];
  for (const s of shapes) {
    try {
      const r = await joplin.data.post(['tags'], null, s);
      if (r && r.id) return String(r.id);
    } catch (e) { console.warn('Kanban: вариант создания тэга не прошёл', e); }
  }
  return null;
}

async function tryRenameTag(tagId: string, title: string): Promise<void> {
  const shapes: any[] = [{ body: { title: String(title) } }, { title: String(title) }];
  for (const s of shapes) {
    try { await joplin.data.put(['tags', String(tagId)], null, s); } catch (e) { /* дальше */ }
  }
}

export async function getOrCreateTag(title: string): Promise<string | null> {
  const safe = String(title);
  let all = await listAllTags();
  let found = all.find((t) => t.title.toLowerCase() === safe.toLowerCase());
  if (found) return found.id;

  const newId = await tryCreateTag(safe);
  if (!newId) return null;

  all = await listAllTags();
  const created = all.find((t) => t.id === newId);
  if (created && created.title !== safe) await tryRenameTag(newId, safe);
  const byTitle = all.find((t) => t.title.toLowerCase() === safe.toLowerCase());
  return byTitle ? byTitle.id : newId;
}

async function linkTag(tagId: string, noteId: string): Promise<boolean> {
  const variants: any[] = [
    { id: String(noteId) },
    { note_id: String(noteId) },
  ];
  for (const v of variants) {
    try {
      await joplin.data.post(['tags', String(tagId), 'notes'], null, v);
      return true;
    } catch (e) { /* пробуем следующий */ }
  }
  return false;
}

export async function getNoteTags(noteId: string): Promise<Array<{ id: string; title: string }>> {
  if (!noteId) return [];
  let items: any[] = [];
  try {
    const res = await joplin.data.get(['notes', String(noteId), 'tags'], { limit: 100 });
    items = (res && res.items) || [];
  } catch (e) { console.warn('Kanban: не удалось получить тэги заметки', e); return []; }

  const norm: Array<{ id: string; title: string }> = items
    .map(normTagItem)
    .filter((t): t is { id: string; title: string } => t.id !== null);

  if (norm.some((t) => !t.title)) {
    const all = await listAllTags();
    const byId: Record<string, string> = {};
    for (const a of all) byId[a.id] = a.title;
    for (const t of norm) if (!t.title && byId[t.id]) t.title = byId[t.id];
  }
  return norm;
}

export async function ensureTagOnNote(noteId: string, tagTitle: string): Promise<Array<{ id: string; title: string }>> {
  if (!noteId) throw new Error('Не передан ID заметки');
  const safe = String(tagTitle || '').trim();
  if (!safe) throw new Error('Пустое название тэга');

  let current = await getNoteTags(noteId);
  if (current.some((t) => t.title.toLowerCase() === safe.toLowerCase())) return current;

  const all = await listAllTags();
  let target = all.find((t) => t.title.toLowerCase() === safe.toLowerCase()) || null;
  if (!target) {
    const tid = await getOrCreateTag(safe);
    if (tid) target = { id: tid, title: safe };
  }
  if (!target) throw new Error('Не удалось создать тэг «' + safe + '»');

  const targetId = target.id;
  if (current.some((t) => t.id === targetId)) return current;

  const ok = await linkTag(targetId, noteId);
  if (!ok) throw new Error('Joplin не привязал тэг «' + safe + '» к заметке');

  current = await getNoteTags(noteId);
  if (!current.some((t) => t.id === targetId || t.title.toLowerCase() === safe.toLowerCase())) {
    throw new Error('Тэг «' + safe + '» не подтвердился после привязки');
  }
  return current;
}

export async function addTagToNote(noteId: string, tagTitle: string): Promise<Array<{ id: string; title: string }>> {
  return ensureTagOnNote(noteId, tagTitle);
}

export async function removeTagFromNote(noteId: string, tagId: string): Promise<Array<{ id: string; title: string }>> {
  if (!noteId || !tagId) throw new Error('Не передан ID заметки или тэга');
  try {
    await joplin.data.delete(['tags', String(tagId), 'notes', String(noteId)]);
  } catch (e) { console.warn('Kanban: не удалось отвязать тэг', e); }
  return await getNoteTags(noteId);
}

async function noteInTagList(tagId: string, noteId: string): Promise<boolean> {
  try {
    const r = await joplin.data.get(['tags', String(tagId), 'notes'], { limit: 200 });
    return ((r && r.items) || []).some((n: any) => String(n.id) === String(noteId));
  } catch (e) { return false; }
}

export async function ensureWikiLink(noteId: string, tagName: string): Promise<void> {
  try { await ensureTagOnNote(noteId, tagName); } catch (e) { console.warn('Kanban: ensureTagOnNote after save failed', e); }

  const tagId = await findTag(tagName);
  if (!tagId) return;
  if (await noteInTagList(tagId, noteId)) return;

  for (const v of [{ id: String(noteId) }, { note_id: String(noteId) }]) {
    try { await joplin.data.post(['tags', String(tagId), 'notes'], null, v); } catch (e) { /* дальше */ }
    if (await noteInTagList(tagId, noteId)) return;
  }
  console.warn('Kanban: не удалось подтвердить связку тэг↔заметка после сохранения');
}

/* ---------- робастные заметки ---------- */

async function fetchNote(id: string): Promise<any | null> {
  try {
    return await joplin.data.get(['notes', String(id)], { fields: ['id', 'title', 'body', 'parent_id', 'updated_time'] });
  } catch (e) { return null; }
}

function noteContentOk(n: any, title: string, body: string): boolean {
  return !!n && String(n.title) === String(title) && String(n.body) === String(body);
}

async function createNoteRobust(title: string, body: string, parentId: string | null): Promise<any> {
  const t = String(title);
  const b = String(body);
  const pid = parentId ? String(parentId) : null;

  const shapes: any[] = [];
  if (pid) shapes.push({ body: { title: t, body: b, parent_id: pid } });
  shapes.push({ body: { title: t, body: b } });
  if (pid) shapes.push({ title: t, body: b, parent_id: pid });
  shapes.push({ title: t, body: b });

  for (const s of shapes) {
    let id: string | null = null;
    try {
      const r = await joplin.data.post(['notes'], null, s);
      id = r && r.id ? String(r.id) : null;
    } catch (e) { continue; }
    if (!id) continue;

    for (const p of [{ body: { title: t, body: b } }, { title: t, body: b }]) {
      try { await joplin.data.put(['notes', id], null, p); } catch (e) { continue; }
      const n = await fetchNote(id);
      if (noteContentOk(n, t, b)) break;
    }
    let n = await fetchNote(id);
    if (!noteContentOk(n, t, b)) continue;

    if (pid) {
      if (String((n as any).parent_id || '') !== pid) {
        for (const p of [{ body: { parent_id: pid } }, { parent_id: pid }]) {
          try { await joplin.data.put(['notes', id], null, p); } catch (e) { continue; }
          const m = await fetchNote(id);
          if (m && String(m.parent_id || '') === pid) break;
        }
      }
    }
    return (await fetchNote(id)) || n;
  }
  throw new Error('Joplin не смог создать заметку ни одним способом');
}

export async function saveWikiPage(noteId: string, body: string, title?: string): Promise<void> {
  if (!noteId) throw new Error('wiki.save: не передан ID заметки');
  const text = typeof body === 'string' ? body : String(body == null ? '' : body);
  const id = String(noteId);
  const wantTitle = title != null && String(title).trim() !== '' ? String(title) : null;

  const shapes: any[] = [];
  if (wantTitle != null) {
    shapes.push({ body: { body: text, title: wantTitle } });
    shapes.push({ body: text, title: wantTitle });
  }
  shapes.push({ body: { body: text } });
  shapes.push({ body: text });

  for (const p of shapes) {
    try { await joplin.data.put(['notes', id], null, p); } catch (e) { continue; }
    const n = await fetchNote(id);
    const bodyOk = !!n && String(n.body) === text;
    const titleOk = wantTitle == null || (!!n && String(n.title) === wantTitle);
    if (bodyOk && titleOk) return;
  }
  throw new Error('wiki.save: Joplin не сохранил страницу');
}

export async function createTaskNote(card: any, assigneeName: string, statusName: string): Promise<string | undefined> {
  const folderId = await getFirstFolderId();

  const text = String([
    '| Поле | Значение |',
    '| --- | --- |',
    '| **Ключ** | `' + String(card.key) + '` |',
    '| **Тэг** | ' + String(card.tag) + ' |',
    '| **Статус** | ' + (statusName || '—') + ' |',
    '| **Исполнитель** | ' + (assigneeName || '—') + ' |',
    '',
    '## Описание',
    '',
    card.description || '*Описание отсутствует*',
  ].join('\n'));

  try {
    const note = await createNoteRobust(String(card.key + ' ' + card.title), text, folderId);
    try { await ensureTagOnNote(String(note.id), String(card.tag)); } catch (e) { console.warn('Kanban: не удалось привязать тэг карточки', e); }
    try {
      const cardTags = Array.isArray(card.tags) ? card.tags : [];
      for (const tg of cardTags) {
        try { await ensureTagOnNote(String(note.id), String(tg)); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
    return String(note.id);
  } catch (e) {
    console.warn('Kanban: создание заметки карточки не удалось', e);
    return undefined;
  }
}

/**
 * Список Wiki-страниц = объединение трёх источников:
 * 1) тэг→заметки (может не работать в некоторых сборках),
 * 2) поиск "tag:..." (работает в некоторых версиях),
 * 3) реестр плагина (надёжный источник).
 */
export async function listWikiPages(tagName: string, extraIds: string[]): Promise<any[]> {
  const map = new Map<string, any>();
  const push = (p: any) => { if (p && p.id) map.set(String(p.id), p); };

  const tagId = await findTag(tagName);
  if (tagId) {
    try {
      const r = await joplin.data.get(['tags', tagId, 'notes'], {
        fields: ['id', 'title', 'updated_time', 'parent_id'],
        order_by: 'updated_time', order_dir: 'DESC', limit: 200,
      });
      ((r && r.items) || []).forEach(push);
    } catch (e) { /* ignore */ }
    try {
      const r2 = await joplin.data.get(['tags', tagId, 'notes'], { limit: 200 });
      ((r2 && r2.items) || []).forEach(push);
    } catch (e) { /* ignore */ }
  }

  try {
    const r3 = await joplin.data.get(['search'], { query: 'tag:' + String(tagName), type: 'note', fields: ['id', 'title', 'updated_time', 'parent_id'], limit: 200 });
    ((r3 && r3.items) || []).forEach(push);
  } catch (e) { /* ignore */ }

  for (const id of extraIds || []) {
    const sid = String(id);
    if (map.has(sid)) continue;
    const n = await fetchNote(sid);
    if (n && n.id) push({ id: n.id, title: n.title, updated_time: n.updated_time, parent_id: n.parent_id });
  }

  const all = Array.from(map.values());
  all.sort((a, b) => (Number(b.updated_time) || 0) - (Number(a.updated_time) || 0));
  return all;
}

/** Одноразовый скан: найти старые Wiki-страницы по тэгу и вернуть в реестр. */
export async function backfillWikiPages(
  tagName: string,
  has: (id: string) => boolean,
  register: (id: string) => void
): Promise<number> {
  const tagId = await findTag(tagName);
  if (!tagId) return 0;
  let added = 0;
  for (let page = 1; page <= 2; page++) {
    let items: any[] = [];
    try {
      const r = await joplin.data.get(['notes'], { fields: ['id'], limit: 100, page });
      items = (r && r.items) || [];
    } catch (e) { break; }
    if (!items.length) break;
    for (const it of items) {
      const id = it && it.id ? String(it.id) : null;
      if (!id || has(id)) continue;
      try {
        const tags = await joplin.data.get(['notes', id, 'tags'], { fields: ['id'], limit: 50 });
        const ids = ((tags && tags.items) || []).map((t: any) => String(t.id));
        if (ids.includes(tagId)) { register(id); added++; }
      } catch (e) { /* ignore */ }
    }
    if (items.length < 100) break;
  }
  return added;
}

export async function createWikiPage(title: string, tagName: string, parentId?: string | null): Promise<any> {
  const safeTitle = String(title || 'Новая страница');
  const text = String([
    '# ' + safeTitle, '',
    'Начните писать документацию здесь. Кнопка «💾 Сохранить» записывает текст, «👁 Предпросмотр» — показывает оформление.', '',
    '## Раздел', '', '- Пункт 1', '- Пункт 2',
  ].join('\n'));

  const folderId = await getFirstFolderId();
  const wantedParent = parentId ? String(parentId) : (folderId || null);

  const note = await createNoteRobust(safeTitle, text, wantedParent);

  try { await ensureTagOnNote(String(note.id), String(tagName || 'wiki')); } catch (e) { console.warn('Kanban: тэг wiki не привязался сразу — повторим при открытии', e); }

  return note;
}

export async function deleteNote(noteId: string): Promise<void> {
  if (!noteId) throw new Error('wiki.delete: не передан ID заметки');
  await joplin.data.delete(['notes', String(noteId)]);
}
