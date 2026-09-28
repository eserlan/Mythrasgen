/** Open a native modal dialog, focus its initial control, and close it on teardown. */
export function activateModalDialog(
  dialog: HTMLDialogElement,
  initialFocusSelector: string,
): { destroy: () => void } {
  dialog.showModal();
  dialog.querySelector<HTMLElement>(initialFocusSelector)?.focus();
  return { destroy: () => { if (dialog.open) dialog.close(); } };
}
