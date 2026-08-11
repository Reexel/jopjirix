import { joplin } from './api';
import { BoardStore } from './store';
import { uid } from './util';
import { Card } from './types';
import * as notes from './notes';
import { buildDict } from './i18n';

const needId = (m: any): string => String(m && m.id ? m.id : '');

export async function handleMessage(store: BoardStore, msg: any): Promise<any> {
  try {
    switch (msg && msg.action) {
      case 'getState':
        return { ok: true, state: store.state, settings: store.publicSettings(), i18n: store.i18nPayload() };

      case 'i18n.setLocale':
        await store.setLocale(msg.locale);
        return { ok: true, i18n: store.i18nPayload() };

      case 'i18n.saveTranslations':
        await store.saveTranslations(String(msg.locale || 'en'), msg.entries || {});
        return { ok: true, i18n: store.i18nPayload() };

      case 'updateProject':
        store.setProject(msg.patch || {});
        await store.save();
        return { ok: true, state: store.state };

      case 'setWikiTag':
        await store.setWikiTag(msg.tag);
        return { ok: true, settings: store.publicSettings() };

      case 'addCard': {
        const p = msg.payload || {};
        const { key, tag } = store.peekKey(p.tag || 'TASK');
        const card: Card = {
          id: uid(), key, tag,
          title: String(p.title || 'Без названия').trim(),
          description: '',
          status: '', assigneeId: p.assigneeId || null,
          startDate: p.startDate || null, dueDate: p.dueDate || null,
          createdAt: Date.now(), updatedAt: Date.now(),
        };
        if (p.createNote) {
          try {
            const col = store.state.columns.find((c) => c.id === p.columnId) || store.state.columns[0];
            const statusId = p.statusId || (col && col.status);
            const status = store.state.statuses.find((s) => s.id === statusId);
            const assignee = store.state.assignees.find((a) => a.id === p.assigneeId);
            const dict = buildDict(store.resolvedLocale(), store.customLocales);
            const statusLabel = status ? ((dict as any)['status.' + status.id] || status.name) : '';
            card.noteId = await notes.createTaskNote(card, assignee ? assignee.name : '', statusLabel);
          } catch (e) { console.warn('Kanban: не удалось создать заметку для карточки', e); }
        }
        store.createCard(card, p.columnId, p.statusId);
        await store.save();
        return { ok: true, state: store.state };
      }

      case 'updateCard':
        store.patchCard(msg.cardId, msg.patch || {}, msg.columnId);
        await store.save();
        return { ok: true, state: store.state };

      case 'moveCard':
        store.moveCard(msg.cardId, msg.toColumnId, msg.index);
        await store.save();
        return { ok: true, state: store.state };

      case 'deleteCard': {
        const card = store.removeCard(msg.cardId);
        await store.save();
        if (card && card.noteId && msg.deleteNote) {
          try { await notes.deleteNote(card.noteId); } catch (e) { console.warn(e); }
        }
        return { ok: true, state: store.state };
      }

      case 'addColumn': {
        const c = msg.column || {};
        store.addColumn({ id: uid(), title: String(c.title || 'Колонка').trim(), color: c.color || '#DFE1E6', status: c.status || '', cardIds: [] });
        await store.save();
        return { ok: true, state: store.state };
      }

      case 'moveColumn':
        store.moveColumn(msg.columnId, msg.index);
        await store.save();
        return { ok: true, state: store.state };

      case 'updateColumn':
        store.patchColumn(msg.columnId, msg.patch || {});
        await store.save();
        return { ok: true, state: store.state };

      case 'deleteColumn':
        store.removeColumn(msg.columnId);
        await store.save();
        return { ok: true, state: store.state };

      case 'addAssignee':
        store.addAssignee(String(msg.name || '').trim() || 'Без имени', String(msg.role || '').trim(), msg.color || '#0052CC');
        await store.save();
        return { ok: true, state: store.state };

      case 'deleteAssignee':
        store.removeAssignee(msg.assigneeId);
        await store.save();
        return { ok: true, state: store.state };

      case 'openNote':
        if (msg.noteId) await joplin.commands.execute('openNote', msg.noteId);
        return { ok: true };

      /* ---------- WIKI ---------- */

      case 'wiki.list': {
        // Одноразовый фоновый скан старых страниц
        if (!store.state.wikiBackfilled) {
          store.state.wikiBackfilled = true;
          (async () => {
            try {
              await notes.backfillWikiPages(
                store.wikiTag,
                (id) => (store.state.wikiPageIds || []).includes(id),
                (id) => { store.registerWikiPage(id); }
              );
              await store.save();
            } catch (e) { console.warn('Kanban: backfill wiki failed', e); }
          })();
        }
        const pages = await notes.listWikiPages(store.wikiTag, store.state.wikiPageIds || []);
        return { ok: true, pages };
      }

      case 'wiki.get': {
        const id = needId(msg);
        if (!id) return { ok: false, error: 'wiki.get: не передан ID страницы' };
        const note = await joplin.data.get(['notes', id], { fields: ['id', 'title', 'body', 'updated_time', 'parent_id'] });
        if (note && note.id) {
          if (store.registerWikiPage(note.id)) await store.save();
          return { ok: true, page: { id: note.id, title: note.title, body: note.body, updated: note.updated_time, parentId: note.parent_id } };
        }
        return { ok: false, error: 'Страница не найдена' };
      }

      case 'wiki.create': {
        const page = await notes.createWikiPage(String(msg.title || '').trim() || 'Новая страница', store.wikiTag, msg.parentId || null);
        if (page && page.id) {
          store.registerWikiPage(page.id);
          await store.save();
        }
        return { ok: true, id: page && page.id };
      }

      case 'wiki.save': {
        const id = needId(msg);
        if (!id) return { ok: false, error: 'wiki.save: не передан ID страницы' };
        const newTitle = msg.title != null ? String(msg.title).trim() : '';
        await notes.saveWikiPage(id, String(msg.body == null ? '' : msg.body), newTitle || undefined);
        await notes.ensureWikiLink(id, store.wikiTag);
        return { ok: true };
      }

      case 'wiki.delete': {
        const id = needId(msg);
        if (!id) return { ok: false, error: 'wiki.delete: не передан ID страницы' };
        store.unregisterWikiPage(id);
        await store.save();
        await notes.deleteNote(id);
        return { ok: true };
      }

      case 'wiki.open': {
        const id = needId(msg);
        if (!id) return { ok: false, error: 'wiki.open: не передан ID страницы' };
        await joplin.commands.execute('openNote', id);
        return { ok: true };
      }

      case 'wiki.tags': {
        const id = needId(msg);
        if (!id) return { ok: false, error: 'wiki.tags: не передан ID страницы' };
        return { ok: true, tags: await notes.getNoteTags(id) };
      }

      case 'wiki.tags.add': {
        const id = needId(msg);
        if (!id) return { ok: false, error: 'wiki.tags.add: не передан ID страницы (страница не выбрана)' };
        const tags = await notes.addTagToNote(id, String(msg.tag || ''));
        return { ok: true, tags };
      }

      case 'wiki.tags.remove': {
        const id = needId(msg);
        if (!id) return { ok: false, error: 'wiki.tags.remove: не передан ID страницы' };
        if (!msg.tagId) return { ok: false, error: 'wiki.tags.remove: не передан ID тэга' };
        const tags = await notes.removeTagFromNote(id, msg.tagId);
        return { ok: true, tags };
      }

      default:
        return { ok: false, error: 'Неизвестное действие: ' + (msg && msg.action) };
    }
  } catch (e: any) {
    console.error('🔴 Kanban: ошибка обработки сообщения', e);
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}