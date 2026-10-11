<script lang="ts">
  import { HIT_LOCATIONS, type HitLocationName } from "../lib/armour-rules";

  let { idPrefix, selected, guidance, error = "", validation = "", onchange }: {
    idPrefix: string;
    selected: HitLocationName[];
    guidance: string;
    error?: string;
    validation?: string;
    onchange: (location: HitLocationName, checked: boolean) => void;
  } = $props();

  const instructionId = $derived(`${idPrefix}-instruction`);
  const errorId = $derived(`${idPrefix}-error`);
  const validationId = $derived(`${idPrefix}-validation`);
</script>

<fieldset class="protected-locations" aria-describedby={`${instructionId}${validation ? ` ${validationId}` : ""}${error ? ` ${errorId}` : ""}`}>
  <legend>Protected hit locations</legend>
  <p id={instructionId}>{guidance}</p>
  <p class="location-count" aria-live="polite" aria-atomic="true">{selected.length} of {HIT_LOCATIONS.length} locations selected.</p>
  <div class="location-options">
    {#each HIT_LOCATIONS as location}
      <label><input type="checkbox" checked={selected.includes(location)} onchange={event => onchange(location, event.currentTarget.checked)}>{location}</label>
    {/each}
  </div>
  {#if validation}<p id={validationId} class="locations-validation" role="status">{validation}</p>{/if}
  {#if error}<p id={errorId} class="locations-error" role="alert">{error}</p>{/if}
</fieldset>

<style>
  .protected-locations { box-sizing:border-box; grid-column:1/-1; display:grid; grid-template-columns:minmax(0,1fr); gap:.5rem; min-inline-size:0; width:100%; }
  .protected-locations legend { font-weight:700; }
  .protected-locations > p { margin:.1rem 0 .25rem; }
  .protected-locations > p:first-of-type { color:var(--mute); }
  .location-count { font-size:.95rem; }
  .location-options { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr)); gap:.5rem; min-width:0; }
  .location-options label { box-sizing:border-box; display:flex; align-items:center; gap:.55rem; min-width:0; min-height:2.75rem; padding:.45rem .55rem; border:1px solid var(--line); border-radius:.35rem; cursor:pointer; white-space:nowrap; }
  .location-options input[type="checkbox"] { flex:none; width:1.25rem; height:1.25rem; margin:0; accent-color:var(--bronze); }
  .location-options input[type="checkbox"]:focus-visible { outline:3px solid var(--acc); outline-offset:2px; }
  .locations-error { color:var(--acc); font-weight:700; }
</style>
