import { joplin, MenuItemLocation, ToolbarButtonLocation } from './api';
import { BoardStore } from './store';
import { createPanel } from './panel';
import { BUILTIN, buildDict } from './i18n';

joplin.plugins.register({
  onStart: async function () {
    const steps: string[] = [];
    try {
      steps.push('старт');
      const store = new BoardStore();
      await store.init();
      steps.push('store');

      const dict = buildDict(store.resolvedLocale(), store.customLocales);
      const t = (k: string) => dict[k] || (BUILTIN.en as any)[k] || k;

      const panel = await createPanel(store);
      steps.push('панель');

      await joplin.commands.register({
        name: 'jopjirix.open',
        label: t('menu.open'),
        iconName: 'fas fa-columns',
        execute: async () => { await joplin.views.panels.show(panel); },
      });
      steps.push('команда');

      await joplin.views.menus.create(
        'jopjirix.menu',
        t('menu.title'),
        [{ commandName: 'jopjirix.open', accelerator: 'CmdOrCtrl+Shift+J' }],
        MenuItemLocation.Tools
      );
      steps.push('меню');

      await joplin.views.toolbarButtons.create('jopjirix.openButton', 'jopjirix.open', ToolbarButtonLocation.NoteToolbar);
      steps.push('кнопка');

      await joplin.views.panels.show(panel);
      steps.push('показ');
      console.log('🟢 JopJirix: всё ОК, шаги: ' + steps.join(' -> '));
    } catch (e: any) {
      const info = '🔴 JopJirix упал после шагов: [' + steps.join(' -> ') + ']\n\n' + ((e && (e.stack || e.message)) || String(e));
      console.error(info);
      try { await joplin.views.dialogs.showMessageBox(info); } catch (_) { /* ignore */ }
    }
  },
});