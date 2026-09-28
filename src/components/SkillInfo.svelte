<script lang="ts">
  import { onMount } from "svelte";
  import { skillDescription } from "../lib/skill-descriptions";

  let { name }: { name: string } = $props();
  let root = $state<HTMLSpanElement>();
  let open = $state(false);
  let pinned = $state(false);
  let focused = $state(false);
  let hold: ReturnType<typeof setTimeout> | undefined;
  let holdX = 0;
  let holdY = 0;
  let id = $state("");
  const description = $derived(skillDescription(name));

  function close() {
    open = false;
    pinned = false;
  }
  function stopHold() {
    clearTimeout(hold);
    hold = undefined;
  }
  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== "touch") return;
    stopHold();
    holdX = event.clientX;
    holdY = event.clientY;
    hold = setTimeout(() => { pinned = true; open = true; }, 500);
  }
  function onPointerMove(event: PointerEvent) {
    if (event.pointerType === "touch" && hold !== undefined
      && (event.clientX - holdX) ** 2 + (event.clientY - holdY) ** 2 > 100) stopHold();
  }
  function onPointerLeave() {
    stopHold();
    if (!pinned && !focused) close();
  }

  onMount(() => {
    id = `skill-description-${crypto.randomUUID()}`;
    const outside = (event: PointerEvent) => { if (!root?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);
    return () => {
      stopHold();
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape);
    };
  });
</script>

<span class="skill-info" role="group" aria-label={name} bind:this={root} onpointerenter={event => { if (event.pointerType === "mouse") open = true; }}
  onpointerleave={onPointerLeave} onpointerdown={onPointerDown} onpointermove={onPointerMove} onpointerup={stopHold} onpointercancel={stopHold}>
  <span class="skill-info-name">{name}</span>
  <button class="skill-info-trigger" type="button" aria-label={`About ${name}: ${description}`} aria-expanded={open}
    aria-controls={id} onclick={() => { pinned = !pinned; open = pinned || focused; }}
    onfocus={() => { focused = true; open = true; }} onblur={() => { focused = false; if (!pinned) open = false; }}>ⓘ</button>
  <span class="skill-info-tooltip" id={id} role="tooltip" hidden={!open}>{description}</span>
</span>

<style>
  .skill-info{position:relative;display:inline-flex;align-items:baseline;gap:3px;max-width:100%}
  .skill-info-trigger{flex:none;border:0;background:none;color:var(--mute);padding:0 2px;font:700 .68rem/1 var(--body);letter-spacing:0;text-transform:none;vertical-align:super;min-width:16px;min-height:16px}
  .skill-info-trigger:hover:not(:disabled){transform:none;color:var(--bronze)}
  .skill-info-tooltip{position:absolute;z-index:20;top:calc(100% + 5px);left:0;width:max-content;max-width:min(300px,calc(100vw - 36px));padding:7px 10px;border:1px solid var(--line2);border-radius:3px;background:var(--card);box-shadow:var(--shadow);color:var(--fg);font: .9rem/1.35 var(--body);white-space:normal;overflow-wrap:anywhere;text-transform:none;letter-spacing:0}
  .skill-info-tooltip[hidden]{display:none}
  @media print{.skill-info-trigger,.skill-info-tooltip{display:none!important}}
</style>
