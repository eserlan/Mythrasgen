<script lang="ts">
  let { value, min = 0, max = 99, canInc = true, label = "", onchange }: {
    value: number; min?: number; max?: number; canInc?: boolean; label?: string; onchange: (v: number) => void;
  } = $props();
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v) || min));
</script>

<div class="stepper">
  <button onclick={() => onchange(clamp(value - 1))} disabled={value <= min} aria-label="Decrease {label}">−</button>
  <input type="number" {value} {min} {max} aria-label={label}
    onchange={e => { const v = clamp(+e.currentTarget.value); onchange(v); e.currentTarget.value = String(v); }} />
  <button onclick={() => onchange(clamp(value + 1))} disabled={value >= max || !canInc} aria-label="Increase {label}">+</button>
</div>
