export interface Status { id: string; name: string; color: string; }
export interface Assignee { id: string; name: string; role: string; color: string; }
export interface Card {
  id: string; key: string; tag: string; title: string; description: string;
  status: string; assigneeId: string | null; noteId?: string;
  startDate?: string | null; dueDate?: string | null;
  createdAt: number; updatedAt: number;
}
export interface Column { id: string; title: string; color: string; status: string; cardIds: string[]; }
export interface Project { name: string; description: string; tag: string; startNumber: number; }
export interface BoardState {
  project: Project;
  statuses: Status[];
  columns: Column[];
  cards: Record<string, Card>;
  assignees: Assignee[];
  counters: Record<string, number>;
  wikiPageIds: string[];
  wikiBackfilled: boolean;
}