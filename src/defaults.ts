import { BoardState } from './types';

export function defaultState(): BoardState {
  const now = Date.now();
  return {
    project: { name: 'Мой проект', description: '', tag: '', startNumber: 1 },
    statuses: [
      { id: 'todo', name: 'К выполнению', color: '#6B778C' },
      { id: 'progress', name: 'В работе', color: '#0052CC' },
      { id: 'review', name: 'На проверке', color: '#6554C0' },
      { id: 'done', name: 'Готово', color: '#36B37E' },
    ],
    columns: [
      { id: 'col-todo', title: 'К выполнению', color: '#DEEBFF', status: 'todo', cardIds: ['demo-1'] },
      { id: 'col-progress', title: 'В работе', color: '#B3D4FF', status: 'progress', cardIds: [] },
      { id: 'col-review', title: 'На проверке', color: '#EAE6FF', status: 'review', cardIds: [] },
      { id: 'col-done', title: 'Готово', color: '#ABF5D1', status: 'done', cardIds: [] },
    ],
    cards: {
      'demo-1': {
        id: 'demo-1', key: 'DEMO-1', tag: 'DEMO',
        title: 'Пример карточки — перетащите меня',
        description: '', status: 'todo', assigneeId: 'a1',
        startDate: null, dueDate: null, createdAt: now, updatedAt: now,
      },
    },
    assignees: [
      { id: 'a1', name: 'Алексей Иванов', role: 'Разработчик', color: '#0052CC' },
      { id: 'a2', name: 'Мария Петрова', role: 'Аналитик', color: '#36B37E' },
    ],
    counters: { DEMO: 1 },
    wikiPageIds: [],
    wikiBackfilled: false,
  };
}