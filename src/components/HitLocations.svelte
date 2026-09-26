<script lang="ts">
  import type { HitLocation } from "../lib/calc";
  let { loc }: { loc: HitLocation[] } = $props();
  // Front view: the character's right side is on the viewer's left.
  const shapes: Record<string, { x: number; y: number; w: number; h: number; r: number }> = {
    Head: { x: 42, y: 6, w: 36, h: 38, r: 18 }, Chest: { x: 34, y: 50, w: 52, h: 46, r: 7 },
    Abdomen: { x: 38, y: 100, w: 44, h: 36, r: 7 }, "Right Arm": { x: 6, y: 52, w: 24, h: 84, r: 11 },
    "Left Arm": { x: 90, y: 52, w: 24, h: 84, r: 11 }, "Right Leg": { x: 36, y: 142, w: 22, h: 104, r: 9 },
    "Left Leg": { x: 62, y: 142, w: 22, h: 104, r: 9 },
  };
</script>

<svg class="body" viewBox="0 0 120 252" role="img" aria-label="Hit locations">
  {#each loc as l}
    {@const s = shapes[l.name]}
    <g>
      <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} />
      <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 2} class="hp">{l.hp}</text>
      <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 13} class="rg">{l.roll}</text>
    </g>
  {/each}
</svg>
