import React, { useMemo, useState } from "react";

// ==========================
// Legends Z‑A STAB Coverage Calculator — Clean UI
// - STAB-only offense/defense
// - Mega as time-weighted uptime u in [0,1]
// - Snapshots: Base, Peak, and Time‑weighted
// - Oddities: Freeze‑Dry, Flying Press, Thousand Arrows
// - Readability upgrades: summary cards, tabs, sorting, progress bars, hide empty slots
// ==========================

// --- Types ---
const TYPES = [
  "Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison",
  "Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"
] as const;
export type PokeType = typeof TYPES[number];

// --- Standard type chart (ATTACKER -> DEFENDER) ---
const CHART: Record<PokeType, Record<PokeType, number>> = {
  Normal: { Normal:1, Fire:1, Water:1, Electric:1, Grass:1, Ice:1, Fighting:1, Poison:1, Ground:1, Flying:1, Psychic:1, Bug:1, Rock:0.5, Ghost:0, Dragon:1, Dark:1, Steel:0.5, Fairy:1 },
  Fire:   { Normal:1, Fire:0.5, Water:0.5, Electric:1, Grass:2, Ice:2, Fighting:1, Poison:1, Ground:1, Flying:1, Psychic:1, Bug:2, Rock:0.5, Ghost:1, Dragon:0.5, Dark:1, Steel:2, Fairy:1 },
  Water:  { Normal:1, Fire:2, Water:0.5, Electric:1, Grass:0.5, Ice:1, Fighting:1, Poison:1, Ground:2, Flying:1, Psychic:1, Bug:1, Rock:2, Ghost:1, Dragon:0.5, Dark:1, Steel:1, Fairy:1 },
  Electric:{ Normal:1, Fire:1, Water:2, Electric:0.5, Grass:0.5, Ice:1, Fighting:1, Poison:1, Ground:0, Flying:2, Psychic:1, Bug:1, Rock:1, Ghost:1, Dragon:0.5, Dark:1, Steel:1, Fairy:1 },
  Grass:  { Normal:1, Fire:0.5, Water:2, Electric:1, Grass:0.5, Ice:1, Fighting:1, Poison:0.5, Ground:2, Flying:0.5, Psychic:1, Bug:0.5, Rock:2, Ghost:1, Dragon:0.5, Dark:1, Steel:0.5, Fairy:1 },
  Ice:    { Normal:1, Fire:0.5, Water:0.5, Electric:1, Grass:2, Ice:0.5, Fighting:1, Poison:1, Ground:2, Flying:2, Psychic:1, Bug:1, Rock:1, Ghost:1, Dragon:2, Dark:1, Steel:0.5, Fairy:1 },
  Fighting:{ Normal:2, Fire:1, Water:1, Electric:1, Grass:1, Ice:2, Fighting:1, Poison:0.5, Ground:1, Flying:0.5, Psychic:0.5, Bug:0.5, Rock:2, Ghost:0, Dragon:1, Dark:2, Steel:2, Fairy:0.5 },
  Poison: { Normal:1, Fire:1, Water:1, Electric:1, Grass:2, Ice:1, Fighting:1, Poison:0.5, Ground:0.5, Flying:1, Psychic:1, Bug:1, Rock:0.5, Ghost:0.5, Dragon:1, Dark:1, Steel:0, Fairy:2 },
  Ground: { Normal:1, Fire:2, Water:1, Electric:2, Grass:0.5, Ice:1, Fighting:1, Poison:2, Ground:1, Flying:0, Psychic:1, Bug:0.5, Rock:2, Ghost:1, Dragon:1, Dark:1, Steel:2, Fairy:1 },
  Flying: { Normal:1, Fire:1, Water:1, Electric:0.5, Grass:2, Ice:1, Fighting:2, Poison:1, Ground:1, Flying:1, Psychic:1, Bug:2, Rock:0.5, Ghost:1, Dragon:1, Dark:1, Steel:0.5, Fairy:1 },
  Psychic:{ Normal:1, Fire:1, Water:1, Electric:1, Grass:1, Ice:1, Fighting:2, Poison:2, Ground:1, Flying:1, Psychic:0.5, Bug:1, Rock:1, Ghost:1, Dragon:1, Dark:0, Steel:0.5, Fairy:1 },
  Bug:    { Normal:1, Fire:0.5, Water:1, Electric:1, Grass:2, Ice:1, Fighting:0.5, Poison:0.5, Ground:1, Flying:0.5, Psychic:2, Bug:1, Rock:1, Ghost:0.5, Dragon:1, Dark:2, Steel:0.5, Fairy:0.5 },
  Rock:   { Normal:1, Fire:2, Water:1, Electric:1, Grass:1, Ice:2, Fighting:0.5, Poison:1, Ground:0.5, Flying:2, Psychic:1, Bug:2, Rock:1, Ghost:1, Dragon:1, Dark:1, Steel:0.5, Fairy:1 },
  Ghost:  { Normal:0, Fire:1, Water:1, Electric:1, Grass:1, Ice:1, Fighting:1, Poison:1, Ground:1, Flying:1, Psychic:2, Bug:1, Rock:1, Ghost:2, Dragon:1, Dark:0.5, Steel:1, Fairy:1 },
  Dragon: { Normal:1, Fire:1, Water:1, Electric:1, Grass:1, Ice:1, Fighting:1, Poison:1, Ground:1, Flying:1, Psychic:1, Bug:1, Rock:1, Ghost:1, Dragon:2, Dark:1, Steel:0.5, Fairy:0 },
  Dark:   { Normal:1, Fire:1, Water:1, Electric:1, Grass:1, Ice:1, Fighting:0.5, Poison:1, Ground:1, Flying:1, Psychic:2, Bug:1, Rock:1, Ghost:2, Dragon:1, Dark:0.5, Steel:1, Fairy:0.5 },
  Steel:  { Normal:1, Fire:0.5, Water:0.5, Electric:0.5, Grass:1, Ice:2, Fighting:1, Poison:1, Ground:1, Flying:1, Psychic:1, Bug:1, Rock:2, Ghost:1, Dragon:1, Dark:1, Steel:0.5, Fairy:2 },
  Fairy:  { Normal:1, Fire:0.5, Water:1, Electric:1, Grass:1, Ice:1, Fighting:2, Poison:0.5, Ground:1, Flying:1, Psychic:1, Bug:1, Rock:1, Ghost:1, Dragon:2, Dark:2, Steel:0.5 }
};

// --- Target sets ---
const MONOS: PokeType[] = [...TYPES];
const DUALS: [PokeType, PokeType][] = (() => {
  const res: [PokeType, PokeType][] = [];
  for (let i = 0; i < TYPES.length; i++) for (let j = i + 1; j < TYPES.length; j++) res.push([TYPES[i], TYPES[j]]);
  return res;
})();

// --- Helpers ---
function bucketFromMultiplier(m: number): "4x"|"2x"|"1x"|"0.5x"|"0x" { if (m === 0) return "0x"; if (m >= 3.99) return "4x"; if (m >= 1.99) return "2x"; if (m <= 0.51 && m > 0) return "0.5x"; return "1x"; }
function offensiveMultiplier(atk: PokeType, target: PokeType[], opts: { freezeDry?: boolean; thousandArrows?: boolean }): number {
  const [t1, t2] = [target[0], target[1] ?? null];
  const m1 = (() => { if (atk === "Ice" && opts.freezeDry && (t1 === "Water" || t2 === "Water")) return 2; if (atk === "Ground" && opts.thousandArrows && t1 === "Flying") return 1; return CHART[atk][t1]; })();
  const m2 = t2 ? (() => { if (atk === "Ice" && opts.freezeDry && (t1 === "Water" || t2 === "Water") && t2 === "Water") return 2; if (atk === "Ground" && opts.thousandArrows && t2 === "Flying") return 1; return CHART[atk][t2]; })() : 1; return m1 * m2; }
function flyingPressMultiplier(target: PokeType[]): number { const [t1, t2] = [target[0], target[1] ?? null]; const f1 = CHART["Fighting"][t1]; const fl1 = CHART["Flying"][t1]; const f2 = t2 ? CHART["Fighting"][t2] : 1; const fl2 = t2 ? CHART["Flying"][t2] : 1; return f1 * fl1 * f2 * fl2; }
function stateTypesToArray(st: { a: PokeType | ""; b: PokeType | "" } | undefined): PokeType[] { if (!st) return []; const arr: PokeType[] = []; if (st.a && TYPES.includes(st.a as PokeType)) arr.push(st.a as PokeType); if (st.b && TYPES.includes(st.b as PokeType) && st.b !== st.a) arr.push(st.b as PokeType); return arr; }
function slotHitsSE(stabTypes: PokeType[], target: PokeType[], odd: { freezeDry: boolean; flyingPress: boolean; thousandArrows: boolean }): boolean {
  for (const atk of stabTypes) { const mult = offensiveMultiplier(atk, target, { freezeDry: odd.freezeDry && atk === "Ice", thousandArrows: odd.thousandArrows && atk === "Ground" }); if (mult >= 2) return true; if (odd.flyingPress && atk === "Fighting") { const mFP = flyingPressMultiplier(target); if (mFP >= 2) return true; } } return false; }
function weightedTeamSE(team: TeamSlot[], target: PokeType[], odd: { freezeDry: boolean; flyingPress: boolean; thousandArrows: boolean }): number {
  const pMissProducts = team.map(slot => { const baseStab = stateTypesToArray(slot.base); const megaStab = stateTypesToArray(slot.mega); const u = slot.mega && megaStab.length > 0 ? Math.min(Math.max(slot.u, 0), 1) : 0; const baseHit = baseStab.length > 0 && slotHitsSE(baseStab, target, odd); const megaHit = megaStab.length > 0 && slotHitsSE(megaStab, target, odd); const p_i = (1 - u) * (baseHit ? 1 : 0) + u * (megaHit ? 1 : 0); return 1 - p_i; }).reduce((acc, v) => acc * v, 1); return 1 - pMissProducts; }
function snapshotTeamSE(team: TeamSlot[], target: PokeType[], odd: { freezeDry: boolean; flyingPress: boolean; thousandArrows: boolean }, mode: "base" | "peak"): boolean { return team.some(slot => { const stab = stateTypesToArray(mode === "base" ? slot.base : (slot.mega ?? slot.base)); if (stab.length === 0) return false; return slotHitsSE(stab, target, odd); }); }
function defensiveMultiplierForState(attacking: PokeType, defendTypes: PokeType[]): number { const [a, b] = [defendTypes[0], defendTypes[1] ?? null]; const m1 = CHART[attacking][a]; const m2 = b ? CHART[attacking][b] : 1; return m1 * m2; }

// --- Data ---
interface TeamSlot { name: string; base: { a: PokeType | ""; b: PokeType | "" }; mega?: { a: PokeType | ""; b: PokeType | "" }; u: number; }
const DEFAULT_TEAM: TeamSlot[] = [
  { name: "Charizard", base: { a: "Fire", b: "Flying" }, mega: { a: "Fire", b: "Dragon" }, u: 0.4 },
  { name: "Meganium", base: { a: "Grass", b: "" }, mega: { a: "Grass", b: "Fairy" }, u: 0.3 },
  { name: "", base: { a: "", b: "" }, mega: undefined, u: 0 },
  { name: "", base: { a: "", b: "" }, mega: undefined, u: 0 },
  { name: "", base: { a: "", b: "" }, mega: undefined, u: 0 },
  { name: "", base: { a: "", b: "" }, mega: undefined, u: 0 },
];

// ---------- Small UI pieces ----------
function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good"|"bad"|"neutral" }) {
  const cls = tone === "good" ? "bg-emerald-100 text-emerald-800" : tone === "bad" ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-800";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}
function TypeBadge({ t }: { t: PokeType }) { return <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold shadow-sm">{t}</span>; }
function SelectType({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (<select className="w-full rounded-lg border px-2 py-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{placeholder ?? "—"}</option>{TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}</select>);
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return (<div className="rounded-2xl border p-4 shadow-sm"><h2 className="mb-3 text-lg font-bold">{title}</h2>{children}</div>); }
function Progress({ value }: { value: number }) { const pct = Math.max(0, Math.min(100, value * 100)); return (<div className="h-2 w-full rounded-full bg-gray-200"><div className="h-2 rounded-full" style={{ width: `${pct}%` }} /></div>); }
function percent(n: number): string { return `${(n * 100).toFixed(1)}%`; } function fmt1(n: number): string { return n.toFixed(1); }

export default function CoverageCalculatorZA() {
  const [team, setTeam] = useState<TeamSlot[]>(DEFAULT_TEAM);
  const [oddFreezeDry, setOddFreezeDry] = useState(true);
  const [oddFlyingPress, setOddFlyingPress] = useState(true);
  const [oddThousandArrows, setOddThousandArrows] = useState(true);
  const [tab, setTab] = useState<"offense" | "defense" | "redundancy">("offense");
  const [hideEmptySlots, setHideEmptySlots] = useState(true);
  const [sortMonosByWorst, setSortMonosByWorst] = useState(true);
  const [sortDefenseByRisk, setSortDefenseByRisk] = useState(true);

  const odd = useMemo(() => ({ freezeDry: oddFreezeDry, flyingPress: oddFlyingPress, thousandArrows: oddThousandArrows }), [oddFreezeDry, oddFlyingPress, oddThousandArrows]);

  // Derived offense arrays
  const offMonoBase = useMemo(() => MONOS.map(t => snapshotTeamSE(team, [t], odd, "base")), [team, odd]);
  const offMonoPeak = useMemo(() => MONOS.map(t => snapshotTeamSE(team, [t], odd, "peak")), [team, odd]);
  const offMonoWeighted = useMemo(() => MONOS.map(t => weightedTeamSE(team, [t], odd)), [team, odd]);
  const offDualBase = useMemo(() => DUALS.map(pair => snapshotTeamSE(team, pair as PokeType[], odd, "base")), [team, odd]);
  const offDualPeak = useMemo(() => DUALS.map(pair => snapshotTeamSE(team, pair as PokeType[], odd, "peak")), [team, odd]);
  const offDualWeighted = useMemo(() => DUALS.map(pair => weightedTeamSE(team, pair as PokeType[], odd)), [team, odd]);

  // Summaries
  const monoBasePct = useMemo(() => offMonoBase.filter(Boolean).length / MONOS.length, [offMonoBase]);
  const monoPeakPct = useMemo(() => offMonoPeak.filter(Boolean).length / MONOS.length, [offMonoPeak]);
  const monoWeightedAvg = useMemo(() => offMonoWeighted.reduce((a,b)=>a+b,0) / MONOS.length, [offMonoWeighted]);
  const dualBasePct = useMemo(() => offDualBase.filter(Boolean).length / DUALS.length, [offDualBase]);
  const dualPeakPct = useMemo(() => offDualPeak.filter(Boolean).length / DUALS.length, [offDualPeak]);
  const dualWeightedAvg = useMemo(() => offDualWeighted.reduce((a,b)=>a+b,0) / DUALS.length, [offDualWeighted]);

  // Holes / worst
  const monoBaseHoles = useMemo(() => MONOS.filter((_,i)=>!offMonoBase[i]), [offMonoBase]);
  const monoPeakHoles = useMemo(() => MONOS.filter((_,i)=>!offMonoPeak[i]), [offMonoPeak]);
  const dualWorstWeighted = useMemo(() => DUALS.map((pair, i) => ({ pair, p: offDualWeighted[i] })).sort((a,b)=>a.p-b.p).slice(0, 12), [offDualWeighted]);

  // Defense
  const defense = useMemo(() => {
    type Buckets = { "4x": number; "2x": number; "1x": number; "0.5x": number; "0x": number };
    const perType: Record<PokeType, { base: Buckets; peak: Buckets; weighted: Buckets; noSafeProb: number; sharedWeakExp: number }> = {} as any;
    for (const atk of TYPES) {
      const base: Buckets = { "4x":0, "2x":0, "1x":0, "0.5x":0, "0x":0 };
      const peak: Buckets = { "4x":0, "2x":0, "1x":0, "0.5x":0, "0x":0 };
      let w: Buckets = { "4x":0, "2x":0, "1x":0, "0.5x":0, "0x":0 };
      let noSafeProduct = 1; let sharedWeakExp = 0;
      for (const slot of team) {
        const baseTypes = stateTypesToArray(slot.base);
        const megaTypes = stateTypesToArray(slot.mega);
        const hasMega = megaTypes.length > 0; const u = hasMega ? Math.min(Math.max(slot.u, 0), 1) : 0;
        const mBase = baseTypes.length ? defensiveMultiplierForState(atk, baseTypes) : 1;
        const mPeak = (hasMega ? defensiveMultiplierForState(atk, megaTypes) : mBase);
        base[bucketFromMultiplier(mBase)]++; peak[bucketFromMultiplier(mPeak)]++;
        (w as any)[bucketFromMultiplier(mBase)] += (1 - u); (w as any)[bucketFromMultiplier(mPeak)] += u;
        const safeBase = (mBase === 0 || mBase <= 0.5) ? 1 : 0; const safeMega = (mPeak === 0 || mPeak <= 0.5) ? 1 : 0;
        const pSafe = (1 - u) * safeBase + u * safeMega; noSafeProduct *= (1 - pSafe);
        sharedWeakExp += (1 - u) * (mBase >= 2 ? 1 : 0) + u * (mPeak >= 2 ? 1 : 0);
      }
      perType[atk] = { base, peak, weighted: w, noSafeProb: noSafeProduct, sharedWeakExp };
    }
    return perType;
  }, [team]);

  // Redundancy (Base/Peak) per monotype
  const redundancy = useMemo(() => {
    function countDistinctHitters(mode: "base" | "peak") {
      const perTarget: Record<string, number> = {};
      for (const t of MONOS) {
        const target = [t]; const hitters = new Set<PokeType | "Fighting(FP)">();
        for (const slot of team) {
          const stab = stateTypesToArray(mode === "base" ? slot.base : (slot.mega ?? slot.base));
          for (const atk of stab) {
            const mult = offensiveMultiplier(atk, target, { freezeDry: odd.freezeDry && atk === "Ice", thousandArrows: odd.thousandArrows && atk === "Ground" });
            if (mult >= 2) hitters.add(atk);
            if (odd.flyingPress && atk === "Fighting") { const mFP = flyingPressMultiplier(target); if (mFP >= 2) hitters.add("Fighting(FP)"); }
          }
        }
        perTarget[t] = hitters.size;
      }
      return perTarget;
    }
    return { base: countDistinctHitters("base"), peak: countDistinctHitters("peak") };
  }, [team, odd]);

  // --- UI helpers ---
  function updateSlot(idx: number, updater: (s: TeamSlot) => TeamSlot) { setTeam(prev => prev.map((s, i) => i === idx ? updater({ ...s }) : s)); }
  function clearSlot(idx: number) { updateSlot(idx, _ => ({ name: "", base: { a: "", b: "" }, mega: undefined, u: 0 })); }
  const visibleIndices = hideEmptySlots ? team.map((s, i) => ({ s, i })).filter(({ s }) => s.name || s.base.a || s.base.b || s.mega?.a || s.mega?.b).map(({ i }) => i) : team.map((_, i) => i);
  const canAdd = team.some(s => !(s.name || s.base.a || s.base.b || s.mega?.a || s.mega?.b));
  function addSlot() { const idx = team.findIndex(s => !(s.name || s.base.a || s.base.b || s.mega?.a || s.mega?.b)); if (idx >= 0) updateSlot(idx, s => ({ ...s, name: `Slot ${idx + 1}` })); }

  function SummaryStrip() {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border p-3">
          <div className="text-sm font-semibold">Base snapshot</div>
          <div className="text-sm">Monotypes: <span className="font-mono">{offMonoBase.filter(Boolean).length}/{MONOS.length}</span> ({percent(monoBasePct)})</div>
          <div className="text-sm">Duals: <span className="font-mono">{offDualBase.filter(Boolean).length}/{DUALS.length}</span> ({percent(dualBasePct)})</div>
          {monoBaseHoles.length > 0 && <div className="mt-1 text-[11px] text-gray-600">Base holes: {monoBaseHoles.map(t => t).join(", ")}</div>}
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-sm font-semibold">Peak snapshot</div>
          <div className="text-sm">Monotypes: <span className="font-mono">{offMonoPeak.filter(Boolean).length}/{MONOS.length}</span> ({percent(monoPeakPct)})</div>
          <div className="text-sm">Duals: <span className="font-mono">{offDualPeak.filter(Boolean).length}/{DUALS.length}</span> ({percent(dualPeakPct)})</div>
          {monoPeakHoles.length > 0 && <div className="mt-1 text-[11px] text-gray-600">Peak holes: {monoPeakHoles.map(t => t).join(", ")}</div>}
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-sm font-semibold">Time‑weighted</div>
          <div className="text-sm">Monos avg P(SE): <span className="font-mono">{percent(monoWeightedAvg)}</span></div>
          <div className="text-sm">Duals avg P(SE): <span className="font-mono">{percent(dualWeightedAvg)}</span></div>
          <div className="mt-2 text-[11px] text-gray-600">Worst duals: {dualWorstWeighted.map(({pair}) => `${pair[0]}/${pair[1]}`).join(", ")}</div>
        </div>
      </div>
    );
  }

  function TeamEditor() {
    return (
      <Section title="Team (up to 6)">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={hideEmptySlots} onChange={(e)=>setHideEmptySlots(e.target.checked)} /> Hide empty slots</label>
          <button className={`rounded-lg border px-3 py-1 text-sm ${canAdd ? "" : "opacity-40 cursor-not-allowed"}`} onClick={addSlot} disabled={!canAdd}>+ Add slot</button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visibleIndices.map((idx) => {
            const slot = team[idx];
            return (
              <div key={idx} className="rounded-xl border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input className="w-full rounded-md border px-2 py-1 text-sm" placeholder={`Slot ${idx+1} name (optional)`} value={slot.name} onChange={(e)=>updateSlot(idx, s=>({ ...s, name: e.target.value }))} />
                  <button className="rounded-md border px-2 py-1 text-xs" onClick={()=>clearSlot(idx)}>Clear</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="mb-1 text-xs font-semibold">Base type A</div>
                    <SelectType value={slot.base.a} onChange={(v)=>updateSlot(idx, s=>({ ...s, base: { ...s.base, a: v as any } }))} />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold">Base type B</div>
                    <SelectType value={slot.base.b} onChange={(v)=>updateSlot(idx, s=>({ ...s, base: { ...s.base, b: v as any } }))} />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <div className="mb-1 text-xs font-semibold">Mega type A</div>
                    <SelectType value={slot.mega?.a ?? ""} onChange={(v)=>updateSlot(idx, s=>({ ...s, mega: { ...(s.mega ?? {a:"", b:""}), a: v as any } }))} />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold">Mega type B</div>
                    <SelectType value={slot.mega?.b ?? ""} onChange={(v)=>updateSlot(idx, s=>({ ...s, mega: { ...(s.mega ?? {a:"", b:""}), b: v as any } }))} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-semibold">Mega uptime (weight): <span className="font-mono">{slot.mega && (slot.mega.a || slot.mega.b) ? slot.u.toFixed(2) : "0.00"}</span></label>
                  <input type="range" min={0} max={1} step={0.01} value={slot.mega && (slot.mega.a || slot.mega.b) ? slot.u : 0} onChange={(e)=>updateSlot(idx, s=>({ ...s, u: Math.max(0, Math.min(1, parseFloat(e.target.value))) }))} className="w-full" />
                  <div className="text-[10px] text-gray-500">ZA Mega gauge: 0 = never, 1 = always. Used only if Mega types are set.</div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    );
  }

  function OffensePanel() {
    const indexes = MONOS.map((_, i) => i); if (sortMonosByWorst) indexes.sort((i, j) => offMonoWeighted[i] - offMonoWeighted[j]);
    return (
      <Section title="Offense — STAB-only (oddities applied)">
        <SummaryStrip />
        <div className="mt-4 mb-2 flex items-center justify-end gap-3 text-sm">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={sortMonosByWorst} onChange={(e)=>setSortMonosByWorst(e.target.checked)} /> Sort monotypes by lowest P(SE)</label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Type</th>
                <th className="px-2 py-1 text-left">Base</th>
                <th className="px-2 py-1 text-left">Peak</th>
                <th className="px-2 py-1 text-left">Weighted P(SE)</th>
              </tr>
            </thead>
            <tbody>
              {indexes.map((i) => {
                const t = MONOS[i]; const w = offMonoWeighted[i];
                return (
                  <tr key={t} className="odd:bg-gray-50">
                    <td className="px-2 py-1"><TypeBadge t={t} /></td>
                    <td className="px-2 py-1"><Pill tone={offMonoBase[i] ? "good" : "bad"}>{offMonoBase[i] ? "✓" : "✗"}</Pill></td>
                    <td className="px-2 py-1"><Pill tone={offMonoPeak[i] ? "good" : "bad"}>{offMonoPeak[i] ? "✓" : "✗"}</Pill></td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-2"><span className="w-16 text-right font-mono">{percent(w)}</span><div className="flex-1"><Progress value={w} /></div></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    );
  }

  function DefensePanel() {
    const order = [...TYPES]; if (sortDefenseByRisk) order.sort((a, b) => defense[b].noSafeProb - defense[a].noSafeProb || defense[b].sharedWeakExp - defense[a].sharedWeakExp);
    const fmtB = (b: any) => `${b["4x"]}/${b["2x"]}/${b["1x"]}/${b["0.5x"]}/${b["0x"]}`;
    const fmtW = (b: any) => `${fmt1(b["4x"])}/${fmt1(b["2x"])}/${fmt1(b["1x"])}/${fmt1(b["0.5x"])}/${fmt1(b["0x"])}`;
    return (
      <Section title="Defense — expected buckets across Mega cycles">
        <div className="mb-2 flex items-center justify-end gap-3 text-sm">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={sortDefenseByRisk} onChange={(e)=>setSortDefenseByRisk(e.target.checked)} /> Sort by highest risk</label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Atk Type</th>
                <th className="px-2 py-1 text-left">Base 4×/2×/1×/½×/0×</th>
                <th className="px-2 py-1 text-left">Peak 4×/2×/1×/½×/0×</th>
                <th className="px-2 py-1 text-left">Weighted (expected)</th>
                <th className="px-2 py-1 text-left">P(no safe)</th>
                <th className="px-2 py-1 text-left">Exp. ≥2× weak</th>
              </tr>
            </thead>
            <tbody>
              {order.map((atk) => {
                const row = defense[atk]; const riskTone = row.noSafeProb > 0.5 ? "bad" : row.noSafeProb < 0.2 ? "good" : "neutral";
                return (
                  <tr key={atk} className="odd:bg-gray-50">
                    <td className="px-2 py-1"><TypeBadge t={atk} /></td>
                    <td className="px-2 py-1 font-mono">{fmtB(row.base)}</td>
                    <td className="px-2 py-1 font-mono">{fmtB(row.peak)}</td>
                    <td className="px-2 py-1 font-mono">{fmtW(row.weighted)}</td>
                    <td className="px-2 py-1"><Pill tone={riskTone}>{percent(row.noSafeProb)}</Pill></td>
                    <td className="px-2 py-1"><Pill tone={row.sharedWeakExp >= 3 ? "bad" : row.sharedWeakExp <= 1 ? "good" : "neutral"}>{fmt1(row.sharedWeakExp)}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    );
  }

  function RedundancyPanel() {
    const baseSorted = Object.entries(redundancy.base).sort((a,b)=>b[1]-a[1]);
    const peakSorted = Object.entries(redundancy.peak).sort((a,b)=>b[1]-a[1]);
    return (
      <Section title="Redundancy — distinct STABs that hit monotypes ≥2×">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-semibold">Base</div>
            <div className="flex flex-wrap gap-1">{baseSorted.map(([t, n]) => (<span key={`base-${t}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px]">{t} <span className="font-mono">{n as number}</span></span>))}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-semibold">Peak</div>
            <div className="flex flex-wrap gap-1">{peakSorted.map(([t, n]) => (<span key={`peak-${t}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px]">{t} <span className="font-mono">{n as number}</span></span>))}</div>
          </div>
        </div>
      </Section>
    );
  }

  function Tabs() {
    return (
      <div className="space-y-3">
        <div className="sticky top-0 z-10 -mx-4 border-b bg-white/80 px-4 py-2 backdrop-blur md:rounded-t-2xl">
          <div className="flex items-center gap-2">{(["offense","defense","redundancy"] as const).map(k => (<button key={k} onClick={()=>setTab(k)} className={`rounded-full px-3 py-1 text-sm ${tab===k?"bg-black text-white":"border"}`}>{k}</button>))}</div>
        </div>
        {tab === "offense" && <OffensePanel />}
        {tab === "defense" && <DefensePanel />}
        {tab === "redundancy" && <RedundancyPanel />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Legends Z‑A STAB Coverage Calculator</h1>
      <p className="text-sm text-gray-600">STAB-only offense/defense. Megas are time-weighted (uptime u). Oddities: Freeze‑Dry, Flying Press, Thousand Arrows. No abilities/items/weather.</p>
      <Section title="Global options">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={oddFreezeDry} onChange={(e)=>setOddFreezeDry(e.target.checked)} /> Freeze‑Dry (Ice is SE on Water)</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={oddFlyingPress} onChange={(e)=>setOddFlyingPress(e.target.checked)} /> Flying Press (Fighting×Flying effectiveness)</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={oddThousandArrows} onChange={(e)=>setOddThousandArrows(e.target.checked)} /> Thousand Arrows (Ground hits Flying neutrally)</label>
        </div>
      </Section>
      {TeamEditor()}
      <Tabs />
      <div className="text-xs text-gray-500">Notes: Weighted values proxy ZA’s Mega gauge cycling; snapshots show lower/upper bounds. Worst dual list shows 12 lowest P(SE) for readability.</div>
    </div>
  );
}
export default CoverageCalculatorZA;
