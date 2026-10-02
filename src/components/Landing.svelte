<script lang="ts">
  import { STEPS, ROMAN, char, createCharacter, hasProgress, replace } from "../lib/store.svelte";

  let { onLibrary, onSettings }: { onLibrary: () => void; onSettings: () => void } = $props();
  const progress = $derived(hasProgress());
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);

  const begin = () => (char.home = false);
  function anew() {
    if (progress && !confirm("Keep this hero and start another?")) return;
    createCharacter();
    begin();
  }
  async function loadFile(e: Event & { currentTarget: HTMLInputElement }) {
    const f = e.currentTarget.files?.[0]; if (!f) return;
    try { replace(JSON.parse(await f.text())); } catch { alert("That file could not be read."); }
    e.currentTarget.value = "";
  }
</script>

<div class="landing">
  <div class="meander" aria-hidden="true"></div>
  <div class="hero">
    <svg class="medallion" viewBox="-100 -100 200 200" aria-hidden="true">
      <circle r="94" class="m-ring" /><circle r="84" class="m-thin" /><circle r="52" class="m-ring" />
      {#each ticks as a}<line x1="0" y1="-84" x2="0" y2={a % 45 === 0 ? -66 : -74} transform="rotate({a})" class="m-tick" />{/each}
      <path d="M-26 22 V-24 L0 4 L26 -24 V22" class="m-glyph" />
    </svg>
    <p class="kicker">A character forge for</p>
    <h1>Mythras</h1>
    <div class="ornament"><i></i><b>◆</b><i></i></div>
    <p class="tagline">Build a hero from the ground up: the blood in their veins, the people who raised them and the trade that hardened them.</p>

    <div class="cta">
      {#if progress}
        <button class="primary big" onclick={begin}>Continue your hero</button>
        <button class="big" onclick={anew}>Start anew</button>
      {:else}
        <button class="primary big" onclick={begin}>Begin the forging</button>
      {/if}
      <label class="btn big">Load a saved hero<input type="file" accept=".json" hidden onchange={loadFile}></label>
      <button class="big" onclick={onLibrary}>Characters</button>
      <button class="big" onclick={onSettings}>Settings</button>
    </div>

    <ol class="path">
      {#each STEPS as s, i}<li><b>{ROMAN[i]}</b> {s}</li>{/each}
    </ol>
  </div>
  <p class="legal">Unofficial fan tool. Mythras is a trademark of The Design Mechanism; this site is not affiliated with or endorsed by them.
    Your hero is saved only in this browser.</p>
  <div class="meander" aria-hidden="true"></div>
</div>
