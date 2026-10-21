<script lang="ts">
  let { landing = false }: { landing?: boolean } = $props();
</script>

<footer class="site-footer" class:noprint={!landing}>
  <p>
    Built for <a href="https://thedesignmechanism.com/mythras.html" target="_blank" rel="noopener">Mythras</a> by
    <a href="https://thedesignmechanism.com" target="_blank" rel="noopener">The Design Mechanism</a>, the source of the rules and character sheet.
    A <a href="https://codexcryptica.com" target="_blank" rel="noopener">Codex Cryptica</a> project.
  </p>
  <p>Unofficial fan tool. Mythras is a trademark of The Design Mechanism; this site is not affiliated with or endorsed by them.
    Your hero is saved only in this browser.</p>
</footer>
