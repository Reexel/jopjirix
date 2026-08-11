import { joplin, SettingItemType, SettingStorage } from './api';
import { Assignee, BoardState, Card, Column, Project } from './types';
import { defaultState } from './defaults';
import { normalizeTag, uid } from './util';
import { BUILTIN, LOCALES, buildDict, detectLocale } from './i18n';

const STATE_KEY = 'kanbanBoardState';
const WIKI_TAG_KEY = 'kanbanWikiTag';
const CREATE_NOTE_KEY = 'kanbanCreateNote';
const LOCALE_KEY = 'kanbanLocale';
const CUSTOM_LOCALES_KEY = 'kanbanCustomLocales';
const SECTION = 'kanbanSection';

export class BoardStore {
  public state: BoardState = defaultState();
  public wikiTag = 'wiki';
  public createNoteByDefault = true;
  public locale = 'auto';
  public customLocales: Record<string, Record<string, string>> = {};
  private detected = 'en';
  private localesFile: string | null = null;

  async init(): Promise<void> {
    await joplin.settings.registerSection(SECTION, {
      label: 'Канбан-доска и Wiki',
      description: 'Настройки плагина Jira-style Kanban & Wiki',
      iconName: 'fas fa-columns',
    });

    await joplin.settings.registerSettings({
      [STATE_KEY]: { value: '', type: SettingItemType.String, storage: SettingStorage.Local, public: false, label: 'Состояние доски (служебное)' },
      [WIKI_TAG_KEY]: { value: 'wiki', type: SettingItemType.String, public: true, section: SECTION, label: 'Тэг для страниц Wiki' },
      [CREATE_NOTE_KEY]: { value: true, type: SettingItemType.Bool, public: true, section: SECTION, label: 'Создавать заметку Joplin для новой карточки (по умолчанию)' },
      [LOCALE_KEY]: { value: 'auto', type: SettingItemType.String, public: true, section: SECTION, label: 'Язык интерфейса (auto / en / ru / …)' },
      [CUSTOM_LOCALES_KEY]: { value: '', type: SettingItemType.String, storage: SettingStorage.Local, public: false, label: 'Пользовательские переводы (служебное)' },
    });

    this.wikiTag = String((await joplin.settings.value(WIKI_TAG_KEY)) || 'wiki');
    this.createNoteByDefault = Boolean(await joplin.settings.value(CREATE_NOTE_KEY));
    this.locale = String((await joplin.settings.value(LOCALE_KEY)) || 'auto');

    try {
      const jl = String(await joplin.settings.globalValue('locale') || 'en');
      this.detected = detectLocale(jl);
    } catch (e) { this.detected = 'en'; }

    try {
      const fs = joplin.require('fs');
      const path = joplin.require('path');
      const dir = await joplin.plugins.dataDir();
      this.localesFile = path.join(dir, 'jopjirix-locales.json');
      if (fs.existsSync(this.localesFile)) {
        this.customLocales = JSON.parse(fs.readFileSync(this.localesFile, 'utf8')) || {};
      }
    } catch (e) { console.warn('Kanban: не удалось прочитать файл переводов', e); }
    if (!this.customLocales || !Object.keys(this.customLocales).length) {
      try {
        const raw = await joplin.settings.value(CUSTOM_LOCALES_KEY);
        if (raw) this.customLocales = JSON.parse(raw);
      } catch (e) { console.warn('Kanban: не удалось прочитать переводы из настроек', e); }
    }

    try {
      const raw = await joplin.settings.value(STATE_KEY);
      if (raw) this.state = this.migrate(JSON.parse(raw));
    } catch (e) {
      console.error('🔴 Kanban: не удалось прочитать состояние доски', e);
      this.state = defaultState();
    }

    joplin.settings.onChange(async (event: any) => {
      const keys: string[] = (event && event.keys) || [];
      if (keys.indexOf(WIKI_TAG_KEY) >= 0) this.wikiTag = String((await joplin.settings.value(WIKI_TAG_KEY)) || 'wiki');
      if (keys.indexOf(CREATE_NOTE_KEY) >= 0) this.createNoteByDefault = Boolean(await joplin.settings.value(CREATE_NOTE_KEY));
      if (keys.indexOf(LOCALE_KEY) >= 0) this.locale = String((await joplin.settings.value(LOCALE_KEY)) || 'auto');
    });
  }

  resolvedLocale(): string {
    return this.locale !== 'auto' ? this.locale : this.detected;
  }

  i18nPayload() {
    const locale = this.resolvedLocale();
    return {
      locale,
      locales: LOCALES,
      en: BUILTIN.en,
      builtin: BUILTIN,
      custom: this.customLocales || {},
      dict: buildDict(locale, this.customLocales),
    };
  }

  async setLocale(l: string): Promise<void> {
    this.locale = String(l || 'auto');
    await joplin.settings.setValue(LOCALE_KEY, this.locale);
  }

  async saveTranslations(lang: string, entries: Record<string, string>): Promise<void> {
    const cur = Object.assign({}, (this.customLocales || {})[lang]);
    for (const k of Object.keys(entries || {})) {
      const v = String(entries[k] || '').trim();
      if (v) cur[k] = v; else delete cur[k];
    }
    this.customLocales = Object.assign({}, this.customLocales, { [lang]: cur });
    try {
      if (this.localesFile) {
        const fs = joplin.require('fs');
        fs.writeFileSync(this.localesFile, JSON.stringify(this.customLocales, null, 2), 'utf8');
      }
    } catch (e) { console.warn('Kanban: не удалось записать файл переводов', e); }
    await joplin.settings.setValue(CUSTOM_LOCALES_KEY, JSON.stringify(this.customLocales));
  }

  async save(): Promise<void> {
    await joplin.settings.setValue(STATE_KEY, JSON.stringify(this.state));
  }

  publicSettings() {
    return { wikiTag: this.wikiTag, createNoteByDefault: this.createNoteByDefault };
  }

  async setWikiTag(tag: string): Promise<void> {
    const t = String(tag || 'wiki').trim() || 'wiki';
    this.wikiTag = t;
    await joplin.settings.setValue(WIKI_TAG_KEY, t);
  }

  setProject(patch: Partial<Project>): void {
    if (!this.state.project) this.state.project = { name: '', description: '', tag: '', startNumber: 1 };
    if (patch.name !== undefined) this.state.project.name = String(patch.name);
    if (patch.description !== undefined) this.state.project.description = String(patch.description);
    if (patch.tag !== undefined) this.state.project.tag = String(patch.tag);
    if (patch.startNumber !== undefined) this.state.project.startNumber = this.numOr(patch.startNumber, 1);
  }

  /* ---------- реестр Wiki-страниц ---------- */

  registerWikiPage(id: string): boolean {
    if (!this.state.wikiPageIds) this.state.wikiPageIds = [];
    const sid = String(id);
    if (this.state.wikiPageIds.includes(sid)) return false;
    this.state.wikiPageIds.unshift(sid);
    return true;
  }

  unregisterWikiPage(id: string): void {
    if (!this.state.wikiPageIds) return;
    this.state.wikiPageIds = this.state.wikiPageIds.filter((x) => x !== String(id));
  }

  private numOr(v: any, def: number): number {
    const n = parseInt(String(v == null ? '' : v), 10);
    return isFinite(n) && n >= 1 ? n : def;
  }

  private migrate(s: any): BoardState {
    const d = defaultState();
    if (!s || typeof s !== 'object') return d;
    return {
      project: s.project && typeof s.project === 'object'
        ? { name: String(s.project.name || ''), description: String(s.project.description || ''), tag: String(s.project.tag || ''), startNumber: this.numOr(s.project.startNumber, 1) }
        : d.project,
      statuses: Array.isArray(s.statuses) && s.statuses.length ? s.statuses : d.statuses,
      columns: Array.isArray(s.columns) ? s.columns : d.columns,
      cards: s.cards && typeof s.cards === 'object' ? s.cards : d.cards,
      assignees: (Array.isArray(s.assignees) ? s.assignees : d.assignees).map((a: any) => ({ id: a.id, name: a.name, color: a.color, role: a.role || '' })),
      counters: s.counters && typeof s.counters === 'object' ? s.counters : {},
      wikiPageIds: Array.isArray(s.wikiPageIds) ? s.wikiPageIds.map(String) : [],
      wikiBackfilled: Boolean(s.wikiBackfilled),
    };
  }

  private baseFor(tag: string): number {
    const start = (this.state.project && this.state.project.startNumber) || 1;
    return Math.max(this.state.counters[tag] || 0, start - 1);
  }

  peekKey(tagRaw: string) {
    const tag = normalizeTag(tagRaw) || 'TASK';
    const num = this.baseFor(tag) + 1;
    return { tag, key: `${tag}-${num}`, num };
  }

  createCard(card: Card, columnId?: string, statusId?: string): void {
    const col = this.state.columns.find((c) => c.id === columnId) || this.state.columns[0];
    this.state.counters[card.tag] = this.baseFor(card.tag) + 1;
    card.status = statusId || (col && col.status) || (this.state.statuses[0] ? this.state.statuses[0].id : '');
    this.state.cards[card.id] = card;
    if (col) col.cardIds.push(card.id);
  }

  removeCard(cardId: string): Card | null {
    const card = this.state.cards[cardId];
    if (!card) return null;
    for (const c of this.state.columns) c.cardIds = c.cardIds.filter((i) => i !== cardId);
    delete this.state.cards[cardId];
    return card;
  }

  moveCard(cardId: string, toColumnId: string, index?: number): void {
    const card = this.state.cards[cardId];
    const to = this.state.columns.find((c) => c.id === toColumnId);
    if (!card || !to) return;
    for (const c of this.state.columns) c.cardIds = c.cardIds.filter((i) => i !== cardId);
    const idx = Math.max(0, Math.min(index == null ? to.cardIds.length : index, to.cardIds.length));
    to.cardIds.splice(idx, 0, cardId);
    if (to.status) card.status = to.status;
    card.updatedAt = Date.now();
  }

  patchCard(cardId: string, patch: Partial<Card>, columnId?: string): void {
    const card = this.state.cards[cardId];
    if (!card) return;
    if (patch.title !== undefined) card.title = patch.title;
    if (patch.assigneeId !== undefined) card.assigneeId = patch.assigneeId;
    if (patch.status !== undefined && patch.status) card.status = patch.status;
    if (patch.startDate !== undefined) card.startDate = patch.startDate;
    if (patch.dueDate !== undefined) card.dueDate = patch.dueDate;
    card.updatedAt = Date.now();
    if (columnId) {
      const target = this.state.columns.find((c) => c.id === columnId);
      const current = this.state.columns.find((c) => c.cardIds.includes(cardId));
      if (target && (!current || current.id !== target.id)) {
        for (const c of this.state.columns) c.cardIds = c.cardIds.filter((i) => i !== cardId);
        target.cardIds.push(cardId);
      }
    } else if (patch.status) {
      const current = this.state.columns.find((c) => c.cardIds.includes(cardId));
      if (current && current.status !== patch.status) {
        const target = this.state.columns.find((c) => c.status === patch.status);
        if (target && target.id !== current.id) {
          current.cardIds = current.cardIds.filter((i) => i !== cardId);
          target.cardIds.push(cardId);
        }
      }
    }
  }

  addColumn(col: Column): void { this.state.columns.push(col); }

  moveColumn(columnId: string, index: number): void {
    const from = this.state.columns.findIndex((c) => c.id === columnId);
    if (from < 0) return;
    const [col] = this.state.columns.splice(from, 1);
    const idx = Math.max(0, Math.min(index, this.state.columns.length));
    this.state.columns.splice(idx, 0, col);
  }

  patchColumn(columnId: string, patch: Partial<Column>): void {
    const col = this.state.columns.find((c) => c.id === columnId);
    if (!col) return;
    if (patch.title !== undefined) col.title = patch.title;
    if (patch.color !== undefined) col.color = patch.color;
    if (patch.status !== undefined && patch.status !== col.status) {
      col.status = patch.status;
      if (patch.status) for (const id of col.cardIds) { const card = this.state.cards[id]; if (card) card.status = patch.status; }
    }
  }

  removeColumn(columnId: string): Card[] {
    const idx = this.state.columns.findIndex((c) => c.id === columnId);
    if (idx < 0) return [];
    const [col] = this.state.columns.splice(idx, 1);
    const removed: Card[] = [];
    for (const id of col.cardIds) { const card = this.state.cards[id]; if (card) { removed.push(card); delete this.state.cards[id]; } }
    return removed;
  }

  addAssignee(name: string, role: string, color: string): Assignee {
    const a: Assignee = { id: uid(), name, role: role || '', color };
    this.state.assignees.push(a);
    return a;
  }

  removeAssignee(id: string): void {
    this.state.assignees = this.state.assignees.filter((a) => a.id !== id);
    for (const c of Object.values(this.state.cards)) if (c.assigneeId === id) c.assigneeId = null;
  }
}