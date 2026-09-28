<script lang="ts">
  import { onMount } from "svelte";
  import StepHead from "./StepHead.svelte";
  import { char, reconcileMagic } from "../lib/store.svelte";
  import type { MagicSkillOrigin } from "../lib/magic";

  const originName: Record<MagicSkillOrigin, string> = { culture: "Culture", career: "Career", bonus: "Bonus / Hobby Skill" };
  onMount(reconcileMagic);
</script>

<StepHead step={5} title="Magic" />

<section class="card magic-foundation">
  {#if char.magic.disciplines.length === 0}
    <h3>Magical Capabilities</h3>
    <p class="magic-empty-title">No magical capabilities detected.</p>
    <p class="mute">Your current Culture, Career and Bonus Skills have not granted access to a magical discipline.</p>
    <div class="magic-organisations">
      <h4>Cults &amp; Brotherhoods</h4>
      <p>Cult or brotherhood membership may still be available if permitted by the campaign.</p>
    </div>
  {:else}
    <h3>Magical Capabilities</h3>
    <div class="magic-capabilities">
      {#each char.magic.disciplines as capability (capability.discipline)}
        <article class="magic-capability">
          <div class="magic-capability-heading">
            <h4>{capability.discipline}</h4>
            <span class="magic-status">{capability.status === "needs-configuration" ? "Needs configuration" : capability.status}</span>
          </div>
          <ul class="magic-skills">
            {#each capability.skills as skill (skill.name)}
              <li>
                <span>{skill.name}</span><b>{skill.value}%</b>
                {#if skill.origins.length}<small>Acquired through {skill.origins.map(origin => originName[origin]).join(", ")}</small>{/if}
              </li>
            {/each}
          </ul>
        </article>
      {/each}
    </div>
  {/if}
</section>
