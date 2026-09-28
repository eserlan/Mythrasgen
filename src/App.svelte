<script lang="ts">
  import { tick } from "svelte";
  import Characteristics from "./components/Characteristics.svelte";
  import Landing from "./components/Landing.svelte";
  import Concept from "./components/Concept.svelte";
  import Sheet from "./components/Sheet.svelte";
  import Skills from "./components/Skills.svelte";
  import Background from "./components/Background.svelte";
  import Magic from "./components/Magic.svelte";
  import Combat from "./components/Combat.svelte";
  import Characters from "./components/Characters.svelte";
  import { canFinishPointBuy } from "./lib/calc";
  import { canVisitStep, isLandingView } from "./lib/navigation";
  import { canComplete, careerAllocationErrors, char, createCharacter, cultureAllocationErrors, persist, replace, ROMAN, STEPS } from "./lib/store.svelte";

  let open = $state(false);
  let showLibrary = $state(false);
  const last = STEPS.length - 1;
  const canContinue = $derived(char.generation === "roll" || canFinishPointBuy(char.chars));
  const canVisit = (step: number) => canVisitStep(step, canContinue, cultureAllocationErrors().length === 0)
    && (step < 4 || careerAllocationErrors().length === 0)
    && (step !== last || canComplete());

  // Persist on any change and scroll to top when the step changes.
  $effect(() => { JSON.stringify(char); persist(); });
  $effect(() => { char.step; scrollTo(0, 0); });

  function save() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(char, null, 2)], { type: "application/json" }));
    a.download = (char.name || "character") + ".json"; a.click();
    URL.revokeObjectURL(a.href);
  }
  async function loadFile(e: Event & { currentTarget: HTMLInputElement }) {
    const f = e.currentTarget.files?.[0]; if (!f) return;
    try { replace(JSON.parse(await f.text())); } catch { alert("Invalid file"); }
    e.currentTarget.value = "";
  }
  async function print() {
    if (!canVisit(last)) return;
    char.step = last; await tick(); window.print();
  }
  const newChar = () => { createCharacter(); char.home = false; showLibrary = false; };
</script>

{#if isLandingView(char.home, showLibrary)}
  <Landing onLibrary={() => { showLibrary = true; }} />
{:else}
<header class="noprint" class:open>
  <div class="top">
    <button class="brand" onclick={() => (char.home = true)} title="Back to the start"><span>◆</span> Mythras <em>Chargen</em></button>
    <button class="burger" aria-label="Menu" aria-expanded={open} onclick={() => (open = !open)}>☰</button>
    <div class="tools" role="presentation" onclick={() => (open = false)}>
      <button onclick={() => (showLibrary = true)}>Characters</button>
      <button onclick={save}>Save</button>
      <label class="btn">Load<input type="file" accept=".json" hidden onchange={loadFile}></label>
      <button onclick={print} disabled={!canVisit(last)}>Print</button>
      <button onclick={newChar}>New</button>
    </div>
  </div>
  {#if !showLibrary}
    <nav>
      {#each STEPS as s, i}
        <button class="step" class:on={i === char.step} class:done={i < char.step} disabled={!canVisit(i)} onclick={() => (char.step = i)}>
          <i>{i < char.step ? "✓" : ROMAN[i]}</i><span>{s}</span>
        </button>
      {/each}
    </nav>
  {/if}
</header>

{#if showLibrary}
  <main><Characters onOpen={() => (showLibrary = false)} onBack={() => (showLibrary = false)} /></main>
{:else}<main>
  {#key char.step}<div class="page">
  {#if char.step === 0}<Concept />
  {:else if char.step === 1}<Characteristics />
  {:else if char.step === 2}<Skills kind="culture" />
  {:else if char.step === 3}<Skills kind="career" />
  {:else if char.step === 4}<Skills kind="bonus" />
  {:else if char.step === 5}<Magic />
  {:else if char.step === 6}<Background />
  {:else if char.step === 7}<Combat />
  {:else}<Sheet />{/if}
  </div>{/key}

  <div class="pager noprint">
    {#if char.step > 0}<button onclick={() => char.step--}>← {STEPS[char.step - 1]}</button>{:else}<span></span>{/if}
    {#if char.step < last}<button class="primary" disabled={!canVisit(char.step + 1)} onclick={() => (char.step += 1)}>{char.step === 1 && !canContinue ? "Finish characteristics" : char.step === 4 && !canComplete() ? "Spend all bonus points" : `${STEPS[char.step + 1]} →`}</button>{/if}
  </div>
</main>{/if}
{/if}
