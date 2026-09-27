import { CHAR_ROLL, COMBAT_STYLE, MAGIC, PROFESSIONAL, STANDARD, type Chars, type Stat, type Term } from "./rules";

export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const d = (n: number) => 1 + Math.floor(Math.random() * n);

export function roll(expr: string): number {
  const m = /^(\d+)d(\d+)(?:\+(\d+))?$/.exec(expr)!;
  return sum(Array.from({ length: +m[1] }, () => d(+m[2]))) + (+m[3] || 0);
}
export const rollStat = (k: Stat) => roll(CHAR_ROLL[k]);

export const baseName = (n: string) => n.trim().replace(/\s*\(.*\)$/, "").trim();

export function formulaVal(f: Term[], c: Chars): number {
  return sum(f.map(t => typeof t === "number" ? t : Array.isArray(t) ? c[t[0]] * t[1] : c[t]));
}

export function skillDef(name: string, combatStyles: readonly string[] = []): { f: Term[]; pro: boolean } {
  const b = baseName(name);
  const s = STANDARD.find(x => x[0] === b), p = PROFESSIONAL.find(x => x[0] === b), m = MAGIC.find(x => x[0] === b);
  if (s) return { f: s[1], pro: false };
  if (p || m) return { f: (p ?? m)![1], pro: true };
  if (b === COMBAT_STYLE[0] || combatStyles.includes(name.trim())) return { f: COMBAT_STYLE[1], pro: true };
  throw new Error(`Unknown skill "${name}". Use a registered skill or a specialisation of one.`);
}

export function dmgMod(v: number): string {
  const t: [number, string][] = [[6, "-1d8"], [8, "-1d6"], [10, "-1d4"], [12, "-1d2"], [16, "+0"], [20, "+1d2"],
    [25, "+1d4"], [30, "+1d6"], [35, "+1d8"], [40, "+1d10"], [45, "+1d12"], [50, "+2d6"]];
  return t.find(([max]) => v <= max)?.[1] ?? `+${2 + Math.ceil((v - 50) / 5)}d6`;
}

export interface HitLocation { name: string; roll: string; hp: number }
export function deriveStats(c: Chars) {
  const up6 = (v: number) => Math.ceil(v / 6);
  const b = Math.max(1, Math.ceil((c.CON + c.SIZ) / 5)), arm = Math.max(1, b - 1);
  const loc: HitLocation[] = [
    { name: "Right Leg", roll: "1-3", hp: b }, { name: "Left Leg", roll: "4-6", hp: b },
    { name: "Abdomen", roll: "7-9", hp: b + 1 }, { name: "Chest", roll: "10-12", hp: b + 2 },
    { name: "Right Arm", roll: "13-15", hp: arm }, { name: "Left Arm", roll: "16-18", hp: arm },
    { name: "Head", roll: "19-20", hp: b },
  ];
  const stats: [string, string | number][] = [
    ["Action Points", Math.ceil((c.INT + c.DEX) / 12)], ["Damage Modifier", dmgMod(c.STR + c.SIZ)],
    ["Experience Mod", up6(c.CHA) - 2], ["Healing Rate", up6(c.CON)],
    ["Initiative", Math.ceil((c.INT + c.DEX) / 2)], ["Luck Points", up6(c.POW)],
    ["Magic Points", c.POW], ["Movement", "8m"],
  ];
  return { stats, loc };
}
