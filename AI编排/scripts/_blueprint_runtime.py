"""迁移蓝图 HTML 运行时模板（渲染器的静态资源；纯字符串常量）。

HTML_TEMPLATE 中的占位符由 render_blueprint.py 替换：
__TITLE__ / __SUBTITLE__ / __BODY__ / __SPEC_JSON__。
JS 只做增强（主题切换、点击联动、复制）；全部信息已在静态 HTML 里，禁用 JS 也可读。
"""

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>__CSS__</style>
</head>
<body>
<header class="topbar">
  <div class="topbar-inner">
    <div>
      <h1>__TITLE__</h1>
      <p class="subtitle">__SUBTITLE__</p>
    </div>
    <div class="actions">
      <button id="btn-print" type="button">打印 / 存 PDF</button>
      <button id="btn-theme" type="button">深色模式</button>
    </div>
  </div>
</header>
<main>
__BODY__
</main>
<footer class="foot">
  <p>本文件由 AI-workflow-service 迁移蓝图 skill 生成（scripts/render_blueprint.py），自包含、离线可用；契约为 <code>__CONTRACT__</code>。行内平台实际行为与本文冲突时以行内为准。</p>
</footer>
<script>__JS__</script>
</body>
</html>
"""

CSS = """
:root{
  --bg:#f6f7f9; --panel:#ffffff; --ink:#1c2330; --muted:#5b6675; --line:#d8dde5;
  --accent:#2456c4; --accent-soft:#e8eefb; --warn-bg:#fdf3e3; --warn-line:#e2a93b;
  --code-bg:#f0f2f5; --shadow:0 1px 3px rgba(16,24,40,.08);
  --n-start:#2e8b57; --n-prompt:#7c4dbe; --n-api:#2456c4; --n-script:#0e8f9e;
  --n-condition:#d97a1a; --n-end:#5b6675; --n-other:#5b6675; --back:#c23a3a;
}
html[data-theme=dark]{
  --bg:#14181f; --panel:#1d232c; --ink:#e7ecf3; --muted:#9aa5b4; --line:#333d4b;
  --accent:#7fa7f0; --accent-soft:#22304a; --warn-bg:#3a2f18; --warn-line:#b98a2e;
  --code-bg:#262e39; --shadow:0 1px 3px rgba(0,0,0,.4);
  --n-start:#4caf7d; --n-prompt:#a988e0; --n-api:#7fa7f0; --n-script:#4fb8c6;
  --n-condition:#e09a4a; --n-end:#9aa5b4; --n-other:#9aa5b4; --back:#e07b7b;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:15px/1.65 "PingFang SC","Microsoft YaHei","Segoe UI",system-ui,sans-serif}
code,pre,.mono{font-family:"SF Mono",ui-monospace,Menlo,Consolas,monospace}
.topbar{background:var(--panel);border-bottom:1px solid var(--line);padding:18px 0}
.topbar-inner{max-width:1180px;margin:0 auto;padding:0 24px;display:flex;
  justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
h1{font-size:22px;margin:0 0 4px}
.subtitle{margin:0;color:var(--muted);font-size:13.5px;max-width:760px}
.actions{display:flex;gap:8px}
button{background:var(--panel);border:1px solid var(--line);color:var(--ink);
  border-radius:8px;padding:7px 14px;font-size:13px;cursor:pointer}
button:hover{border-color:var(--accent);color:var(--accent)}
main{max-width:1180px;margin:0 auto;padding:20px 24px 48px}
section{margin:26px 0}
h2{font-size:17px;margin:0 0 12px;display:flex;align-items:center;gap:8px}
h2 .hint{font-weight:normal;font-size:12.5px;color:var(--muted)}
.canvas-wrap{background:var(--panel);border:1px solid var(--line);border-radius:12px;
  box-shadow:var(--shadow);overflow:auto;padding:8px}
.canvas-wrap svg{display:block;min-width:100%}
.legend{display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;
  color:var(--muted);font-size:12.5px}
.legend span{display:inline-flex;align-items:center;gap:6px}
.legend i{width:22px;height:0;border-top:2px solid var(--muted);display:inline-block}
.legend i.dash{border-top-style:dashed;border-top-color:var(--back)}
.note-card{background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--accent);
  border-radius:10px;padding:14px 18px;margin:10px 0;box-shadow:var(--shadow)}
.note-card.warning{border-left-color:var(--warn-line);background:var(--warn-bg)}
.note-card h3{margin:0 0 6px;font-size:14.5px}
.note-card.warning h3::after{content:"迁移必读";margin-left:8px;font-size:11px;color:var(--warn-line);
  border:1px solid var(--warn-line);border-radius:4px;padding:1px 6px;vertical-align:1px}
.note-card p{margin:6px 0;white-space:pre-wrap}
.note-card .rel{font-size:12.5px;color:var(--muted)}
.node-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;
  box-shadow:var(--shadow);margin:14px 0;overflow:hidden}
.node-card.flash{outline:3px solid var(--accent);outline-offset:-3px}
.node-card>header{display:flex;align-items:center;gap:10px;padding:12px 18px;
  border-bottom:1px solid var(--line);background:var(--accent-soft)}
.node-card>header .idx{width:26px;height:26px;border-radius:50%;background:var(--accent);
  color:#fff;display:inline-flex;align-items:center;justify-content:center;
  font-size:13px;flex:none}
.node-card>header h3{margin:0;font-size:15.5px;flex:1}
.node-card>header h3 .nid{font-weight:normal;font-size:12.5px;color:var(--muted);margin-left:8px}
.badge{font-size:11.5px;border:1px solid var(--accent);color:var(--accent);
  border-radius:5px;padding:1px 8px;flex:none}
.badge.local{border-color:var(--n-end);color:var(--muted)}
.node-card>header .jump{flex:none;font-size:12px;padding:4px 10px}
.node-body{padding:14px 18px 16px}
.node-body h4{font-size:13px;margin:16px 0 8px;color:var(--muted);
  text-transform:letter-spacing:.02em}
.node-body h4:first-child{margin-top:0}
.node-body p{margin:6px 0}
table{border-collapse:collapse;width:100%;font-size:13.5px;margin:4px 0}
th,td{border:1px solid var(--line);padding:6px 10px;text-align:left;vertical-align:top}
th{background:var(--code-bg);font-weight:600;white-space:nowrap}
td .mono{font-size:12.5px}
pre.code{background:var(--code-bg);border:1px solid var(--line);border-radius:8px;
  padding:12px 14px;font-size:12.5px;line-height:1.55;overflow:auto;
  white-space:pre-wrap;word-break:break-word;margin:6px 0;position:relative}
.copy{position:absolute;top:6px;right:6px;font-size:11px;padding:3px 8px;opacity:.75}
.copy:hover{opacity:1}
.kv{display:grid;grid-template-columns:170px 1fr;gap:4px 14px;font-size:13.5px}
.kv dt{color:var(--muted);text-align:right}
.kv dd{margin:0}
.impl{font-size:12.5px;color:var(--muted);border-top:1px dashed var(--line);
  margin-top:14px;padding-top:8px}
.fail{background:var(--warn-bg);border:1px solid var(--warn-line);border-radius:8px;
  padding:8px 12px;font-size:13.5px}
.migrate{border:1px dashed var(--accent);border-radius:8px;padding:8px 12px;
  font-size:13.5px;background:var(--accent-soft)}
.foot{max-width:1180px;margin:0 auto;padding:12px 24px 36px;color:var(--muted);font-size:12.5px}
@media print{
  body{background:#fff}
  .actions,.jump,.copy{display:none}
  .canvas-wrap{overflow:visible;border:none;box-shadow:none}
  .node-card,.note-card{break-inside:avoid;box-shadow:none}
  section{margin:12px 0}
}
"""

JS = r"""
(function(){
  var spec = __SPEC_JSON__;
  var root = document.documentElement;
  var btnTheme = document.getElementById('btn-theme');
  try{ if(localStorage.getItem('bp-theme')==='dark'){root.dataset.theme='dark';btnTheme.textContent='浅色模式';} }catch(e){}
  btnTheme.addEventListener('click',function(){
    var dark = root.dataset.theme==='dark';
    root.dataset.theme = dark?'light':'dark';
    btnTheme.textContent = dark?'深色模式':'浅色模式';
    try{ localStorage.setItem('bp-theme', root.dataset.theme); }catch(e){}
  });
  document.getElementById('btn-print').addEventListener('click',function(){window.print();});

  function copyText(text,btn){
    function done(ok){ if(btn){var o=btn.textContent;btn.textContent=ok?'已复制':'复制失败';
      setTimeout(function(){btn.textContent=o;},1200);} }
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){done(true);},function(){fallback();});
    }else{fallback();}
    function fallback(){
      var ta=document.createElement('textarea');ta.value=text;
      ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);
      ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}
      document.body.removeChild(ta);done(ok);
    }
  }
  document.addEventListener('click',function(ev){
    var btn=ev.target.closest('.copy');
    if(btn){copyText(btn.dataset.text||'',btn);return;}
    var jump=ev.target.closest('[data-goto-card]');
    if(jump){flash(document.getElementById('card-'+jump.dataset.gotoCard));return;}
    var jumpNode=ev.target.closest('[data-goto-node]');
    if(jumpNode){flash(document.getElementById('card-'+jumpNode.dataset.gotoNode));return;}
    var node=ev.target.closest('.bp-node');
    if(node&&node.dataset.nodeId){flash(document.getElementById('card-'+node.dataset.nodeId));}
  });
  function flash(el){
    if(!el)return;el.scrollIntoView({behavior:'smooth',block:'start'});
    el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');
    setTimeout(function(){el.classList.remove('flash');},1600);
  }
})();
"""
