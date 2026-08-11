// Единая точка доступа к Joplin API + локальные Enum
// Не используем joplin.require('api / types'), т.к. в Snap/AppImage он может вернуть undefined

// @ts-ignore
export const joplin: any =
  typeof global !== 'undefined' && (global as any).joplin
    ? (global as any).joplin
    : require('api');

export const MenuItemLocation = {
  File: 'file',
  Edit: 'edit',
  View: 'view',
  Note: 'note',
  Tools: 'tools',
  Help: 'help',
  Context: 'context',
  EditorContextMenu: 'editorContextMenu',
  NoteContextMenu: 'noteContextMenu',
};

export const ToolbarButtonLocation = {
  NoteToolbar: 'noteToolbar',
  EditorToolbar: 'editorToolbar',
};

export const SettingItemType = {
  Int: 1,
  String: 2,
  Bool: 3,
  Array: 4,
  Object: 5,
  Button: 6,
};

export const SettingStorage = {
  Sync: 1,
  Local: 2,
};