// Verification driver for the landing pages' scripted CDP checks (issue #43;
// prior art: the prototype's prototype-verify scripts). Raw CDP over Node's
// built-in WebSocket — no browser-automation dependency. Committed by owner
// ruling (2026-09-08): tickets 06–10 extend this harness. Needs Chrome/
// Chromium on --remote-debugging-port=9222.
const CDP_HTTP = process.env.CDP_HTTP ?? 'http://127.0.0.1:9222';

async function jsonHttp(path, opts) {
  const res = await fetch(`${CDP_HTTP}${path}`, opts);
  return res.json();
}

export async function connect() {
  const targets = await jsonHttp('/json/list');
  let page = targets.find((t) => t.type === 'page');
  if (!page) {
    page = await jsonHttp(`/json/new?${encodeURIComponent('about:blank')}`, {
      method: 'PUT',
    });
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  // A dead socket must fail LOUD (#45 hardens the harness, ticket-05
  // follow-up): reject pending sends and refuse new ones — never hang,
  // never resolve-with-nothing (which would false-PASS a check).
  ws.onclose = () => {
    for (const entry of pending.values()) entry.rej(new Error('CDP socket closed mid-call'));
    pending.clear();
  };
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).res(msg);
      pending.delete(msg.id);
    }
  };
  function send(method, params = {}) {
    if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
      return Promise.reject(new Error('CDP socket closed'));
    }
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
  const wait = (ms) => evaluate(`new Promise((r) => setTimeout(r, ${ms}))`);
  async function go(url) {
    await send('Page.enable');
    await send('Page.navigate', { url });
    await evaluate(
      `new Promise((res) => { if (document.readyState === 'complete') res(1); else addEventListener('load', () => res(1)); })`
    );
    await wait(1500);
  }
  const text = () => evaluate('document.body.innerText');
  const close = () => ws.close();
  return { send, evaluate, wait, go, text, close };
}
