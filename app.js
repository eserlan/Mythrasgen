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
function render() {
  $("#steps").innerHTML = STEPS.map((s, i) => `<button data-step="${i}" class="${i === S.step ? "on" : ""}">${i + 1}. ${s}</button>`).join("");
  $("#main").innerHTML = [vConcept, vChars, v => vSkills("culture"), v => vSkills("career"), v => vSkills("bonus"), vSheet][S.step]();
  persist();
}
function vConcept() {
  return `<h2>Concept</h2><div class="card">
  <div class="row"><label>Name <input id="name" value="${esc(S.name)}"></label></div>
  <div class="row"><label>Culture <select id="culture">${C.cultures.map((c, i) => `<option value="${i}" ${i === S.culture ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
  <label>Career <select id="career">${C.careers.map((c, i) => `<option value="${i}" ${i === S.career ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label></div>
  <p class="mute">Add your own cultures and careers in <code>data/content.js</code>.</p></div>`;
}
function vChars() {
  const spent = sum(R.chars.map(k => S.chars[k])), left = R.pointBuy - spent;
  return `<h2>Characteristics</h2><div class="card">
  <div class="row"><button data-act="roll">Roll all (3d6 / 2d6+6)</button>
  <span class="mute">or enter values by hand / point-buy (${R.pointBuy} points, ${R.pointBuyMin}–${R.pointBuyMax}):</span>
  <span class="pool ${left < 0 ? "over" : ""}">Point-buy left: ${left}</span></div>
  <div class="grid">${R.chars.map(k => `<div class="stat card"><label>${k}<b>${S.chars[k]}</b>
    <input type="number" data-char="${k}" value="${S.chars[k]}" min="1" max="30"></label>
    <button data-act="rollone" data-k="${k}">🎲</button></div>`).join("")}</div>
  ${derivedHtml()}</div>`;
}
function derivedHtml() {
  const D = derived();
  return `<h3>Attributes</h3><div class="grid">${Object.entries(D).filter(([k]) => k !== "loc")
    .map(([k, v]) => `<div class="stat card">${k}<b>${v}</b></div>`).join("")}</div>`;
}
function vSkills(kind) {
  const pool = R.pools[kind], names = stepSkills(kind), a = S.alloc[kind];
  const used = sum(Object.values(a)), left = pool - used;
  const title = { culture: `Culture: ${cul().name}`, career: `Career: ${car().name}`, bonus: "Bonus Skills" }[kind];
  return `<h2>${title}</h2><div class="card">
  <p class="pool ${left < 0 ? "over" : ""}">Points left: ${left} / ${pool} <span class="mute">(max +${R.perSkillCap} per skill in this step)</span></p>
  <table><tr><th>Skill</th><th class="n">Base</th><th class="n">This step</th><th class="n">Total</th></tr>
  ${names.map(n => `<tr><td>${esc(n)}${skillDef(n).pro ? " <span class='mute'>(pro)</span>" : ""}</td><td class="n">${base(n)}%</td>
  <td class="n"><input type="number" min="0" max="${R.perSkillCap}" data-skill="${esc(n)}" data-kind="${kind}" value="${a[n] || 0}"></td>
  <td class="n"><b>${total(n)}%</b></td></tr>`).join("")}</table>
  ${kind === "bonus" ? `<div class="row"><input id="extra" placeholder="e.g. Lore (Astronomy)"><button data-act="addskill">Add skill</button></div>` : ""}</div>`;
}
function vSheet() {
  const D = derived(), skills = allSkills().sort();
  const std = skills.filter(n => !skillDef(n).pro), pro = skills.filter(n => skillDef(n).pro);
  const tbl = l => `<table>${l.map(n => `<tr><td>${esc(n)}</td><td class="n">${total(n)}%</td></tr>`).join("")}</table>`;
  return `<h2>${esc(S.name || "Unnamed")} <span class="mute">— ${esc(cul().name)} ${esc(car().name)}</span></h2>
  <div class="card"><div class="grid">${R.chars.map(k => `<div class="stat">${k}<b>${S.chars[k]}</b></div>`).join("")}</div></div>
  <div class="card">${derivedHtml()}</div>
  <div class="card"><h3>Hit Locations</h3><table><tr><th>Location</th><th>d20</th><th class="n">HP</th></tr>
  ${D.loc.map(l => `<tr><td>${l[0]}</td><td>${l[1]}</td><td class="n">${l[2]}</td></tr>`).join("")}</table></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
  <div class="card"><h3>Standard Skills</h3>${tbl(std)}</div><div class="card"><h3>Professional &amp; Combat</h3>${tbl(pro)}</div></div>`;
}

// ---- events
document.addEventListener("click", e => {
  const t = e.target.closest("[data-step],[data-act]"); if (!t) return;
  if (t.dataset.step) S.step = +t.dataset.step;
  else if (t.dataset.act === "roll") R.chars.forEach(k => S.chars[k] = roll(R.charRoll[k]));
  else if (t.dataset.act === "rollone") S.chars[t.dataset.k] = roll(R.charRoll[t.dataset.k]);
  else if (t.dataset.act === "addskill") {
    const v = $("#extra").value.trim(); if (v && !S.extras.includes(v)) S.extras.push(v);
  }
  render();
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "name") S.name = t.value;
  else if (t.id === "culture" || t.id === "career") { S[t.id] = +t.value; S.alloc[t.id] = {}; }
  else if (t.dataset.char) S.chars[t.dataset.char] = Math.max(1, +t.value || 1);
  else if (t.dataset.skill) {
    const a = S.alloc[t.dataset.kind], v = Math.max(0, Math.min(R.perSkillCap, +t.value || 0));
    if (v) a[t.dataset.skill] = v; else delete a[t.dataset.skill];
  } else return;
  render();
});
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
