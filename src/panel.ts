import { joplin } from './api';
import { BoardStore } from './store';
import { handleMessage } from './messages';
import { PANEL_HTML } from './ui';

export async function createPanel(store: BoardStore): Promise<any> {
  console.log('🟢 JopJirix panel: создаю панель...');
  const panel = await joplin.views.panels.create('jiraBoardPanel');

  // setTitle НЕ существует в API Joplin — не используем!
  await joplin.views.panels.setHtml(panel, PANEL_HTML);
  await joplin.views.panels.addScript(panel, 'webview.js');
  await joplin.views.panels.onMessage(panel, async (msg: any) => {
    return handleMessage(store, msg);
  });

  console.log('🟢 JopJirix panel: панель готова');
  return panel;
}