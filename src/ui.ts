export const PANEL_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<style>
:root{--accent:#0C66E4;--accent-hover:#0055CC;--bg:#F7F8F9;--col-bg:#F1F2F4;--card-bg:#FFF;--border:#DCDFE4;--text:#172B4D;--sub:#626F86}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:var(--text);background:var(--bg)}
.hidden{display:none!important}.spacer{flex:1}
.app{display:flex;flex-direction:column;height:100vh}
.topbar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#fff;border-bottom:1px solid var(--border);flex-wrap:wrap}
.topbar h1{font-size:15px;margin:0 8px 0 0;white-space:nowrap}
.tabs{display:flex;gap:4px;background:#F1F2F4;border-radius:8px;padding:3px}
.tab-btn{padding:5px 14px;border:none;background:transparent;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;color:var(--sub)}
.tab-btn.active{background:#fff;color:var(--accent);box-shadow:0 1px 2px rgba(9,30,66,.15)}
.btn{border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-weight:600;font-size:12px;background:#EBECF0;color:var(--text);font-family:inherit}
.btn:hover{background:#DCDFE4}.btn.primary{background:var(--accent);color:#fff}.btn.primary:hover{background:var(--accent-hover)}
.btn.danger{background:#DE350B;color:#fff}.btn.danger:hover{background:#C22E0A}
.icon-btn{border:none;background:transparent;cursor:pointer;color:var(--sub);border-radius:4px;min-width:22px;height:22px;line-height:1;font-size:12px;padding:0 3px}
.icon-btn:hover{background:rgba(9,30,66,.08);color:var(--text)}
.board{flex:1;overflow:auto;padding:14px}
.columns{display:flex;gap:12px;align-items:flex-start;min-height:100%}
.column{width:280px;min-width:280px;background:var(--col-bg);border-radius:10px;display:flex;flex-direction:column;max-height:100%}
.column.dragging-col{opacity:.5}
.col-head{display:flex;align-items:center;gap:5px;padding:10px 8px 4px 10px}
.col-drag{cursor:grab;font-size:14px}
.col-dot{width:10px;height:10px;border-radius:50%;flex:none;border:1px solid rgba(9,30,66,.15)}
.col-title{flex:1;min-width:0;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.4px;color:var(--sub);background:transparent;border:1px solid transparent;border-radius:4px;padding:3px 5px;font-family:inherit}
.col-title:focus{outline:none;border-color:var(--accent);background:#fff;color:var(--text)}
.col-count{background:rgba(9,30,66,.08);border-radius:8px;padding:1px 7px;font-size:11px;font-weight:700;color:var(--sub)}
.col-settings{padding:8px 10px;border-top:1px dashed var(--border);background:rgba(255,255,255,.6)}
.col-settings .field{margin-bottom:8px}.cs-actions{display:flex;gap:6px;justify-content:flex-end}
.col-placeholder{width:280px;min-width:280px;border:2px dashed var(--accent);border-radius:10px;background:#E9F2FF;flex:none;align-self:stretch}
.cards{flex:1;overflow-y:auto;padding:4px 8px;display:flex;flex-direction:column;gap:8px;min-height:24px}
.card{background:var(--card-bg);border-radius:8px;padding:10px;box-shadow:0 1px 2px rgba(9,30,66,.2);cursor:grab;border:2px solid transparent;transition:border-color .1s}
.card:hover{border-color:var(--accent)}.card.dragging{opacity:.55;transform:rotate(2deg);cursor:grabbing}
.card-top{display:flex;align-items:center;gap:6px}
.card-key{font-size:11px;font-weight:700;color:var(--sub);white-space:nowrap}
.status-chip{display:inline-block;padding:2px 8px;border-radius:9px;color:#fff;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}
.card-title{margin:7px 0 6px;font-size:13px;font-weight:600;line-height:1.35;word-break:break-word}
.card-dates{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:7px}
.date-chip{font-size:10px;color:var(--sub);background:rgba(9,30,66,.06);padding:2px 6px;border-radius:8px;white-space:nowrap}
.date-chip.overdue{background:#FFEBE6;color:#AE2A19;font-weight:700}
.card-foot{display:flex;align-items:center;gap:6px}
.avatar{width:22px;height:22px;border-radius:50%;color:#fff;font-size:9px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex:none}
.avatar-none{background:#C1C7D0}
.tag-badge{font-size:11px;color:var(--sub);background:rgba(9,30,66,.06);padding:2px 7px;border-radius:9px;font-weight:600}
.add-card-btn{margin:4px 8px 10px;border:none;background:rgba(9,30,66,.05);border-radius:6px;padding:7px 10px;cursor:pointer;color:var(--sub);text-align:left;font-size:12px;font-weight:600;font-family:inherit}
.add-card-btn:hover{background:rgba(9,30,66,.1);color:var(--text)}
.add-column{width:280px;min-width:280px;background:rgba(9,30,66,.06);border:none;border-radius:10px;padding:12px;color:var(--sub);cursor:pointer;font-weight:600;font-size:13px;text-align:left;font-family:inherit;height:fit-content}
.add-column:hover{background:rgba(9,30,66,.1);color:var(--text)}
.drop-placeholder{border:2px dashed var(--accent);border-radius:8px;min-height:44px;background:#E9F2FF;flex:none}
.modal-overlay{position:fixed;inset:0;background:rgba(9,30,66,.55);display:flex;align-items:flex-start;justify-content:center;padding:8vh 12px 12px;z-index:50}
.modal{background:#fff;border-radius:10px;width:500px;max-width:100%;max-height:84vh;overflow:auto;box-shadow:0 12px 44px rgba(9,30,66,.4)}
.modal-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border)}
.modal-head h3{margin:0;font-size:15px}.modal-body{padding:16px}
.field{margin-bottom:12px}
.field label{display:block;font-weight:600;font-size:11px;margin-bottom:4px;color:var(--sub);text-transform:uppercase;letter-spacing:.3px}
.field input[type=text],.field textarea,.field select,.field input[type=date],.field input[type=number],.field input[type=color]{width:100%;padding:7px 9px;border:1.5px solid var(--border);border-radius:6px;font:inherit;background:#FAFBFC}
.field input:focus,.field textarea:focus,.field select:focus{outline:none;border-color:var(--accent);background:#fff}
.field input:disabled,.field textarea:disabled{background:#EBECF0;color:var(--sub)}
.field textarea{min-height:72px;resize:vertical}
.field-row{display:flex;gap:10px}.field-row .field{flex:1}
.check{display:flex;gap:6px;align-items:center;font-size:12px;color:var(--sub);margin:2px 0 6px}
.hint{font-size:11px;color:var(--sub);margin-top:4px}
.key-preview{background:#E9F2FF;border-radius:6px;padding:7px 10px;font-size:12px;margin-top:6px;font-weight:700}
.comment-item{border-left:3px solid var(--accent);background:#F7F8F9;border-radius:0 6px 6px 0;padding:6px 8px;margin-bottom:6px}
.comment-head{display:flex;gap:8px;align-items:baseline}
.comment-text{margin-top:2px;white-space:pre-wrap}
.modal-actions{display:flex;gap:8px;margin-top:16px;align-items:center}
.assignee-row{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)}
.settings{flex:1;overflow:auto;padding:16px 20px;background:#fff}
.settings-wrap{max-width:760px}
.settings h3{margin:20px 0 10px;font-size:14px}.settings h3:first-child{margin-top:0}
.tr-table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
.tr-table th,.tr-table td{border:1px solid var(--border);padding:4px 6px;text-align:left;vertical-align:top}
.tr-table th{background:#F7F8F9}
.tr-table td input{width:100%;border:none;background:transparent;font:inherit;padding:2px}
.tr-table td input:focus{outline:1px solid var(--accent)}
.tr-table td.k{font-family:Menlo,Consolas,monospace;color:var(--sub);white-space:nowrap}
.tr-scroll{max-height:340px;overflow:auto;border:1px solid var(--border);border-radius:6px}
.wiki-layout{flex:1;display:flex;min-height:0}
.wiki-sidebar{width:270px;min-width:230px;border-right:1px solid var(--border);background:#fff;display:flex;flex-direction:column;padding:10px;gap:8px}
.wiki-sidebar input[type=text]{padding:7px 9px;border:1.5px solid var(--border);border-radius:6px;font:inherit}
.wiki-list{list-style:none;margin:0;padding:0;overflow:auto;flex:1}
.wiki-item{padding:8px;border-radius:6px;cursor:pointer;margin-bottom:2px}
.wiki-item:hover{background:#F1F2F4}.wiki-item.active{background:#E9F2FF}
.wiki-item .t{font-weight:600;word-break:break-word}
.wiki-item .d{font-size:11px;color:var(--sub);margin-top:2px}
.wiki-main{flex:1;overflow:auto;padding:18px 26px;background:#fff}
.wiki-toolbar{display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:14px;flex-wrap:wrap}
.wiki-updated{font-size:11px;color:var(--sub)}
.doc-title{font-size:22px;font-weight:700;margin:0 0 12px;line-height:1.3}
.doc-title-input{font-size:20px;font-weight:700;margin:0 0 12px;line-height:1.3;width:100%;padding:6px 9px;border:1.5px solid var(--border);border-radius:6px;font-family:inherit;background:#FAFBFC;color:var(--text)}
.doc-title-input:focus{outline:none;border-color:var(--accent);background:#fff}
.empty-wiki{color:var(--sub);padding:40px;text-align:center}
.wiki-edit textarea{width:100%;min-height:320px;font-family:Menlo,Consolas,monospace;font-size:12px;padding:10px;border:1.5px solid var(--border);border-radius:6px;line-height:1.5}
.wiki-tags{margin-top:24px;border-top:1px solid var(--border);padding-top:12px}
.wiki-tags h4{margin:0 0 8px;font-size:12px;color:var(--sub);text-transform:uppercase;letter-spacing:.3px}
.wiki-tags-list{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.tag-chip{display:inline-flex;align-items:center;gap:5px;background:#E9F2FF;color:var(--accent);border-radius:9px;padding:3px 9px;font-size:11px;font-weight:600}
.chip-x{border:none;background:transparent;color:var(--accent);cursor:pointer;font-size:10px;padding:0 2px}
.chip-x:hover{color:#DE350B}
.md{line-height:1.6;font-size:13.5px}
.md h1,.md h2,.md h3,.md h4{margin:18px 0 8px;line-height:1.3}
.md h1{font-size:22px}.md h2{font-size:19px}.md h3{font-size:16px}.md h4{font-size:14px}
.md p{margin:8px 0}
.md pre{background:#F7F8F9;border:1px solid var(--border);padding:10px 12px;border-radius:6px;overflow:auto}
.md code{background:#F1F2F4;padding:1px 5px;border-radius:4px;font-size:12px;font-family:Menlo,Consolas,monospace}
.md pre code{background:none;padding:0}
.md blockquote{border-left:3px solid var(--accent);margin:10px 0;padding:6px 12px;color:var(--sub);background:#F7F8F9;border-radius:0 6px 6px 0}
.md ul,.md ol{padding-left:22px;margin:8px 0}.md li{margin:3px 0}.md li.task{list-style:none;margin-left:-18px}
.md hr{border:none;border-top:1px solid var(--border);margin:14px 0}
.md img{max-width:100%;border-radius:6px}.md a{color:var(--accent)}
.toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#172B4D;color:#fff;padding:9px 16px;border-radius:6px;font-size:12px;z-index:99;box-shadow:0 4px 14px rgba(9,30,66,.4);max-width:80vw}
.toast.error{background:#DE350B}
</style>
</head>
<body>
<div class="app">
  <header class="topbar">
    <h1 id="board-title">📋 JopJirix</h1>
    <div class="tabs">
      <button class="tab-btn active" data-tab="board" data-i18n="tab.board">Board</button>
      <button class="tab-btn" data-tab="wiki" data-i18n="tab.wiki">Wiki</button>
      <button class="tab-btn" data-tab="settings" data-i18n="tab.settings">Settings</button>
    </div>
    <div class="spacer"></div>
    <button class="btn primary" id="btn-add-card" data-i18n="btn.addCard">＋ Card</button>
  </header>

  <section id="tab-board" class="board"><div class="columns" id="columns"></div></section>

  <section id="tab-wiki" class="wiki-layout hidden">
    <aside class="wiki-sidebar">
      <input type="text" id="wiki-search" data-i18n-ph="wiki.searchPh" placeholder="Search pages…">
      <button class="btn primary" id="wiki-new" data-i18n="wiki.new">＋ New page</button>
      <ul class="wiki-list" id="wiki-list"></ul>
      <div class="hint" id="wiki-hint"></div>
    </aside>
    <main class="wiki-main" id="wiki-main"></main>
  </section>

  <section id="tab-settings" class="settings hidden">
    <div class="settings-wrap">
      <h3 data-i18n="set.project">Project</h3>
      <div class="field"><label data-i18n="set.projName">Project name</label><input type="text" id="s-proj-name" autocomplete="off"></div>
      <div class="field-row">
        <div class="field"><label data-i18n="set.projTag">Tag / project key</label><input type="text" id="s-proj-tag" placeholder="2COF" autocomplete="off"><div class="hint" data-i18n="set.projTagHint"></div></div>
        <div class="field"><label data-i18n="set.startNum">Card start number</label><input type="number" id="s-start-num" min="1" step="1" value="1"><div class="hint" data-i18n="set.startNumHint"></div></div>
      </div>
      <div class="field"><label data-i18n="set.projDesc">Project description</label><textarea id="s-proj-desc" data-i18n-ph="set.projDescPh"></textarea></div>
      <div class="field"><label data-i18n="set.wikiTag">Tag for Wiki pages</label><input type="text" id="s-wiki-tag" autocomplete="off"><div class="hint" data-i18n="set.wikiTagHint"></div></div>
      <button class="btn primary" id="s-save" data-i18n="set.save">Save settings</button>

      <h3 data-i18n="set.members">Project members</h3>
      <div id="s-assignees"></div>
      <div class="field-row" style="margin-top:10px">
        <div class="field"><label data-i18n="set.mName">Name</label><input type="text" id="s-as-name" data-i18n-ph="set.mNamePh" autocomplete="off"></div>
        <div class="field"><label data-i18n="set.mRole">Role</label><input type="text" id="s-as-role" data-i18n-ph="set.mRolePh" autocomplete="off"></div>
        <div class="field"><label data-i18n="set.mColor">Color</label><input type="color" id="s-as-color" value="#0052CC"></div>
      </div>
      <button class="btn primary" id="s-as-add" data-i18n="set.mAdd">＋ Add member</button>

      <h3 data-i18n="set.lang">Interface language</h3>
      <div class="field"><select id="s-locale"></select><div class="hint" data-i18n="set.langHint">Joplin menu and commands update after restart.</div></div>

      <div id="s-trans" class="hidden" style="margin-top:12px">
        <h3 id="s-tr-title"></h3>
        <div class="hint" data-i18n="set.trHint">Empty fields fall back to English.</div>
        <div class="tr-scroll">
          <table class="tr-table">
            <thead><tr><th data-i18n="set.trEn">English text</th><th data-i18n="set.trKey">Key</th><th data-i18n="set.trValue">Translation</th></tr></thead>
            <tbody id="s-tr-body"></tbody>
          </table>
        </div>
        <div class="modal-actions"><span class="spacer"></span><button class="btn primary" id="s-tr-save" data-i18n="set.trSave">Save translations</button></div>
      </div>
    </div>
  </section>
</div>

<div class="modal-overlay hidden" id="modal-overlay">
  <div class="modal">
    <div class="modal-head"><h3 id="modal-title"></h3><button class="icon-btn" id="modal-close">✕</button></div>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>
<div id="toast" class="toast hidden"></div>
</body>
</html>`;