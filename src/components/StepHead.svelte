<script lang="ts">
  import { INTRO, ROMAN } from "../lib/store.svelte";
  let { step, title }: { step: number; title: string } = $props();
</script>

<div class="head">
  <span class="numeral">{ROMAN[step]}</span>
  <div><h2>{title}</h2><p class="intro">{INTRO[step]}</p></div>
</div>
