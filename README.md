# JopJirix — Kanban Board & Wiki for Joplin

> JopJirix is an independent project. It is **not** affiliated with Jira® or Atlassian.

**[EN](#english) | [RU](#russian)**

---

<a id="english"></a>

## English

JopJirix turns Joplin into a full‑fledged project tracker: agile‑style kanban cards plus a built‑in Wiki for project documentation. All data lives in native Joplin entities (notes, tags, plugin settings), so sync and backups keep working.

### ✨ Features

#### Board
- Cards with **auto‑generated keys per project tag**: `2COF-1`, `2COF-2`… (tag and start number are configurable; the field stays editable).
- Statuses, **assignees with roles** and colors, initials avatars.
- Dates: created / start / due; **overdue is highlighted**.
- Drag & drop of cards between and inside card holders.
- **Card holders (columns)**: custom name, color and status; drag columns by the `⠿` handle; a “do not change card status” mode.
- Optional creation of a Joplin note for a card, with the task tag attached.

#### Wiki
- Pages are Joplin notes with a configurable tag.
- **Subpage hierarchy** (parent → children), shown as a tree in the list.
- Built‑in markdown editor with “💾 Save” and “👁 Preview”.
- Page tags: add/remove; the tag from settings is always present.
- **Robust writing** with fact‑checking and fallback payloads — works on any Joplin build (including Snap/AppImage).
- A page registry in plugin state: created pages **never disappear** from the list; older pages are recovered by a one‑time background scan.

#### Localization
- 9 languages: EN, RU, DE, ES, PT, FR, SR, ZH, JA + **auto‑detection** of the Joplin language.
- The “Interface language” setting takes priority, applies immediately and **does not affect Joplin itself**.
- Built‑in **translation editor**: an “English text | key | translation” table.
- Sharing translations via the `jopjirix-locales.json` file.
- **The translation is incomplete. You can add and fix translations yourself.**

### 📦 Requirements
- Joplin Desktop ≥ 2.6 (Linux / Windows / macOS, including Snap).
- To build from source: Node.js ≥ 16 and npm.

### 🚀 Installing a ready `.jpl`
1. Settings → Plugins → ⚙ → “Install from file…” → pick `plugin.joplin.jopjirix-v*.jpl`.
2. Restart Joplin.
3. The board opens in the side panel. Also available via **Tools → JopJirix Board** and the **Ctrl/Cmd+Shift+J** hotkey.

### 🛠 Building from source
```bash
npm install
npm run dist
```
- Compiled plugin → `dist/`; the `.jpl` archive → project root.
- Dev mode: copy the contents of `dist/` to
  `~/.config/joplin-desktop/plugins-dev/plugin.joplin.jopjirix/` and restart Joplin.

### ⚙️ Settings (the “Settings” tab)
- **Project**: name, tag/key, card start number, description.
- **Tag for Wiki pages**.
- **Members**: name, role, color.
- **Interface language** (applies immediately).
- **Translations**: pick a language → fill the table → “Save translations”.

### 📋 Usage

#### Cards
- “＋ Card”: tag (pre‑filled from project settings), title, holder, status, dates, assignee; a preview of the future key.
- On a card: click — edit; ✎ — editor; 🗑 — delete (optionally with the linked note); 📝 — open the linked note.

#### Card holders
- “＋ Add card holder”; ⚙ — name/color/status; ⠿ — drag; “Delete” — with confirmation.

#### Wiki
- “＋ New page”, “＋ Subpage”; “💾 Save”; “👁 Preview”; “✏ In Joplin”; the tags block at the bottom of the page.

### 🌐 Sharing translations
Translations are saved to:
```
<profile>/plugins-data/plugin.joplin.jopjirix/jopjirix-locales.json
```
Send the file to a colleague — they place it into the same folder of their Joplin and restart the app.

### 🗂 Project structure
```
src/
  index.ts     — plugin start, menu, commands, toolbar button
  api.ts       — Joplin API access + local enums
  store.ts     — board state, settings, Wiki registry, i18n storage
  i18n.ts      — language dictionaries (EN/RU + stubs)
  messages.ts  — panel ↔ plugin messaging
  notes.ts     — robust note/tag operations
  ui.ts        — panel HTML/CSS
  webview.js   — panel UI logic
  panel.ts, types.ts, defaults.ts, util.ts
tools/build-jpl.js — .jpl packaging (tar)
```

### ⚠️ Known limitations
- Joplin menu and command labels are translated after an app restart.
- On some Joplin builds (Snap) parts of the data API behave non‑standardly — the plugin automatically uses fallback payloads, fact‑checking and self‑healing of links.

### 📄 License
MIT

---

<a id="russian"></a>

## Русский

JopJirix превращает Joplin в полноценный трекер задач: канбан‑карточки в стиле классических agile‑досок и встроенный Wiki для документации проекта. Все данные хранятся в родных сущностях Joplin (заметки, тэги, настройки плагина) — работают синхронизация и резервные копии.

### ✨ Возможности

#### Доска
- Карточки с **авто‑ключами по тэгу проекта**: `2COF-1`, `2COF-2`… (тэг и стартовый номер задаются в настройках, поле редактируемо).
- Статусы, **исполнители с ролями** и цветами, аватары‑инициалы.
- Даты: создание / старт / дедлайн; **просрочка подсвечивается**.
- Drag&drop карточек между картхолдерами и внутри них.
- **Картхолдеры (колонки)**: свои название, цвет и статус; перетаскивание колонок за ручку `⠿`; режим «не менять статус карточек».
- Опциональное создание заметки Joplin для карточки с привязкой тэга задачи.

#### Wiki
- Страницы = заметки Joplin с настраиваемым тэгом.
- **Иерархия подстраниц** (родитель → дочерние), дерево в списке.
- Встроенный markdown‑редактор с кнопками «💾 Сохранить» и «👁 Предпросмотр».
- Тэги страницы: добавление/удаление; тэг из настроек присутствует всегда.
- **Робастная запись** с проверкой факта и fallback‑форматами — работает на любых сборках Joplin (включая Snap/AppImage).
- Реестр страниц в состоянии плагина: созданные страницы **никогда не пропадают** из списка; старые страницы находятся фоновым сканом.

#### Локализация
- 9 языков: EN, RU, DE, ES, PT, FR, SR, ZH, JA + **автоопределение** языка Joplin.
- Настройка «Язык интерфейса» приоритетна, применяется сразу и **не влияет на сам Joplin**.
- Встроенный **редактор переводов**: таблица «английский текст | ключ | перевод».
- Обмен переводами файлом `jopjirix-locales.json`.
- **Перевод неполный. Вы можете добавлять и исправлять переводы самостоятельно.**

### 📦 Требования
- Joplin Desktop ≥ 2.6 (Linux / Windows / macOS, включая Snap).
- Для сборки из исходников: Node.js ≥ 16 и npm.

### 🚀 Установка готового `.jpl`
1. Настройки → Плагины → ⚙ → «Установить из файла…» → выберите `plugin.joplin.jopjirix-v*.jpl`.
2. Перезапустите Joplin.
3. Доска откроется в боковой панели. Также: меню **Сервис → JopJirix-доска** и хоткей **Ctrl/Cmd+Shift+J**.

### 🛠 Сборка из исходников
```bash
npm install
npm run dist
```
- Скомпилированный плагин — в `dist/`, архив `.jpl` — в корне проекта.
- Dev‑режим: скопируйте содержимое `dist/` в
  `~/.config/joplin-desktop/plugins-dev/plugin.joplin.jopjirix/` и перезапустите Joplin.

### ⚙️ Настройки (вкладка «Настройки»)
- **Проект**: название, тэг/ключ, стартовый номер карточки, описание.
- **Тэг для Wiki‑страниц**.
- **Участники**: имя, роль, цвет.
- **Язык интерфейса** (применяется сразу).
- **Переводы**: выберите язык → заполните таблицу → «Сохранить переводы».

### 📋 Использование

#### Карточки
- «＋ Карточка»: тэг (подставляется из настроек проекта), заголовок, картхолдер, статус, даты, исполнитель; превью будущего ключа.
- На карточке: клик — редактирование; ✎ — редактор; 🗑 — удаление (с опцией удаления заметки); 📝 — открыть связанную заметку.

#### Картхолдеры
- «＋ Добавить картхолдер»; ⚙ — название/цвет/статус; ⠿ — перетащить; «Удалить» — с подтверждением.

#### Wiki
- «＋ Новая страница», «＋ Подстраница»; «💾 Сохранить»; «👁 Предпросмотр»; «✏ В Joplin»; блок тэгов внизу страницы.

### 🌐 Обмен переводами
Переводы сохраняются в файл:
```
<профиль>/plugins-data/plugin.joplin.jopjirix/jopjirix-locales.json
```
Передайте файл коллеге — он кладёт его в такую же папку своего Joplin и перезапускает приложение.

### 🗂 Структура проекта
```
src/
  index.ts     — запуск плагина, меню, команды, кнопка
  api.ts       — доступ к Joplin API + локальные enum
  store.ts     — состояние доски, настройки, реестр Wiki, i18n‑хранилище
  i18n.ts      — словари языков (EN/RU + заготовки)
  messages.ts  — обмен сообщениями панель ↔ плагин
  notes.ts     — робастные операции с заметками и тэгами
  ui.ts        — HTML/CSS панели
  webview.js   — логика интерфейса панели
  panel.ts, types.ts, defaults.ts, util.ts
tools/build-jpl.js — упаковка .jpl (tar)
```

### ⚠️ Известные ограничения
- Меню и команды Joplin переводятся после перезапуска приложения.
- На отдельных сборках Joplin (Snap) часть data API ведёт себя нестандартно — плагин автоматически использует fallback‑форматы, проверку факта и самовосстановление связей.

### 📄 Лицензия
MIT