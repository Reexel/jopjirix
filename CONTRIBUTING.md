# Contributing to JopJirix

Thank you for considering contributing to JopJirix!

## How to Contribute

1. Fork the repository
2. Create a feature branch (e.g. `feature/my-cool-feature`)
3. Make your changes
4. Build and test: `npm install && npm run dist`
5. Commit: `git commit -m 'Add my cool feature'`
6. Push: `git push origin feature/my-cool-feature`
7. Open a Pull Request

## Translation

Translations are incomplete. You can add and fix translations in the Settings tab of the plugin, or directly in `src/i18n.ts`.

Translation files are stored in `jopjirix-locales.json` in the plugin's data directory.

## Reporting Bugs

Please open an issue with:
- Joplin version
- Operating system
- Steps to reproduce
- Expected vs actual behavior

## Code Style

- TypeScript for backend code (`src/*.ts`)
- Vanilla JavaScript for webview (`src/webview.js`)
- Follow existing code patterns
