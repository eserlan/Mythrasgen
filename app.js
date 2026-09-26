"use strict";
const R = window.RULES, C = window.CONTENT;
const STEPS = ["Concept", "Characteristics", "Culture", "Career", "Bonus Skills", "Sheet"];
const KEY = "mythresgen.v1";
const blank = () => ({ name: "", chars: Object.fromEntries(R.chars.map(k => [k, 10])), method: "roll",
  culture: 0, career: 0, alloc: { culture: {}, career: {}, bonus: {} }, extras: [], step: 0 });
let S = load() || blank();

function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sum = a => a.reduce((x, y) => x + y, 0);

// ---- dice
const d = n => 1 + Math.floor(Math.random() * n);
function roll(expr) {
  const m = /^(\d+)d(\d+)(?:\+(\d+))?$/.exec(expr);
  return sum(Array.from({ length: +m[1] }, () => d(+m[2]))) + (+m[3] || 0);
}

// ---- derived values
const cul = () => C.cultures[S.culture], car = () => C.careers[S.career];
const baseName = n => n.replace(/\s*\(.*\)$/, "");
function formulaVal(f) {
  return sum(f.map(t => typeof t === "number" ? t : Array.isArray(t) ? S.chars[t[0]] * t[1] : S.chars[t]));
}
function skillDef(name) {
  const b = baseName(name);
  const s = R.standard.find(x => x[0] === b), p = R.professional.find(x => x[0] === b);
  return s ? { f: s[1], pro: false } : p ? { f: p[1], pro: true } : { f: R.combatStyleFormula, pro: true };
}
const base = name => formulaVal(skillDef(name).f);
const added = name => sum(["culture", "career", "bonus"].map(k => S.alloc[k][name] || 0));
const total = name => base(name) + added(name);
const isStyle = n => C.cultures.some(c => c.combatStyle === n);

function dmgMod(v) {
  if (v <= 6) return "-1d8"; if (v <= 8) return "-1d6"; if (v <= 10) return "-1d4"; if (v <= 12) return "-1d2";
  if (v <= 16) return "+0"; if (v <= 20) return "+1d2"; if (v <= 25) return "+1d4"; if (v <= 30) return "+1d6";
  if (v <= 35) return "+1d8"; if (v <= 40) return "+1d10"; if (v <= 45) return "+1d12"; if (v <= 50) return "+2d6";
  return "+" + (2 + Math.ceil((v - 50) / 5)) + "d6";
}
function derived() {
  const c = S.chars, up6 = v => Math.ceil(v / 6);
  const b = Math.max(1, Math.ceil((c.CON + c.SIZ) / 5));
  const loc = [["Right Leg", "1-3", b], ["Left Leg", "4-6", b], ["Abdomen", "7-9", b + 1], ["Chest", "10-12", b + 2],
    ["Right Arm", "13-15", Math.max(1, b - 1)], ["Left Arm", "16-18", Math.max(1, b - 1)], ["Head", "19-20", b]];
  return {
    "Action Points": Math.ceil((c.INT + c.DEX) / 12), "Damage Modifier": dmgMod(c.STR + c.SIZ),
    "Experience Mod": up6(c.CHA) - 2,
    "Healing Rate": up6(c.CON), "Initiative": Math.ceil((c.INT + c.DEX) / 2),
    "Luck Points": up6(c.POW), "Magic Points": c.POW, "Movement": "8m", loc,
  };
}

// ---- skill lists per step
function stepSkills(kind) {
  if (kind === "culture") return [...new Set([...cul().standard, cul().combatStyle, ...cul().professional])];
  if (kind === "career") return [...new Set([...car().standard, ...car().professional])];
  return allSkills();
}
function allSkills() {
  const names = [...R.standard.map(s => s[0]), cul().combatStyle,
    ...cul().professional, ...car().professional, ...S.extras,
    ...["culture", "career", "bonus"].flatMap(k => Object.keys(S.alloc[k]))];
  return [...new Set(names)];
}

// ---- views
const NEXT_HINT = ["Pick a culture and career", "Roll or set your characteristics", "Spend culture points", "Spend career points", "Spend bonus points", ""];
function render() {
  $("#steps").innerHTML = STEPS.map((s, i) => `<button data-step="${i}" class="step ${i === S.step ? "on" : ""} ${i < S.step ? "done" : ""}">
    <i>${i < S.step ? "✓" : i + 1}</i><span>${s}</span></button>`).join("");
  const views = [vConcept, vChars, () => vSkills("culture"), () => vSkills("career"), () => vSkills("bonus"), vSheet];
  $("#main").innerHTML = views[S.step]() + `<div class="pager noprint">
    ${S.step > 0 ? `<button data-step="${S.step - 1}">← ${STEPS[S.step - 1]}</button>` : "<span></span>"}
    ${S.step < 5 ? `<button class="primary" data-step="${S.step + 1}">${STEPS[S.step + 1]} →</button>` : ""}</div>`;
  persist();
  scrollTo(0, 0);
}
const field = (label, inner) => `<label class="field"><span>${label}</span>${inner}</label>`;
const chips = (l, cls = "") => l.map(x => `<span class="chip ${cls}">${esc(x)}</span>`).join("");
const opts = (list, sel) => list.map((c, i) => `<option value="${i}" ${i === sel ? "selected" : ""}>${esc(c.name)}</option>`).join("");
function vConcept() {
  const cu = cul(), ca = car();
  return `<h2>Who are you?</h2>
  <div class="card">${field("Name", `<input id="name" value="${esc(S.name)}" placeholder="Name your character">`)}</div>
  <div class="two">
    <div class="card"><h3>Culture</h3>${field("Choose", `<select id="culture">${opts(C.cultures, S.culture)}</select>`)}
      <p class="label">Combat style</p><p>${chips([cu.combatStyle], "acc")}</p>
      <p class="label">Skills</p><p>${chips([...cu.standard, ...cu.professional])}</p></div>
    <div class="card"><h3>Career</h3>${field("Choose", `<select id="career">${opts(C.careers, S.career)}</select>`)}
      <p class="label">Skills</p><p>${chips([...ca.standard, ...ca.professional])}</p></div>
  </div>
  <p class="mute">Add your own cultures and careers in <code>data/content.js</code>.</p>`;
}
function vChars() {
  const left = R.pointBuy - sum(R.chars.map(k => S.chars[k]));
  return `<h2>Characteristics</h2>
  <div class="card bar"><button class="primary" data-act="roll">🎲 Roll all</button>
    <span class="mute">Or adjust by hand. Point-buy budget (${R.pointBuy}, ${R.pointBuyMin}–${R.pointBuyMax} each):</span>
    <span class="pill ${left < 0 ? "over" : left === 0 ? "ok" : ""}">${left} left</span></div>
  <div class="chars">${R.chars.map(k => `<div class="char"><small>${k}</small>
    <div class="stepper"><button data-act="chdec" data-k="${k}" aria-label="decrease ${k}">−</button>
    <input type="number" data-char="${k}" value="${S.chars[k]}" min="1" max="30">
    <button data-act="chinc" data-k="${k}" aria-label="increase ${k}">+</button></div>
    <button class="ghost" data-act="rollone" data-k="${k}" title="Reroll ${k} (${R.charRoll[k]})">🎲 ${R.charRoll[k]}</button></div>`).join("")}</div>
  <h3>Attributes</h3>${derivedHtml()}`;
}
function derivedHtml() {
  return `<div class="derived">${Object.entries(derived()).filter(([k]) => k !== "loc")
    .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join("")}</div>`;
}
function vSkills(kind) {
  const pool = R.pools[kind], names = stepSkills(kind), a = S.alloc[kind];
  const used = sum(Object.values(a)), left = pool - used, pct = Math.min(100, used / pool * 100);
  const title = { culture: `Culture · ${cul().name}`, career: `Career · ${car().name}`, bonus: "Bonus skills" }[kind];
  return `<h2>${title}</h2>
  <div class="poolbar"><div><b class="${left < 0 ? "over" : ""}">${left}</b> points left <span class="mute">of ${pool} · max +${R.perSkillCap} per skill</span></div>
    <div class="meter"><i style="width:${pct}%" class="${left < 0 ? "over" : ""}"></i></div></div>
  <div class="card skills">${names.map(n => {
    const v = a[n] || 0;
    return `<div class="skill ${v ? "has" : ""}"><div class="nm"><span>${esc(n)}${skillDef(n).pro ? "<em>pro</em>" : ""}</span><small>base ${base(n)}%</small></div>
    <div class="stepper"><button data-act="adj" data-kind="${kind}" data-skill="${esc(n)}" data-d="-1" ${v ? "" : "disabled"}>−</button>
    <input type="number" min="0" max="${R.perSkillCap}" data-skill="${esc(n)}" data-kind="${kind}" value="${v}">
    <button data-act="adj" data-kind="${kind}" data-skill="${esc(n)}" data-d="1" ${v >= R.perSkillCap || left <= 0 ? "disabled" : ""}>+</button></div>
    <div class="tot">${total(n)}%</div></div>`;
  }).join("")}</div>
  ${kind === "bonus" ? `<div class="card bar"><input id="extra" placeholder="Add a skill, e.g. Lore (Astronomy)"><button data-act="addskill">Add</button></div>` : ""}`;
}
function vSheet() {
  const D = derived(), skills = allSkills().sort();
  const std = skills.filter(n => !skillDef(n).pro), pro = skills.filter(n => skillDef(n).pro);
  const tbl = l => `<table>${l.map(n => `<tr><td>${esc(n)}</td><td class="n"><b>${total(n)}%</b></td></tr>`).join("")}</table>`;
  return `<div class="banner"><h1>${esc(S.name || "Unnamed hero")}</h1><p>${esc(cul().name)} · ${esc(car().name)}</p></div>
  <div class="chars sheet">${R.chars.map(k => `<div class="char"><small>${k}</small><b>${S.chars[k]}</b></div>`).join("")}</div>
  ${derivedHtml()}
  <div class="two">
    <div class="card"><h3>Hit locations</h3><table><tr><th>Location</th><th>d20</th><th class="n">HP</th></tr>
    ${D.loc.map(l => `<tr><td>${l[0]}</td><td>${l[1]}</td><td class="n"><b>${l[2]}</b></td></tr>`).join("")}</table></div>
    <div class="card"><h3>Professional &amp; combat</h3>${tbl(pro)}</div>
  </div>
  <div class="card"><h3>Standard skills</h3><div class="cols">${tbl(std)}</div></div>`;
}

// ---- events
document.addEventListener("click", e => {
  const t = e.target.closest("[data-step],[data-act]"); if (!t || t.disabled) return;
  const D = t.dataset, act = D.act, ch = k => S.chars[k];
  if (D.step) S.step = +D.step;
  else if (act === "roll") R.chars.forEach(k => S.chars[k] = roll(R.charRoll[k]));
  else if (act === "rollone") S.chars[D.k] = roll(R.charRoll[D.k]);
  else if (act === "chinc") S.chars[D.k] = Math.min(30, ch(D.k) + 1);
  else if (act === "chdec") S.chars[D.k] = Math.max(1, ch(D.k) - 1);
  else if (act === "adj") {
    const a = S.alloc[D.kind], v = Math.max(0, Math.min(R.perSkillCap, (a[D.skill] || 0) + +D.d));
    if (v) a[D.skill] = v; else delete a[D.skill];
  } else if (act === "addskill") {
    const v = $("#extra").value.trim(); if (v && !S.extras.includes(v)) S.extras.push(v);
  }
  render();
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "name") { S.name = t.value; persist(); return; }
  else if (t.id === "culture" || t.id === "career") { S[t.id] = +t.value; S.alloc[t.id] = {}; }
  else if (t.dataset.char) S.chars[t.dataset.char] = Math.max(1, +t.value || 1);
  else if (t.dataset.skill) {
    const a = S.alloc[t.dataset.kind], v = Math.max(0, Math.min(R.perSkillCap, +t.value || 0));
    if (v) a[t.dataset.skill] = v; else delete a[t.dataset.skill];
  } else return;
  render();
});
const hdr = $("header");
$("#menu").onclick = () => { const o = hdr.classList.toggle("open"); $("#menu").setAttribute("aria-expanded", o); };
$("#tools").addEventListener("click", () => hdr.classList.remove("open"));
$("#save").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }));
  a.download = (S.name || "character") + ".json"; a.click();
};
$("#load").onchange = async e => {
  try { S = Object.assign(blank(), JSON.parse(await e.target.files[0].text())); } catch { alert("Invalid file"); }
  render();
};
$("#print").onclick = () => { S.step = 5; render(); window.print(); };
$("#reset").onclick = () => { if (confirm("Discard this character?")) { S = blank(); render(); } };
render();
