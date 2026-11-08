import { Router, html } from "../lib/router.js";

/**
 * The landing page. Everything here is one self-contained HTML
 * response — no build step, no framework — so it's easy to reshape
 * into your own project's front door. The live panel on the right of
 * the hero makes real fetch() calls back to this same Worker, so what
 * it shows is this server's actual behavior, not a mockup of it.
 *
 * To make this yours: change APP_TITLE/APP_TAGLINE below, edit the
 * route table to match src/index.js, and swap the color tokens in
 * :root if you want a different palette.
 */
const router = new Router();

const APP_TITLE = "yourserver";
const APP_TAGLINE = "A server that already exists, free, with nobody's card on file.";

router.get("/", () => {
  return html(PAGE);
});

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${APP_TITLE}</title>
<meta name="description" content="${APP_TAGLINE}" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #F1F3EE;
    --surface: #FFFFFF;
    --ink: #1B241F;
    --ink-dim: #55635B;
    --line: #D9DED6;
    --accent: #1F6F5C;
    --accent-ink: #0F3B30;
    --warn: #B5453A;
    --console-bg: #11201B;
    --console-text: #D9F2E8;
    --console-dim: #6FA796;
    --radius: 3px;
    --font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    --font-sans: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #141A17;
      --surface: #1A211D;
      --ink: #E9EFE9;
      --ink-dim: #93A49A;
      --line: #2B332E;
      --accent: #4FB89B;
      --accent-ink: #D9F2E8;
      --warn: #E07A6B;
      --console-bg: #0C1613;
      --console-text: #D9F2E8;
      --console-dim: #6FA796;
    }
  }

  * { box-sizing: border-box; }
  html { color-scheme: light dark; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 1040px; margin: 0 auto; padding: 0 20px; }
  code, .mono { font-family: var(--font-mono); }

  a { color: var(--accent-ink); text-underline-offset: 3px; }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  /* --- top bar --- */
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 0; border-bottom: 1px solid var(--line);
  }
  .wordmark { font-family: var(--font-mono); font-weight: 600; font-size: 1.05rem; letter-spacing: -0.01em; }
  .status-pill {
    display: inline-flex; align-items: center; gap: 7px;
    font-family: var(--font-mono); font-size: 0.8rem; color: var(--ink-dim);
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-dim); flex-shrink: 0; }
  .dot.ok { background: var(--accent); }
  .dot.bad { background: var(--warn); }

  /* --- hero --- */
  .hero {
    display: grid; grid-template-columns: 1.1fr 1fr; gap: 56px;
    padding: 64px 0 56px; align-items: start;
  }
  @media (max-width: 760px) { .hero { grid-template-columns: 1fr; padding: 40px 0; gap: 36px; } }

  h1 {
    font-family: var(--font-mono); font-weight: 600;
    font-size: clamp(1.7rem, 3.4vw, 2.5rem);
    line-height: 1.25; letter-spacing: -0.01em; margin: 0 0 18px;
    max-width: 18ch;
  }
  .hero p { color: var(--ink-dim); max-width: 46ch; margin: 0 0 22px; font-size: 1.02rem; }
  .hero-meta { font-family: var(--font-mono); font-size: 0.85rem; color: var(--ink-dim); }
  .hero-meta b { color: var(--ink); font-weight: 600; }

  .rerun-btn {
    font-family: var(--font-mono); font-size: 0.85rem;
    background: transparent; color: var(--accent-ink); border: 1px solid var(--line);
    border-radius: var(--radius); padding: 9px 14px; cursor: pointer; margin-top: 8px;
  }
  .rerun-btn:hover { border-color: var(--accent); }

  /* --- console --- */
  .console {
    background: var(--console-bg); color: var(--console-text);
    border-radius: 6px; padding: 18px 20px; font-family: var(--font-mono);
    font-size: 0.82rem; line-height: 1.7; min-height: 220px;
    overflow-x: auto;
  }
  .console .line { white-space: pre-wrap; word-break: break-word; }
  .console .cmd { color: var(--console-text); }
  .console .cmd::before { content: "$ "; color: var(--console-dim); }
  .console .meta { color: var(--console-dim); }
  .console .ok { color: #8FE3C4; }
  .console .err { color: #F0A89C; }
  .cursor { display: inline-block; width: 7px; height: 1em; background: var(--console-text); vertical-align: -2px; animation: blink 1s steps(1) infinite; }
  @media (prefers-reduced-motion: reduce) { .cursor { animation: none; } }
  @keyframes blink { 50% { opacity: 0; } }

  /* --- sections --- */
  section { padding: 44px 0; border-top: 1px solid var(--line); }
  h2 {
    font-family: var(--font-mono); font-size: 1rem; font-weight: 600;
    margin: 0 0 20px;
  }

  .routes { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  .routes td { padding: 9px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
  .routes td:first-child { width: 150px; }
  .method { font-family: var(--font-mono); font-weight: 600; color: var(--accent-ink); }
  .path { font-family: var(--font-mono); color: var(--ink); }
  .desc { color: var(--ink-dim); }

  .steps { list-style: none; margin: 0; padding: 0; counter-reset: step; }
  .steps li {
    counter-increment: step; display: grid; grid-template-columns: 28px 1fr;
    gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--line);
  }
  .steps li:last-child { border-bottom: none; }
  .steps li::before {
    content: counter(step); font-family: var(--font-mono); font-weight: 600;
    color: var(--accent-ink); font-size: 0.85rem;
  }
  .steps strong { display: block; margin-bottom: 2px; }
  .steps span { color: var(--ink-dim); font-size: 0.92rem; }

  footer { padding: 30px 0 60px; color: var(--ink-dim); font-size: 0.85rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
</style>
</head>
<body>
<div class="wrap">

  <div class="topbar">
    <span class="wordmark">${APP_TITLE}</span>
    <span class="status-pill"><span class="dot" id="status-dot"></span><span id="status-text">checking status…</span></span>
  </div>

  <div class="hero">
    <div>
      <h1>This page is being served, right now, by the thing it's describing.</h1>
      <p>${APP_TAGLINE} No sleep timer to wake it up, nobody's credit card keeping it alive — the panel on the right is making real requests to this same server as the page loads.</p>
      <p class="hero-meta">Runtime: <b>Cloudflare Workers</b> &nbsp;·&nbsp; Deployed by: <b>GitHub Actions</b> &nbsp;·&nbsp; License: <b>MIT</b></p>
      <button class="rerun-btn" id="rerun">Run the checks again</button>
    </div>

    <div class="console" id="console" aria-live="polite">
      <div class="line meta">waiting for the first response…</div>
    </div>
  </div>

  <section>
    <h2>What's running on this server</h2>
    <table class="routes">
      <tr><td><span class="method">GET</span> <span class="path">/health</span></td><td class="desc">Status check — returns which storage bindings (KV, D1, R2) are configured.</td></tr>
      <tr><td><span class="method">GET</span> <span class="path">/api/hello/:name</span></td><td class="desc">Example parameterized route.</td></tr>
      <tr><td><span class="method">POST</span> <span class="path">/auth/register</span>, <span class="path">/login</span></td><td class="desc">Username/password auth with server-side sessions.</td></tr>
      <tr><td><span class="method">GET/PUT</span> <span class="path">/store/:key</span></td><td class="desc">A small key-value database — no setup needed.</td></tr>
      <tr><td><span class="method">GET/POST</span> <span class="path">/notes</span></td><td class="desc">Example CRUD route over a real SQL (D1) database.</td></tr>
      <tr><td><span class="method">PUT/GET</span> <span class="path">/files/:key</span></td><td class="desc">File upload and download via R2 object storage.</td></tr>
      <tr><td><span class="method">POST</span> <span class="path">/webhook/:source</span></td><td class="desc">Receives and logs webhooks from any external service.</td></tr>
      <tr><td><span class="method">WS</span> <span class="path">/ws</span></td><td class="desc">A live WebSocket connection, echoed back with a timestamp.</td></tr>
      <tr><td><span class="method">POST</span> <span class="path">/shorten</span></td><td class="desc">Turns a long URL into a short redirect.</td></tr>
      <tr><td><span class="method">GET</span> <span class="path">/qr?text=</span></td><td class="desc">Generates a QR code for any text, cached at the edge.</td></tr>
    </table>
  </section>

  <section>
    <h2>Making this yours takes about ten minutes</h2>
    <ul class="steps">
      <li><div><strong>Use this repository as a template</strong><span>Into your own GitHub account — no install required.</span></div></li>
      <li><div><strong>Create a Cloudflare account</strong><span>Email and password only. No card, ever, on the free plan.</span></div></li>
      <li><div><strong>Add two repository secrets</strong><span>Your Cloudflare API token and account ID — both from the dashboard.</span></div></li>
      <li><div><strong>Push to main</strong><span>Even a one-line edit from GitHub's web editor. It deploys itself.</span></div></li>
    </ul>
  </section>

  <footer>
    <span>MIT licensed — fork it, rename it, ship it.</span>
    <span id="uptime-footer"></span>
  </footer>

</div>

<script>
(function () {
  var consoleEl = document.getElementById('console');
  var dot = document.getElementById('status-dot');
  var statusText = document.getElementById('status-text');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function wait(ms) { return reduceMotion ? Promise.resolve() : new Promise(function (r) { setTimeout(r, ms); }); }

  function appendLine(html) {
    var div = document.createElement('div');
    div.className = 'line';
    div.innerHTML = html;
    consoleEl.appendChild(div);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; });
  }

  async function runCheck(method, path) {
    appendLine('<span class="cmd">curl ' + method + ' ' + escapeHtml(path) + '</span>');
    var start = performance.now();
    try {
      var res = await fetch(path, { method: method });
      var ms = Math.round(performance.now() - start);
      var text = await res.text();
      var pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text)); } catch (e) {}
      if (pretty.length > 140) pretty = pretty.slice(0, 140) + '…';
      var cls = res.ok ? 'ok' : 'err';
      appendLine('<span class="' + cls + '">' + res.status + '</span> <span class="meta">' + ms + 'ms</span>  ' + escapeHtml(pretty));
      return res.ok;
    } catch (err) {
      appendLine('<span class="err">request failed</span>');
      return false;
    }
  }

  async function runSequence() {
    consoleEl.innerHTML = '';
    var checks = [
      ['GET', '/health'],
      ['GET', '/api/hello/visitor'],
      ['GET', '/store/'],
    ];
    var allOk = true;
    for (var i = 0; i < checks.length; i++) {
      var ok = await runCheck(checks[i][0], checks[i][1]);
      allOk = allOk && ok;
      await wait(260);
    }
    var cursor = document.createElement('span');
    cursor.className = 'cursor';
    consoleEl.appendChild(cursor);

    dot.className = 'dot ' + (allOk ? 'ok' : 'bad');
    statusText.textContent = allOk ? 'all checks passed' : 'one or more checks failed';
  }

  document.getElementById('rerun').addEventListener('click', runSequence);
  runSequence();

  var start = Date.now();
  var footer = document.getElementById('uptime-footer');
  function tick() {
    var s = Math.floor((Date.now() - start) / 1000);
    footer.textContent = 'This page has been open ' + s + 's — the server behind it was already running before that, and still will be after.';
  }
  tick();
  setInterval(tick, 1000);
})();
</script>
</body>
</html>`;

export default router;
