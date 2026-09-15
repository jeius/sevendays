// PROTOTYPE TOOL (#111) — throwaway screenshot driver for the remediation
// prototype. Raw CDP, same pattern as verify/lib.mjs (no automation dep).
// Usage: node prototype-shot.mjs <url> <outfile.png> [width] [height] [fullPage] [waitMs]
const CDP_HTTP = process.env.CDP_HTTP ?? 'http://127.0.0.1:9222';

const [url, out, w = '1440', h = '2400', fullPage = 'true', waitMs = '3500'] =
  process.argv.slice(2);

async function jsonHttp(path, opts) {
  const res = await fetch(`${CDP_HTTP}${path}`, opts);
  return res.json();
}

const targets = await jsonHttp('/json/list');
const stale = targets.find((t) => t.type === 'page' && t.url.startsWith('about:'));
// Always shoot in a FRESH target: a previously-stuck page must not wedge the loop.
const page = await jsonHttp(`/json/new?${encodeURIComponent('about:blank')}`, {
  method: 'PUT',
});
void stale;
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id).res(msg);
    pending.delete(msg.id);
  }
};
function send(method, params = {}) {
  const msgId = ++id;
  ws.send(JSON.stringify({ id: msgId, method, params }));
  return new Promise((res, rej) => pending.set(msgId, { res, rej }));
}
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', {
    expression: expr,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.result?.exceptionDetails) {
    throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval failed');
  }
  return r.result?.result?.value;
}

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(w),
  height: Number(h),
  deviceScaleFactor: 2,
  mobile: Number(w) < 500,
});
await send('Page.navigate', { url });
// Load-wait with a hard ceiling: dev servers occasionally stall a subresource,
// and a hung 'load' must not hang the prototype loop.
await evaluate(
  `new Promise((res) => {
    if (document.readyState === 'complete') return res(1);
    const done = () => res(1);
    addEventListener('load', done);
    setTimeout(done, 12000);
  })`
);
await new Promise((r) => setTimeout(r, Number(waitMs)));
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(w),
  height: Number(h),
  deviceScaleFactor: 2,
  mobile: Number(w) < 500,
});
const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: fullPage === 'true',
});
const { writeFileSync } = await import('node:fs');
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
// Surface console + render sanity: page title, body text length.
const title = await evaluate('document.title');
const bodyLen = await evaluate('document.body.innerText.length');
console.log(`shot ${out} — title="${title}" bodyText=${bodyLen} chars`);
ws.close();
