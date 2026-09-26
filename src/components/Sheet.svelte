<script lang="ts">
  import { deriveStats, skillDef } from "../lib/calc";
  import { STATS } from "../lib/rules";
  import { allSkills, career, char, culture, total } from "../lib/store.svelte";
  import Derived from "./Derived.svelte";
  const loc = $derived(deriveStats(char.chars).loc);
  const skills = $derived(allSkills().sort());
  const std = $derived(skills.filter(n => !skillDef(n).pro));
  const pro = $derived(skills.filter(n => skillDef(n).pro));
</script>

<div class="banner"><h1>{char.name || "Unnamed hero"}</h1><p>{culture().name} · {career().name}</p></div>
<div class="chars sheet">
  {#each STATS as k}<div class="char"><small>{k}</small><b>{char.chars[k]}</b></div>{/each}
</div>
<Derived />
<div class="two">
  <div class="card">
    <h3>Hit locations</h3>
    <table>
      <thead><tr><th>Location</th><th>d20</th><th class="n">HP</th></tr></thead>
      <tbody>{#each loc as l}<tr><td>{l.name}</td><td>{l.roll}</td><td class="n"><b>{l.hp}</b></td></tr>{/each}</tbody>
    </table>
  </div>
  <div class="card">
    <h3>Professional &amp; combat</h3>
    <table><tbody>{#each pro as n}<tr><td>{n}</td><td class="n"><b>{total(n)}%</b></td></tr>{/each}</tbody></table>
  </div>
</div>
<div class="card">
  <h3>Standard skills</h3>
  <div class="cols"><table><tbody>{#each std as n}<tr><td>{n}</td><td class="n"><b>{total(n)}%</b></td></tr>{/each}</tbody></table></div>
</div>
