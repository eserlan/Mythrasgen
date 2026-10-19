<script lang="ts">
  import { printCharacterSheet } from "./lib/sheet-print";
  import { buildSheetData } from "./lib/sheet-data";
  import { currentSheetSource } from "./lib/sheet-source";
  import Characteristics from "./components/Characteristics.svelte";
  import Landing from "./components/Landing.svelte";
  import Concept from "./components/Concept.svelte";
  import Sheet from "./components/Sheet.svelte";
  import Skills from "./components/Skills.svelte";
  import Background from "./components/Background.svelte";
  import Magic from "./components/Magic.svelte";
  import Combat from "./components/Combat.svelte";
  import Characters from "./components/Characters.svelte";
  import Save from "./components/Save.svelte";
  import Settings from "./components/Settings.svelte";
  import { applyDisplaySettings, loadDisplaySettings, saveDisplaySettings } from "./lib/display-settings";
  import { canFinishPointBuy } from "./lib/calc";
  import { canVisitStep, isLandingView } from "./lib/navigation";
  import { canComplete, careerAllocationErrors, char, createCharacter, cultureAllocationErrors, persist, replace, ROMAN, STEPS } from "./lib/store.svelte";

  let open = $state(false);
  let showLibrary = $state(false);
  let showSave = $state(false);
  let showSettings = $state(false);
  let displaySettings = $state(loadDisplaySettings());
  let printMode = $state<"titles-and-appendix" | "titles-only" | "notes-and-appendix" | "notes-only" | "appendix-only">("titles-and-appendix");
  let printDialog: HTMLDialogElement;
  const last = STEPS.length - 1;
  const canContinue = $derived(char.generation === "roll" || canFinishPointBuy(char.chars));
  const canVisit = (step: number) => canVisitStep(step, canContinue, cultureAllocationErrors().length === 0)
    && (step < 4 || careerAllocationErrors().length === 0)
    && (step !== last || canComplete());

  // Persist on any change and scroll to top when the step changes.
  $effect(() => { JSON.stringify(char); persist(); });
  $effect(() => { char.step; scrollTo(0, 0); });
  $effect(() => {
    applyDisplaySettings(displaySettings);
    saveDisplaySettings(displaySettings);
  });

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
  function openPrintDialog() {
    printDialog.showModal();
    printDialog.querySelector<HTMLInputElement>("input[name='print-mode']:checked")?.focus();
  }
  async function print() {
    if (!canVisit(last)) return;
    const mode = printMode;
    printDialog.close();
    try { await printCharacterSheet(mode); } catch { alert("Could not create the character sheet PDF."); }
  }
  async function downloadCharacter(format: "pdf" | "markdown") {
    const source = currentSheetSource();
    const data = buildSheetData(source);
    try {
      const { characterFilename, characterMarkdown, renderEditableCharacterSheet } = await import("./lib/character-export");
      let blob: Blob, filename: string;
      if (format === "pdf") {
        const { default: templateUrl } = await import("./assets/mythras-character-sheet.pdf?url");
        const template = new Uint8Array(await (await fetch(templateUrl)).arrayBuffer());
        const bytes = await renderEditableCharacterSheet(data, { template });
        blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
        filename = characterFilename(source.char.name, ".pdf");
      } else {
        blob = new Blob([characterMarkdown(data, source.char)], { type: "text/markdown;charset=utf-8" });
        filename = characterFilename(source.char.name, ".md");
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = filename; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    } catch {
      alert(`Could not download the character as ${format === "pdf" ? "an editable PDF" : "Markdown"}.`);
    }
  }
  const newChar = () => { createCharacter(); char.home = false; showLibrary = false; };
</script>

{#if isLandingView(char.home, showLibrary) && !showSettings}
  <Landing onLibrary={() => { showLibrary = true; }} onSettings={() => { showSettings = true; }} />
{:else}
<header class="noprint" class:open>
  <div class="top">
    <button class="brand" onclick={() => { char.home = true; showSettings = false; showLibrary = false; showSave = false; }} title="Back to the start"><span>◆</span> Mythras <em>Chargen</em></button>
    <button class="burger" aria-label="Menu" aria-expanded={open} onclick={() => (open = !open)}>☰</button>
    <div class="tools" role="presentation" onclick={() => (open = false)}>
      <button onclick={() => { showLibrary = true; showSettings = false; showSave = false; }}>Characters</button>
      <button aria-current={showSettings ? "page" : undefined} onclick={() => { showSettings = true; showLibrary = false; showSave = false; open = false; }}>Settings</button>
      <button aria-current={showSave ? "page" : undefined} onclick={() => { showSave = true; showLibrary = false; showSettings = false; open = false; }}>Save</button>
      <label class="btn">Load<input type="file" accept=".json" hidden onchange={loadFile}></label>
      <button onclick={openPrintDialog} disabled={!canVisit(last)}>Print</button>
      <button onclick={() => { newChar(); showSave = false; showSettings = false; }}>New</button>
    </div>
  </div>
  {#if !showLibrary && !showSettings && !showSave}
    <nav>
      {#each STEPS as s, i}
        <button class="step" class:on={i === char.step} class:done={i < char.step} disabled={!canVisit(i)} onclick={() => (char.step = i)}>
          <i>{i < char.step ? "✓" : ROMAN[i]}</i><span>{s}</span>
        </button>
      {/each}
    </nav>
  {/if}
</header>

{#if showSettings}
  <main><Settings settings={displaySettings} onChange={value => displaySettings = value} onReset={() => displaySettings = { textSize: "standard", fontStyle: "classic" }} onBack={() => showSettings = false} /></main>
{:else if showLibrary}
  <main><Characters onOpen={() => (showLibrary = false)} onBack={() => (showLibrary = false)} /></main>
{:else if showSave}
  <main><Save onSave={save} onDownload={downloadCharacter} onBack={() => showSave = false} /></main>
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

<dialog class="print-dialog" bind:this={printDialog} aria-labelledby="print-dialog-title" onclick={event => { if (event.target === event.currentTarget) printDialog.close(); }}>
  <form method="dialog" onsubmit={event => event.preventDefault()}>
    <h2 id="print-dialog-title">Print character</h2>
    <fieldset>
      <legend>Choose what to print</legend>
      <label><input type="radio" name="print-mode" value="titles-and-appendix" bind:group={printMode} /><span><strong>Character sheet with Magic titles + Magic Appendix</strong><small>Official two-page sheet with known ability names and a complete detailed reference appendix.</small></span></label>
      <label><input type="radio" name="print-mode" value="titles-only" bind:group={printMode} /><span><strong>Character sheet with Magic titles only</strong><small>Official sheet with known ability names in the Magic &amp; Abilities box.</small></span></label>
      <label><input type="radio" name="print-mode" value="notes-and-appendix" bind:group={printMode} /><span><strong>Character sheet with Magic notes + Magic Appendix</strong><small>Official sheet with ability names and available rules notes, plus the complete detailed reference appendix.</small></span></label>
      <label><input type="radio" name="print-mode" value="notes-only" bind:group={printMode} /><span><strong>Character sheet with Magic notes only</strong><small>Official sheet with ability names and available rules notes; overflow is marked on the sheet.</small></span></label>
      <label><input type="radio" name="print-mode" value="appendix-only" bind:group={printMode} /><span><strong>Magic Appendix only</strong><small>Complete detailed reference pages without the official character sheet. If no abilities are recorded, prints the two-page sheet.</small></span></label>
    </fieldset>
    <footer><button type="button" class="secondary" onclick={() => printDialog.close()}>Cancel</button><button type="button" class="primary" onclick={print}>Print</button></footer>
  </form>
</dialog>
