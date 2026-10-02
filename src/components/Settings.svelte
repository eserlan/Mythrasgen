<script lang="ts">
  import { FONT_STYLES, TEXT_SIZES, type DisplaySettings, type FontStyle, type TextSize } from "../lib/display-settings";

  let { settings, onChange, onReset, onBack }: {
    settings: DisplaySettings;
    onChange: (settings: DisplaySettings) => void;
    onReset: () => void;
    onBack: () => void;
  } = $props();

  const sizeLabels: Record<TextSize, string> = { small: "Small", standard: "Standard", large: "Large", "extra-large": "Extra Large" };
  const fontLabels: Record<FontStyle, string> = { classic: "Mythras / Classic", "readable-serif": "Readable Serif", "readable-sans": "Readable Sans" };
  const updateSize = (textSize: TextSize) => onChange({ ...settings, textSize });
  const updateFont = (fontStyle: FontStyle) => onChange({ ...settings, fontStyle });
</script>

<section class="settings-page page" aria-labelledby="settings-title">
  <div class="head"><span class="numeral" aria-hidden="true">⚙</span><div><h2 id="settings-title">Display Settings</h2><p class="intro">Choose text and type styles that are comfortable to read.</p></div></div>
  <div class="card settings-card">
    <fieldset class="settings-choice">
      <legend>Text size</legend>
      <p class="hint">The size applies across the interface, including labels, controls, navigation and small print.</p>
      <div class="settings-options settings-size-options">
        {#each TEXT_SIZES as value}
          <label class="settings-option"><input type="radio" name="display-text-size" value={value} checked={settings.textSize === value} onchange={() => updateSize(value)}><span>{sizeLabels[value]}</span></label>
        {/each}
      </div>
    </fieldset>

    <fieldset class="settings-choice">
      <legend>Font style</legend>
      <p class="hint">Classic keeps the current Mythras character. Readable styles use system fonts already on your device.</p>
      <div class="settings-options settings-font-options">
        {#each FONT_STYLES as value}
          <label class="settings-option"><input type="radio" name="display-font-style" value={value} checked={settings.fontStyle === value} onchange={() => updateFont(value)}><span>{fontLabels[value]}</span></label>
        {/each}
      </div>
    </fieldset>

    <section class="settings-preview" aria-live="polite" aria-label="Display preview">
      <h3>Preview</h3>
      <p>Readable text should feel clear without losing the character of your Mythras sheet.</p>
      <div class="settings-preview-controls"><label class="field"><span>Example label</span><input value="A readable value" readonly></label><button type="button">Example button</button></div>
    </section>

    <div class="settings-actions"><button type="button" onclick={onReset}>Reset to defaults</button><button type="button" class="primary" onclick={onBack}>Done</button></div>
  </div>
</section>
