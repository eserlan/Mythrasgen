<script lang="ts">
  import { careers, cultures } from "../lib/content";
  import { characterLibrary, char, createCharacter, deleteCharacter, renameCharacter, selectCharacter } from "../lib/store.svelte";

  let { onOpen, onBack }: { onOpen: () => void; onBack: () => void } = $props();

  function open(id: string) {
    selectCharacter(id);
    onOpen();
  }
  function create() {
    createCharacter();
    onOpen();
  }
  function remove(id: string, name: string) {
    if (confirm(`Delete ${name || "this character"}? This cannot be undone.`)) deleteCharacter(id);
  }
</script>

<section class="characters page">
  <div class="head"><span class="numeral">◆</span><div><h2>Characters</h2><p class="intro">Your heroes, saved in this browser.</p></div></div>
  <div class="card character-list">
    {#if characterLibrary.characters.length === 0}
      <p>No characters saved yet. Create one to begin.</p>
    {:else}
      {#each characterLibrary.characters as character (character.id)}
        {@const active = character.id === char.id}
        <article class="character-entry" class:active>
          <div class="character-identity">
            <label class="field"><span>Character name</span><input value={character.name} placeholder="Unnamed character" onchange={e => renameCharacter(character.id, e.currentTarget.value)}></label>
            <p>{cultures[character.culture]?.name ?? "Culture not chosen"} · {careers[character.career]?.name ?? "Career not chosen"}</p>
          </div>
          <div class="character-actions">
            {#if active}<span class="active-label">Active</span>{/if}
            <button class:primary={!active} onclick={() => open(character.id)}>{active ? "Open" : "Select"}</button>
            <button class="danger" aria-label={`Delete ${character.name || "unnamed character"}`} onclick={() => remove(character.id, character.name)}>Delete</button>
          </div>
        </article>
      {/each}
    {/if}
  </div>
  <div class="pager"><button onclick={onBack}>← Back</button><button class="primary" onclick={create}>Create new character</button></div>
</section>
