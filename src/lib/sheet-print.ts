import templateUrl from "../assets/mythras-character-sheet.pdf?url";
import { buildSheetData } from "./sheet-data";
import { currentSheetSource } from "./sheet-source";

/**
 * Fill the official Mythras Character Sheet from the selected character and open it for printing.
 * The preview tab is opened synchronously so popup blockers allow it; a download is the fallback.
 */
export async function printCharacterSheet(): Promise<void> {
  const preview = window.open("", "_blank");
  try {
    const source = currentSheetSource();
    const template = new Uint8Array(await (await fetch(templateUrl)).arrayBuffer());
    // Loaded on demand so the PDF library stays out of the main bundle.
    const { renderCharacterSheet } = await import("./sheet-pdf");
    const bytes = await renderCharacterSheet(buildSheetData(source), { template });
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
    if (preview) preview.location.href = url;
    else {
      const link = document.createElement("a");
      link.href = url; link.download = `${source.char.name.trim() || "character"} - Mythras Character Sheet.pdf`; link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
  } catch (error) {
    preview?.close();
    throw error;
  }
}
