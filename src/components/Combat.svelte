<script lang="ts">
  import StepHead from "./StepHead.svelte";
  import CombatStyles from "./CombatStyles.svelte";
</script>

<StepHead step={7} title="Combat" />
<p class="hint">Each listed weapon is governed by its Combat Style percentage. Weapons are not separate skills.</p>
<CombatStyles />
