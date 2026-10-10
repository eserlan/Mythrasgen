import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accessSync, constants } from "node:fs";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const chromium = process.env.CHROMIUM_PATH ?? ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]
  .find(path => { try { accessSync(path, constants.X_OK); return true; } catch { return false; } });
assert.ok(chromium, "Set CHROMIUM_PATH to a Chromium executable to run the accessibility check.");
const axeSource = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  await new Promise(resolve => server.close(resolve));
  return address.port;
}
async function waitFor(url, attempts = 120) {
  for (let i = 0; i < attempts; i++) {
    try { return await fetch(url).then(response => response.json()); } catch { await new Promise(resolve => setTimeout(resolve, 250)); }
  }
  throw new Error(`Timed out waiting for ${url}`);
}
async function waitForHttp(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}
const previewPort = await freePort();
const debugPort = await freePort();
const profile = await fs.mkdtemp(join(tmpdir(), "mythrasgen-a11y-"));
const preview = spawn("bun", ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(previewPort), "--strictPort"], { stdio: "ignore", detached: true });
const browser = spawn(chromium, ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`], { stdio: "ignore", detached: true });
try {
  const url = `http://127.0.0.1:${previewPort}/`;
  await waitForHttp(url);
  await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
  const page = await fetch(`http://127.0.0.1:${debugPort}/json/new?${url}`, { method: "PUT" }).then(response => response.json());
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  };
  const call = (method, params = {}) => new Promise(resolve => {
    const id = ++nextId;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.exception?.description ?? response.result.exceptionDetails.text);
    return response.result.result.value;
  };
  await call("Runtime.enable");
  await call("Page.enable");
  await new Promise(resolve => setTimeout(resolve, 500));
  const character = { id: "a11y-character", name: "Accessibility Check", step: 7, cultureSelections: { standard: [], professional: [], combatStyle: "" }, careerProfessional: [], careerCombatStyles: [], alloc: { culture: {}, career: {}, bonus: {} }, magic: {} };
  await evaluate(`localStorage.setItem("mythrasgen.characters.v1", ${JSON.stringify(JSON.stringify({ activeId: character.id, characters: [character] }))})`);
  await call("Page.reload");
  await new Promise(resolve => setTimeout(resolve, 1000));
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.innerText.toLowerCase().includes('continue your hero'))?.click()`);
  await new Promise(resolve => setTimeout(resolve, 500));
  const loaded = await evaluate(`JSON.stringify({ equipment: !!document.querySelector('.inventory-ledger'), text: document.body.innerText.slice(0,800) })`);
  assert.ok(JSON.parse(loaded).equipment, `Page VIII did not load: ${JSON.parse(loaded).text}`);
  await evaluate(axeSource);
  const runAxe = async () => {
    const result = await evaluate(`axe.run(document.querySelector('.inventory-ledger'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } }).then(result => JSON.stringify({ violations: result.violations.map(v => ({ id:v.id, impact:v.impact, help:v.help, nodes:v.nodes.map(n => ({ target:n.target, failureSummary:n.failureSummary })) })) }))`);
    const { violations } = JSON.parse(result);
    assert.deepEqual(violations, [], `axe violations: ${JSON.stringify(violations)}`);
  };
  const clickText = async text => evaluate(`Array.from(document.querySelectorAll('.inventory-ledger button')).find(button => button.innerText.trim().toLowerCase().startsWith(${JSON.stringify(text.toLowerCase())}))?.click()`);
  await runAxe();
  assert.equal(await evaluate(`document.querySelectorAll('.group-button').length`), 4, "new characters should see four equipment groups, not the full catalogue");
  assert.equal(await evaluate(`document.querySelectorAll('.armour-summary').length`), 0, "the new character review should not show an empty armour grid");
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  await runAxe();
  await call("Emulation.setEmulatedMedia", { features: [] });
  await clickText("Weapons");
  assert.ok(await evaluate(`!!document.querySelector('.subcategory-buttons')`), "a group should open its categories");
  await runAxe();
  await clickText("One Handed");
  await runAxe();
  await evaluate(`document.querySelector('.catalogue-row')?.click()`);
  await runAxe();
  await evaluate(`document.querySelector('.item-detail button[aria-label="Close item details"]')?.click()`);
  assert.ok(await evaluate(`document.activeElement?.id === document.querySelector('.catalogue-row')?.id`), "closing details should return focus to the selected result");
  await clickText("Your equipment");
  await runAxe();
  await clickText("Review your character");
  await runAxe();
  await clickText("Choose equipment");
  await evaluate(`(() => { const input = document.querySelector('.catalogue-filters input[type="search"]'); input.value = 'Dagger'; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  await evaluate(`document.querySelector('.catalogue-row')?.click()`);
  const buyReady = await evaluate(`JSON.stringify({ detail: !!document.querySelector('.item-detail'), buyDisabled: document.querySelector('.purchase-controls .primary')?.disabled, name: document.querySelector('.selected-item-title')?.innerText })`);
  assert.ok(JSON.parse(buyReady).detail && !JSON.parse(buyReady).buyDisabled, `Dagger should be purchasable with the fixture starting funds: ${buyReady}`);
  await evaluate(`document.querySelector('.purchase-controls .primary')?.click()`);
  await new Promise(resolve => setTimeout(resolve, 150));
  const purchaseStatus = await evaluate(`document.querySelector('[role="status"]')?.innerText ?? ''`);
  assert.match(purchaseStatus, /added to your equipment.*Money remaining/i, "purchase outcome and balance should be announced");
  await clickText("Your equipment");
  await new Promise(resolve => setTimeout(resolve, 150));
  const ownedText = await evaluate(`JSON.stringify({ view: document.querySelector('.activity-nav button[aria-current="page"]')?.innerText, body: document.querySelector('.inventory-ledger')?.innerText.slice(0,1400) })`);
  assert.match(JSON.parse(ownedText).body, /Dagger/, `purchased item should appear in owned equipment: ${ownedText}`);
  assert.ok(await evaluate(`!!document.querySelector('.owned-list select')`), `equipment state control should render: ${ownedText}`);
  await evaluate(`(() => { const select = document.querySelector('.owned-list select'); select.value = 'worn'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await clickText("Review your character");
  assert.match(await evaluate(`document.querySelector('.review-summary')?.innerText ?? ''`), /Carrying load/, "review should show carrying load after purchase");
  await call("Emulation.setDeviceMetricsOverride", { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
  await new Promise(resolve => setTimeout(resolve, 100));
  const narrow = await evaluate(`JSON.stringify({ viewport: document.documentElement.clientWidth, page: document.querySelector('.inventory-ledger').clientWidth, content: document.querySelector('.inventory-ledger').scrollWidth })`);
  assert.ok(JSON.parse(narrow).content <= JSON.parse(narrow).page, `Page VIII must reflow at 320 CSS px: ${narrow}`);
  await evaluate(`(() => { const style = document.createElement('style'); style.id = 'text-spacing-check'; style.textContent = 'p,li,label,summary { line-height: 1.5 !important; margin-bottom: 2em !important; letter-spacing: .12em !important; word-spacing: .16em !important; }'; document.head.append(style); })()`);
  const spaced = await evaluate(`JSON.stringify({ page: document.querySelector('.inventory-ledger').clientWidth, content: document.querySelector('.inventory-ledger').scrollWidth })`);
  assert.ok(JSON.parse(spaced).content <= JSON.parse(spaced).page, `Page VIII must reflow with WCAG text-spacing overrides: ${spaced}`);
  await call("Emulation.clearDeviceMetricsOverride");
  socket.close();
  console.log("axe-core WCAG 2.2 A/AA checks passed for equipment group, category, selected item, owned equipment, and review views; dagger purchase, state edit, and load review passed.");
} finally {
  for (const child of [browser, preview]) { try { globalThis.process.kill(-child.pid, "SIGTERM"); } catch {} }
  await Promise.all([browser, preview].map(child => new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    const timeout = setTimeout(() => { try { globalThis.process.kill(-child.pid, "SIGKILL"); } catch {} resolve(); }, 2000);
    child.once("exit", () => { clearTimeout(timeout); resolve(); });
  })));
  await fs.rm(profile, { recursive: true, force: true });
}
