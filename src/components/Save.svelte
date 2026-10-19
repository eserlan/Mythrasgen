<script lang="ts">
  let { onSave, onDownload, onBack }: {
    onSave: () => void;
    onDownload: (format: "pdf" | "markdown") => void;
    onBack: () => void;
  } = $props();
</script>

<section class="save-page page" aria-labelledby="save-title">
  <div class="head"><span class="numeral" aria-hidden="true">↓</span><div><h2 id="save-title">Save Character</h2><p class="intro">Save the active character to this device.</p></div></div>
  <div class="card save-card">
    <section class="save-option" aria-labelledby="save-character-title">
      <h3 id="save-character-title">Character data</h3>
      <p>Save a JSON copy of the active character.</p>
      <button type="button" class="secondary" onclick={onSave}>Save Character (.json)</button>
    </section>
    <section class="save-option" aria-labelledby="download-character-title">
      <h3 id="download-character-title">Download Character</h3>
      <p>Save the active character to this device.</p>
      <div class="save-actions"><button type="button" class="secondary" onclick={() => onDownload("pdf")}>Editable PDF</button><button type="button" class="secondary" onclick={() => onDownload("markdown")}>Markdown (.md)</button></div>
    </section>
  </div>
  <div class="pager"><button type="button" onclick={onBack}>← Back to character</button></div>
</section>
