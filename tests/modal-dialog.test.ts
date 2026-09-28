import { describe, expect, test } from "bun:test";
import { activateModalDialog } from "../src/lib/modal-dialog";

describe("activateModalDialog", () => {
  test("opens, focuses the initial control, and closes on teardown", () => {
    let opened = false;
    let closed = false;
    let focused = false;
    const dialog = {
      open: false,
      showModal() { opened = true; this.open = true; },
      close() { closed = true; this.open = false; },
      querySelector(selector: string) {
        expect(selector).toBe(".mfilter");
        return { focus() { focused = true; } };
      },
    } as unknown as HTMLDialogElement;

    const action = activateModalDialog(dialog, ".mfilter");

    expect(opened).toBe(true);
    expect(focused).toBe(true);
    expect(closed).toBe(false);
    action.destroy();
    expect(closed).toBe(true);
  });

  test("does not close a dialog already closed by the user", () => {
    let closed = false;
    const dialog = {
      open: false,
      showModal() {},
      close() { closed = true; },
      querySelector() { return null; },
    } as unknown as HTMLDialogElement;

    activateModalDialog(dialog, ".mfilter").destroy();

    expect(closed).toBe(false);
  });
});
