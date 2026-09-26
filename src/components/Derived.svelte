<script lang="ts">
  import { deriveStats } from "../lib/calc";
  import { char } from "../lib/store.svelte";
  const d = $derived(deriveStats(char.chars));
</script>

<div class="derived">
  {#each d.stats as [name, val]}<div><small>{name}</small><b>{val}</b></div>{/each}
</div>
