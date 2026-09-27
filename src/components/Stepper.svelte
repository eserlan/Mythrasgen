<script lang="ts">
  let { value, min = 0, max = 99, canInc = true, jumpFromZero = false, label = "", onchange }: {
    value: number; min?: number; max?: number; canInc?: boolean; jumpFromZero?: boolean; label?: string; onchange: (v: number) => void;
  } = $props();
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v) || min));
  const HOLD_DELAY = 380, REPEAT = 85;

  let delay: ReturnType<typeof setTimeout> | undefined, timer: ReturnType<typeof setInterval> | undefined;

  /** Take one step; returns false when the limit is reached. */
  function step(dir: 1 | -1): boolean {
    if (dir === 1 && !canInc) return false;
    const next = jumpFromZero && dir === 1 && value === 0 ? 5
      : jumpFromZero && dir === -1 && value <= 5 ? 0 : value + dir;
    const v = clamp(next);
    if (v === value) return false;
    onchange(v);
    return true;
  }
  function stop() {
    clearTimeout(delay); clearInterval(timer);
    window.removeEventListener("pointerup", stop); window.removeEventListener("pointercancel", stop);
  }
  /** Press: step once now, then keep stepping while the button is held. */
  function press(e: PointerEvent, dir: 1 | -1) {
    if (e.button !== 0) return;
    stop();
    if (!step(dir)) return;
    window.addEventListener("pointerup", stop); window.addEventListener("pointercancel", stop);
    delay = setTimeout(() => { timer = setInterval(() => { if (!step(dir)) stop(); }, REPEAT); }, HOLD_DELAY);
  }
  // Keyboard activation (Enter/Space) fires click with detail 0; pointer presses are handled above.
  const key = (e: MouseEvent, dir: 1 | -1) => { if (e.detail === 0) step(dir); };
</script>

<div class="stepper">
  <button onpointerdown={e => press(e, -1)} onclick={e => key(e, -1)} oncontextmenu={e => e.preventDefault()}
    disabled={value <= min} aria-label="Decrease {label}">−</button>
  <input type="number" {value} {min} {max} aria-label={label}
    onchange={e => { const v = clamp(+e.currentTarget.value); onchange(v); e.currentTarget.value = String(v); }} />
  <button onpointerdown={e => press(e, 1)} onclick={e => key(e, 1)} oncontextmenu={e => e.preventDefault()}
    disabled={value >= max || !canInc} aria-label="Increase {label}">+</button>
</div>
