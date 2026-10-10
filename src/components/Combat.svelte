<script lang="ts">
  import StepHead from "./StepHead.svelte";
  import CombatStyles from "./CombatStyles.svelte";
  import EquipmentInventory from "./EquipmentInventory.svelte";
</script>

<StepHead step={7} title="Combat &amp; Equipment" />
<p class="hint">Record owned equipment and spending here. Combat Styles are training, not possessions; catalogue equipment does not create or change Combat Styles.</p>
<EquipmentInventory />
<details class="combat-styles-compact">
  <summary>Combat Styles <span>Training and governing percentages</span></summary>
  <p class="hint">Each listed weapon is governed by its Combat Style percentage. Weapons are not separate skills or automatic inventory.</p>
  <CombatStyles />
</details>

<style>
  .combat-styles-compact { margin-top: 1rem; border: 1px solid var(--line); border-radius: .6rem; padding: .75rem; }
  .combat-styles-compact > summary { cursor: pointer; font-weight: 700; }
  .combat-styles-compact > summary span { margin-left: .45rem; font-weight: 400; color: var(--muted); }
</style>
