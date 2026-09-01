#!/usr/bin/env node
/**
 * Headless Chrome geometry for the homepage first fold.
 * Prints one JSON object. Used by tests/test_homepage_mobile_fold.py.
 *
 * Usage: node tests/measure_mobile_fold.mjs <url> [width] [height] [scrollY]
 */
import http from "node:http";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const url = process.argv[2];
const width = Number(process.argv[3] || 390);
const height = Number(process.argv[4] || 844);
const scrollY = Number(process.argv[5] || 0);
if (!url) {
  console.error("usage: measure_mobile_fold.mjs <url> [width] [height] [scrollY]");
  process.exit(2);
}

function findChrome() {
  const names = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/local/bin/google-chrome",
  ].filter(Boolean);
  return names[0];
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = http.createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

async function waitForJson(endpoint, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      /* chrome still booting */
    }
    await delay(100);
  }
  throw new Error("Chrome DevTools endpoint never came up");
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    this.ws.close();
  }
}

const MEASURE_JS = `
(function () {
  function box(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      top: r.top, bottom: r.bottom, left: r.left, right: r.right,
      width: r.width, height: r.height,
      opacity: Number(cs.opacity),
      visibility: cs.visibility,
      display: cs.display,
      pointerEvents: cs.pointerEvents,
    };
  }
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const mast = document.querySelector(".masthead");
  const fold = document.querySelector(".fold-sell");
  const hint = document.querySelector(".scroll-hint");
  const veil = document.querySelector(".veil");
  const opening = document.querySelector(".opening");
  function inView(b) {
    if (!b) return false;
    if (b.display === "none" || b.visibility === "hidden" || b.opacity < 0.05) return false;
    return b.bottom > 1 && b.top < vh - 1 && b.right > 1 && b.left < vw - 1;
  }
  const revealRaw = veil ? getComputedStyle(veil).getPropertyValue("--reveal") : "";
  const revealPct = Number.parseFloat(revealRaw) || 0;
  return {
    innerWidth: vw,
    innerHeight: vh,
    scrollY: window.scrollY,
    mast: box(mast),
    foldSell: box(fold),
    scrollHint: box(hint),
    opening: box(opening),
    hintInView: inView(box(hint)),
    foldSellInView: inView(box(fold)),
    revealPct,
    payHref: document.querySelector(".masthead a.pay")?.getAttribute("href") || null,
    foldHref: document.querySelector(".fold-sell a.go.pay")?.getAttribute("href") || null,
  };
})()
`;

const chromePath = findChrome();
const port = await freePort();
const profile = `/tmp/cw-fold-chrome-${port}`;
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);

let exitCode = 0;
try {
  await waitForJson(`http://127.0.0.1:${port}/json/version`);
  const created = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`, {
    method: "PUT",
  });
  const target = created.ok
    ? await created.json()
    : (await waitForJson(`http://127.0.0.1:${port}/json/list`)).find((t) => t.type === "page");
  if (!target || !target.webSocketDebuggerUrl) {
    throw new Error("no page target from Chrome");
  }
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 500,
  });
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: "try { localStorage.setItem('cw-entered', '1'); } catch (e) {}",
  });
  const loaded = new Promise((resolve) => {
    const ws = cdp.ws;
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === "Page.loadEventFired") {
        ws.removeEventListener("message", onMsg);
        resolve();
      }
    };
    ws.addEventListener("message", onMsg);
  });
  await cdp.send("Page.navigate", { url });
  await Promise.race([loaded, delay(8000)]);
  await delay(300);
  if (scrollY > 0) {
    await cdp.send("Runtime.evaluate", {
      expression: `window.scrollTo(0, ${scrollY}); window.dispatchEvent(new Event('scroll'));`,
    });
    await delay(250);
  }
  const evaled = await cdp.send("Runtime.evaluate", {
    expression: MEASURE_JS,
    returnByValue: true,
    awaitPromise: false,
  });
  if (evaled.exceptionDetails) {
    throw new Error(JSON.stringify(evaled.exceptionDetails));
  }
  process.stdout.write(JSON.stringify(evaled.result.value));
  cdp.close();
} catch (err) {
  console.error(err && err.stack ? err.stack : err);
  exitCode = 1;
} finally {
  chrome.kill("SIGKILL");
  process.exit(exitCode);
}
