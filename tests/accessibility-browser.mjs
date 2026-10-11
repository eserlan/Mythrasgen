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
function captureStderr(child) {
  let output = "";
  child.stderr?.on("data", chunk => { output = (output + chunk).slice(-8000); });
  child.on("error", error => { child.spawnError = error.message; });
  return () => [child.spawnError, output.trim()].filter(Boolean).join("\n");
}
function assertRunning(child, label, getStderr) {
  if (child.spawnError || child.exitCode !== null || child.signalCode !== null) {
    const status = child.spawnError ? `failed to start: ${child.spawnError}` : child.signalCode ? `signal ${child.signalCode}` : `exit code ${child.exitCode}`;
    const details = getStderr();
    throw new Error(`${label} exited before becoming ready (${status})${details ? `:\n${details}` : ""}`);
  }
}
async function waitFor(url, child, label, getStderr, attempts = 240) {
  for (let i = 0; i < attempts; i++) {
    try { return await fetch(url).then(response => response.json()); } catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    assertRunning(child, label, getStderr);
  }
  const details = getStderr();
  throw new Error(`Timed out waiting for ${url}${details ? `:\n${details}` : ""}`);
}
async function waitForHttp(url, child, getStderr, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    assertRunning(child, "Vite preview", getStderr);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const details = getStderr();
  throw new Error(`Timed out waiting for ${url}${details ? `:\n${details}` : ""}`);
}
const previewPort = await freePort();
const debugPort = await freePort();
const profile = await fs.mkdtemp(join(tmpdir(), "mythrasgen-a11y-"));
const preview = spawn("bun", ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(previewPort), "--strictPort"], { stdio: ["ignore", "ignore", "pipe"], detached: true });
const getPreviewStderr = captureStderr(preview);
const browser = spawn(chromium, ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`], { stdio: ["ignore", "ignore", "pipe"], detached: true });
const getBrowserStderr = captureStderr(browser);
try {
  const url = `http://127.0.0.1:${previewPort}/`;
  await waitForHttp(url, preview, getPreviewStderr);
  await waitFor(`http://127.0.0.1:${debugPort}/json/version`, browser, "Chromium", getBrowserStderr);
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
  assert.equal(await evaluate(`document.querySelectorAll('.activity-nav button').length`), 2, "Page VIII should expose only Choose equipment and Your equipment");
  assert.equal(await evaluate(`document.querySelectorAll('.armour-summary').length`), 0, "owned equipment should not show an empty armour grid");
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  await new Promise(resolve => setTimeout(resolve, 250));
  await runAxe();
  await call("Emulation.setEmulatedMedia", { features: [] });
  await clickText("Weapons");
  assert.ok(await evaluate(`!!document.querySelector('.subcategory-buttons')`), "a group should open its categories");
  await runAxe();
  await clickText("One Handed");
  await new Promise(resolve => setTimeout(resolve, 100));
  const rowNamed = name => `(() => { const rows = Array.from(document.querySelectorAll('.catalogue-row')); const row = rows.find(button => button.querySelector('.row-main b')?.textContent.trim() === ${JSON.stringify(name)}); if (!row) throw new Error('Missing ' + ${JSON.stringify(name)} + ' row; found: ' + rows.map(button => button.querySelector('.row-main b')?.textContent.trim()).join(', ')); return row; })()`;
  await evaluate(`${rowNamed("Chain")}.click()`);
  const chainPlacement = JSON.parse(await evaluate(`(() => { const row = ${rowNamed("Chain")}; const detail = document.querySelector('.item-detail'); return JSON.stringify({ expanded: row.getAttribute('aria-expanded'), controls: row.getAttribute('aria-controls'), sameItem: row.parentElement === detail?.parentElement, immediatelyAfter: row.nextElementSibling === detail, nextName: row.parentElement.nextElementSibling?.querySelector('.catalogue-row .row-main b')?.textContent.trim(), detailCount: document.querySelectorAll('.item-detail').length }); })()`));
  assert.equal(chainPlacement.expanded, "true", "Chain should expose its expanded state");
  assert.equal(chainPlacement.controls, "selected-item-detail", "Chain should identify its controlled detail panel");
  assert.ok(chainPlacement.sameItem && chainPlacement.immediatelyAfter, `Chain details should follow its row inside the same result: ${JSON.stringify(chainPlacement)}`);
  assert.equal(chainPlacement.nextName, "Club", "Chain details should appear before the next result");
  assert.equal(chainPlacement.detailCount, 1, "only one catalogue detail panel should be open");
  await evaluate(`${rowNamed("Chain")}.click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.item-detail').length`), 0, "clicking Chain again should collapse it");
  await evaluate(`${rowNamed("Whip")}.click()`);
  await evaluate(`${rowNamed("Chain")}.click()`);
  const switchedPlacement = JSON.parse(await evaluate(`(() => { const row = ${rowNamed("Chain")}; const detail = document.querySelector('.item-detail'); return JSON.stringify({ chainExpanded: row.getAttribute('aria-expanded'), whipExpanded: ${rowNamed("Whip")}.getAttribute('aria-expanded'), sameItem: row.parentElement === detail?.parentElement, detailCount: document.querySelectorAll('.item-detail').length }); })()`));
  assert.deepEqual(switchedPlacement, { chainExpanded: "true", whipExpanded: "false", sameItem: true, detailCount: 1 }, `switching items should leave only Chain expanded: ${JSON.stringify(switchedPlacement)}`);
  await evaluate(`(() => { const sort = document.querySelector('.catalogue-filters select'); sort.value = 'price'; sort.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(await evaluate(`${rowNamed("Chain")}.getAttribute('aria-expanded') === 'true' && ${rowNamed("Chain")}.nextElementSibling === document.querySelector('.item-detail')`), "sorting should preserve Chain and keep its detail directly beneath it");
  await evaluate(`(() => { const search = document.querySelector('.catalogue-filters input[type="search"]'); search.value = 'Whip'; search.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(await evaluate(`document.querySelectorAll('.item-detail').length`), 0, "searching away from Chain should close its detail panel");
  await evaluate(`(() => { const search = document.querySelector('.catalogue-filters input[type="search"]'); search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  await evaluate(`${rowNamed("Chain")}.click()`);
  await runAxe();
  await evaluate(`document.querySelector('.item-detail button[aria-label="Close item details"]')?.click()`);
  assert.ok(await evaluate(`document.activeElement?.id === 'equipment-result-one_handed-chain'`), "closing details should return focus to the selected result");
  await clickText("Your equipment");
  await runAxe();
  assert.ok(await evaluate(`document.querySelector('.review-summary')?.innerText.includes('Money remaining')`), "equipment summary should be visible in Your equipment");
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
  await evaluate(`document.querySelector('.catalogue-filters input[type="search"]').value = ''; document.querySelector('.catalogue-filters input[type="search"]').dispatchEvent(new Event('input', { bubbles: true }))`);
  await clickText("Create custom item");
  const setCustomField = async (label, value, event = "input") => evaluate(`(() => { const label = Array.from(document.querySelectorAll('.custom-form label')).find(node => node.textContent.trim().startsWith(${JSON.stringify(label)})); if (!label) throw new Error('Missing custom field ' + ${JSON.stringify(label)}); const control = label.querySelector('input,select,textarea'); control.value = ${JSON.stringify(value)}; control.dispatchEvent(new Event(${JSON.stringify(event)}, { bubbles: true })); })()`);
  await setCustomField("Item name", "Accessibility sword");
  await setCustomField("Base damage", "1d8");
  await setCustomField("Size", "Medium", "change");
  await setCustomField("Reach", "Medium", "change");
  await setCustomField("Weapon AP", "6");
  await setCustomField("Weapon HP", "10");
  await setCustomField("Hands required", "1", "change");
  await setCustomField("Price (SP)", "175");
  await setCustomField("ENC", "2");
  await runAxe();
  await evaluate(`window.__customErrors = []; window.addEventListener('error', event => window.__customErrors.push(event.message))`);
  await evaluate(`document.querySelector('.custom-form button.primary')?.click()`);
  await new Promise(resolve => setTimeout(resolve, 150));
  const customState = await evaluate(`JSON.stringify({ visible: !!Array.from(document.querySelectorAll('.custom-entry')).find(entry => entry.innerText.includes('Accessibility sword')), status: document.querySelector('.inventory-ledger [role="status"]')?.innerText, errors: window.__customErrors })`);
  assert.ok(JSON.parse(customState).visible, `saved character custom item should appear in My Custom Items: ${customState}`);
  assert.deepEqual(JSON.parse(customState).errors, [], `custom item save should not produce browser errors: ${customState}`);
  await evaluate(`Array.from(document.querySelectorAll('.custom-entry')).find(entry => entry.innerText.includes('Accessibility sword')).querySelector('button').click()`);
  await new Promise(resolve => setTimeout(resolve, 150));
  await clickText("Your equipment");
  await runAxe();
  const ownedCustom = await evaluate(`JSON.stringify({ found: Array.from(document.querySelectorAll('.inventory-table tbody tr')).some(item => item.innerText.includes('Accessibility sword') && item.innerText.includes('Custom')), status: document.querySelector('.inventory-ledger [role="status"]')?.innerText, rows: Array.from(document.querySelectorAll('.inventory-table tbody tr')).map(item => item.innerText) })`);
  assert.ok(JSON.parse(ownedCustom).found, `purchased custom sword should appear in owned equipment: ${ownedCustom}`);
  assert.equal(await evaluate(`document.querySelector('input[aria-label="ENC per item for Accessibility sword"]')?.value`), "2", "custom sword should retain its ENC in owned equipment");
  const customRow = `Array.from(document.querySelectorAll('.inventory-table tbody tr')).find(item => item.innerText.includes('Accessibility sword'))`;
  const alwaysEditable = JSON.parse(await evaluate(`(() => { const row = ${customRow}; return JSON.stringify({ details:row.querySelector('details'), controls:Array.from(row.querySelectorAll('input,select')).map(control => ({ label:control.getAttribute('aria-label'), visible:control.getBoundingClientRect().width > 0 })) }); })()`));
  assert.equal(alwaysEditable.details, null, "ordinary inventory rows should not hide controls or item details in disclosures");
  assert.ok(alwaysEditable.controls.length >= 4 && alwaysEditable.controls.every(control => control.visible), `quantity, state, ENC and exemption should be immediately visible: ${JSON.stringify(alwaysEditable)}`);
  assert.doesNotMatch(await evaluate(`${customRow}?.innerText ?? ''`), /ENC contribution/, "owned row should not add a second line for ENC contribution");
  await evaluate(`(() => { const row = ${customRow}; const select = row.querySelector('select'); select.value = 'worn'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  assert.match(await evaluate(`document.querySelector('.review-summary')?.innerText ?? ''`), /1 ENC/, "changing item state should update the character load summary");
  await evaluate(`(() => { const row = ${customRow}; const enc = row.querySelector('input[aria-label="ENC per item for Accessibility sword"]'); enc.value = '4'; enc.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  assert.match(await evaluate(`document.querySelector('.review-summary')?.innerText ?? ''`), /2 ENC/, "changing ENC should update the character load summary");
  await call("Emulation.setDeviceMetricsOverride", { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
  const compactOwned = JSON.parse(await evaluate(`(() => { const row = ${customRow}; const controls = Array.from(row.querySelectorAll('input[type="number"],select')); return JSON.stringify({ page:row.getBoundingClientRect().width, scroll:row.scrollWidth, viewport:innerWidth, widths:controls.map(control => control.getBoundingClientRect().width) }); })()`));
  assert.ok(compactOwned.scroll <= compactOwned.viewport, `owned row should not cause horizontal scrolling at 320px: ${JSON.stringify(compactOwned)}`);
  assert.ok(compactOwned.widths.every(width => width <= 200), `owned controls should remain compact at 320px: ${JSON.stringify(compactOwned)}`);
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await runAxe();
  assert.ok(await evaluate(`document.querySelector('.review-summary')?.innerText.includes('2 ENC')`), "custom sword ENC should contribute to the displayed character load");
  await clickText("Choose equipment");
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await evaluate(`(() => { const input = document.querySelector('.catalogue-filters input[type="search"]'); input.value = 'Flail'; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  await evaluate(`document.querySelector('.catalogue-row')?.click()`);
  const toolbar = JSON.parse(await evaluate(`(() => { const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { left:r.left, top:r.top, bottom:r.bottom, centerY:r.top+r.height/2, width:r.width, height:r.height }; }; const bar = document.querySelector('.acquisition-toolbar'); return JSON.stringify({ quantity:rect('.quantity-input'), total:rect('.purchase-total'), buy:rect('.buy-button'), free:rect('.free-acquisition select'), bar:rect('.acquisition-toolbar'), align:getComputedStyle(bar).alignItems, width:innerWidth, price:document.querySelector('.purchase-total b')?.textContent.trim() }); })()`));
  assert.equal(toolbar.price, "25 SP", `Flail total should remain silver-first: ${JSON.stringify(toolbar)}`);
  assert.ok(toolbar.quantity.left < toolbar.total.left && toolbar.total.left < toolbar.buy.left && toolbar.buy.left < toolbar.free.left, `Flail controls should appear in acquisition order: ${JSON.stringify(toolbar)}`);
  assert.ok([toolbar.total, toolbar.buy, toolbar.free].every(control => Math.abs(control.centerY - toolbar.quantity.centerY) < 8), `Flail acquisition controls should share one desktop row: ${JSON.stringify(toolbar)}`);
  await evaluate(`(() => { const input = document.querySelector('.catalogue-filters input[type="search"]'); input.value = 'Half Plate'; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  await evaluate(`document.querySelector('.catalogue-row')?.click()`);
  const halfPlateInitial = JSON.parse(await evaluate(`(() => { const detail = document.querySelector('.item-detail'); const fieldset = detail?.querySelector('.protected-locations'); return JSON.stringify({ name:detail?.querySelector('#selected-item-title')?.textContent.trim(), inline:detail?.previousElementSibling?.classList.contains('catalogue-row'), legend:fieldset?.querySelector('legend')?.textContent, options:fieldset?.querySelectorAll('input[type="checkbox"]').length, help:fieldset?.getAttribute('aria-describedby'), price:detail?.querySelector('.purchase-total b')?.textContent.trim() }); })()`));
  assert.equal(halfPlateInitial.name, "Half Plate");
  assert.ok(halfPlateInitial.inline, "Half Plate material and location controls should remain inside its expanded catalogue panel");
  assert.equal(halfPlateInitial.legend, "Protected hit locations");
  assert.equal(halfPlateInitial.options, 7);
  assert.ok(halfPlateInitial.help, "the fieldset should expose its guidance to assistive technology");
  await evaluate(`(() => { const inputs = Array.from(document.querySelectorAll('.protected-locations .location-options input')); inputs[0].closest('label').click(); inputs[1].closest('label').click(); })()`);
  const halfPlateSelected = JSON.parse(await evaluate(`(() => { const detail = document.querySelector('.item-detail'); return JSON.stringify({ count:detail.querySelector('.location-count')?.textContent.trim(), totals:detail.querySelector('.catalogue-armour-options .mute[aria-live="polite"]')?.textContent.trim(), price:detail.querySelector('.purchase-total b')?.textContent.trim() }); })()`));
  assert.match(halfPlateSelected.count, /2 of 7 locations selected/);
  assert.match(halfPlateSelected.totals, /8 ENC full worn ENC · 4 ENC worn load/);
  assert.equal(halfPlateSelected.price, "1000 SP");
  await evaluate(`document.querySelector('.protected-locations input').focus()`);
  assert.ok(await evaluate(`document.activeElement === document.querySelector('.protected-locations input')`), "hit locations should remain keyboard focusable");
  await call("Input.dispatchKeyEvent", { type:"keyDown", key:" ", code:"Space" });
  await call("Input.dispatchKeyEvent", { type:"keyUp", key:" ", code:"Space" });
  assert.ok(await evaluate(`!document.querySelector('.protected-locations input').checked && document.querySelector('.location-count').textContent.includes('1 of 7')`), "Space should toggle a focused location and announce the updated count");
  await call("Input.dispatchKeyEvent", { type:"keyDown", key:" ", code:"Space" });
  await call("Input.dispatchKeyEvent", { type:"keyUp", key:" ", code:"Space" });
  assert.ok(await evaluate(`document.querySelector('.protected-locations input').checked && document.querySelector('.location-count').textContent.includes('2 of 7')`), "keyboard location selection should restore its prior state");
  await evaluate(`document.querySelector('.material-override input').closest('label').click()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  await evaluate(`(() => { const material = document.querySelector('[aria-label="Material for Half Plate"]'); material.value = 'ivory'; material.dispatchEvent(new Event('change', { bubbles:true })); })()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(await evaluate(`document.querySelector('.material-override input').checked && document.querySelector('.protected-locations input').checked`), "GM override and selected locations should persist through material changes");
  assert.equal(await evaluate(`document.querySelector('[aria-label="Material for Half Plate"]').value`), "ivory", "the explicit GM override should allow conditional material selection");
  await runAxe();
  await call("Emulation.setDeviceMetricsOverride", { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
  const armourNarrow = JSON.parse(await evaluate(`(() => { const panel = document.querySelector('.item-detail'); const fieldset = panel.querySelector('.protected-locations'); return JSON.stringify({ panel:panel.clientWidth, panelScroll:panel.scrollWidth, fieldset:fieldset.clientWidth, fieldsetScroll:fieldset.scrollWidth, options:Array.from(fieldset.querySelectorAll('label')).map(label => ({ width:label.clientWidth, scroll:label.scrollWidth })) }); })()`));
  assert.ok(armourNarrow.panelScroll <= armourNarrow.panel && armourNarrow.fieldsetScroll <= armourNarrow.fieldset && armourNarrow.options.every(option => option.scroll <= option.width), `Half Plate hit locations must reflow without horizontal scrolling at 320 CSS px: ${JSON.stringify(armourNarrow)}`);
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await evaluate(`document.querySelector('.item-detail button[aria-label="Close item details"]')?.click()`);
  await evaluate(`(() => { const input = document.querySelector('.catalogue-filters input[type="search"]'); input.value = 'Flail'; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  await evaluate(`document.querySelector('.catalogue-row')?.click()`);
  const inventoryCount = () => evaluate(`document.querySelector('.activity-nav button:nth-child(2)')?.innerText.match(/\\d+/)?.[0] ?? '0'`);
  const beforeFree = await inventoryCount();
  await evaluate(`(() => { const select = document.querySelector('.free-acquisition select'); select.value = 'gifted'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  assert.equal(await inventoryCount(), beforeFree, "choosing Gifted must not add an item before confirmation");
  await evaluate(`document.querySelector('.free-acquisition button')?.click()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(Number(await inventoryCount()), Number(beforeFree) + 1, "confirming Gifted should add the item without payment");
  await clickText("Your equipment");
  await new Promise(resolve => setTimeout(resolve, 150));
  const ownedText = await evaluate(`JSON.stringify({ view: document.querySelector('.activity-nav button[aria-current="page"]')?.innerText, body: document.querySelector('.inventory-ledger')?.innerText.slice(0,1400) })`);
  assert.match(JSON.parse(ownedText).body, /Dagger/, `purchased item should appear in owned equipment: ${ownedText}`);
  assert.ok(await evaluate(`!!document.querySelector('.inventory-table tbody tr select[aria-label="State of Dagger"]')`), `equipment state control should render immediately: ${ownedText}`);
  await evaluate(`(() => { const select = document.querySelector('.inventory-table tbody tr select[aria-label="State of Dagger"]'); select.value = 'worn'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  assert.match(await evaluate(`document.querySelector('.review-summary')?.innerText ?? ''`), /Carrying load/, "review should show carrying load after purchase");
  await clickText("Choose equipment");
  await evaluate(`if (!document.querySelector('.item-detail')) document.querySelector('.catalogue-row')?.click()`);
  assert.ok(await evaluate(`!!document.querySelector('.item-detail .purchase-controls')`), "selected item purchase controls should remain available when returning to choose equipment");
  await call("Emulation.setDeviceMetricsOverride", { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
  await new Promise(resolve => setTimeout(resolve, 100));
  const narrow = await evaluate(`JSON.stringify({ viewport: document.documentElement.clientWidth, page: document.querySelector('.inventory-ledger').clientWidth, content: document.querySelector('.inventory-ledger').scrollWidth, controls: document.querySelector('.purchase-controls').scrollWidth, controlsWidth: document.querySelector('.purchase-controls').clientWidth, quantityWidth: document.querySelector('.quantity-input').getBoundingClientRect().width })`);
  const narrowLayout = JSON.parse(narrow);
  assert.ok(narrowLayout.content <= narrowLayout.page && narrowLayout.controls <= narrowLayout.controlsWidth, `Page VIII purchase controls must reflow at 320 CSS px: ${narrow}`);
  assert.ok(narrowLayout.quantityWidth <= 110, `Quantity should stay compact at 320 CSS px: ${narrow}`);
  await evaluate(`(() => { const style = document.createElement('style'); style.id = 'text-spacing-check'; style.textContent = 'p,li,label,summary { line-height: 1.5 !important; margin-bottom: 2em !important; letter-spacing: .12em !important; word-spacing: .16em !important; }'; document.head.append(style); })()`);
  const spaced = await evaluate(`JSON.stringify({ page: document.querySelector('.inventory-ledger').clientWidth, content: document.querySelector('.inventory-ledger').scrollWidth })`);
  assert.ok(JSON.parse(spaced).content <= JSON.parse(spaced).page, `Page VIII must reflow with WCAG text-spacing overrides: ${spaced}`);
  await call("Emulation.clearDeviceMetricsOverride");
  socket.close();
  console.log("axe-core WCAG 2.2 A/AA checks passed; Half Plate coverage, price, ENC, keyboard selection, override, and 320px reflow passed alongside the Page VIII purchase and inventory checks.");
} finally {
  for (const child of [browser, preview]) { try { globalThis.process.kill(-child.pid, "SIGTERM"); } catch {} }
  await Promise.all([browser, preview].map(child => new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    const timeout = setTimeout(() => { try { globalThis.process.kill(-child.pid, "SIGKILL"); } catch {} resolve(); }, 2000);
    child.once("exit", () => { clearTimeout(timeout); resolve(); });
  })));
  await fs.rm(profile, { recursive: true, force: true });
}
