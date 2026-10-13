import assert from "node:assert/strict";
import { accessSync, constants } from "node:fs";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const chromium = process.env.CHROMIUM_PATH ?? ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]
  .find(path => { try { accessSync(path, constants.X_OK); return true; } catch { return false; } });
assert.ok(chromium, "Set CHROMIUM_PATH to a Chromium executable to run this browser regression.");

async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise(resolve => server.close(resolve));
  return address.port;
}

async function waitFor(url, attempts = 60) {
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
const profile = await fs.mkdtemp(join(tmpdir(), "mythrasgen-bootstrap-"));
const preview = spawn("bun", ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(previewPort), "--strictPort"], { stdio: "ignore", detached: true });
const browser = spawn(chromium, ["--headless=new", "--no-sandbox", `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`], { stdio: "ignore", detached: true });

try {
  await waitForHttp(`http://127.0.0.1:${previewPort}/`);
  await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
  const page = await fetch(`http://127.0.0.1:${debugPort}/json/new?http://127.0.0.1:${previewPort}/`, { method: "PUT" }).then(response => response.json());
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  const exceptions = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  };
  const call = (method, params = {}) => new Promise(resolve => {
    const id = ++nextId;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await call("Runtime.evaluate", { expression, returnByValue: true });
    return response.result.result.value;
  };
  await call("Runtime.enable");
  await call("Page.enable");
  await new Promise(resolve => setTimeout(resolve, 750));
  let state = JSON.parse(await evaluate(`JSON.stringify({ text: document.body.innerText, fallback: !!document.querySelector('.startup-error') })`));
  assert.equal(state.fallback, false, "fresh-storage startup should mount the app");
  assert.match(state.text, /Mythras/);

  const character = {
    id: "legacy-barbarian-style", name: "Saved Barbarian", culture: "Barbarian", career: "Hunter", step: 5,
    cultureSelections: { standard: [], professional: [], combatStyle: "" }, careerProfessional: [], careerCombatStyles: [],
    combatStyles: [{ id: "campaign:barbarian", name: "Barbarian", baseFormula: ["STR", "DEX"], weapons: [], traits: [],
      source: { libraryId: "campaign", libraryName: "Campaign" }, status: "custom", origin: "bonus", origins: ["bonus"], allocations: {} }],
    hobbySkill: { type: "combatStyle", name: "Barbarian" }, alloc: { culture: {}, career: {}, bonus: { Barbarian: 10 } }, magic: {},
  };
  const library = JSON.stringify({ activeId: character.id, characters: [character] });
  await evaluate(`localStorage.setItem("mythrasgen.characters.v1", ${JSON.stringify(library)})`);
  await call("Page.reload");
  await new Promise(resolve => setTimeout(resolve, 1000));
  state = JSON.parse(await evaluate(`JSON.stringify({ text: document.body.innerText, fallback: !!document.querySelector('.startup-error') })`));
  assert.equal(state.fallback, false, "persisted-character startup should mount the app");
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.innerText.toLowerCase().includes('continue your hero'))?.click()`);
  await new Promise(resolve => setTimeout(resolve, 500));
  state = JSON.parse(await evaluate(`JSON.stringify({ text: document.body.innerText, fallback: !!document.querySelector('.startup-error') })`));
  assert.equal(state.fallback, false);
  assert.match(state.text.toLowerCase(), /cults & organisations/, "Page VI should render");
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.innerText.toLowerCase().includes('add organisation'))?.click()`);
  const dialog = JSON.parse(await evaluate(`JSON.stringify({ open: document.querySelector('.organisation-editor')?.open, text: document.querySelector('.organisation-editor')?.innerText })`));
  assert.equal(dialog.open, true, "organisation membership dialog should open");
  assert.match(dialog.text.toLowerCase(), /join existing/);
  assert.deepEqual(exceptions, [], "unexpected browser exceptions should not occur");
  socket.close();
  console.log("Fresh startup, migrated saved-character bootstrap, Page VI, and organisation dialog passed.");
} finally {
  for (const process of [browser, preview]) {
    try { globalThis.process.kill(-process.pid, "SIGTERM"); } catch {}
  }
  await Promise.all([browser, preview].map(process => new Promise(resolve => {
    if (process.exitCode !== null) return resolve();
    const timeout = setTimeout(() => { try { globalThis.process.kill(-process.pid, "SIGKILL"); } catch {} resolve(); }, 2000);
    process.once("exit", () => { clearTimeout(timeout); resolve(); });
  })));
  await fs.rm(profile, { recursive: true, force: true });
}
