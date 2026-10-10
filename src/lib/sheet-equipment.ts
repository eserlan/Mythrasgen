import { summarizeArmour, type ArmourSummary } from "./armour-rules";
import { encumbranceSummary, type EncumbranceSummary } from "./encumbrance";
import type { InventoryItem, InventoryTransaction } from "./equipment-inventory";
import { reconcileBalance } from "./equipment-inventory";

export interface SheetEquipmentSummary {
  load: EncumbranceSummary;
  armour: ArmourSummary;
  funds: ReturnType<typeof reconcileBalance>;
}

/** Shared Page IX view of Page VIII's persisted equipment and authoritative ledger. */
export function sheetEquipmentSummary(
  inventory: readonly InventoryItem[],
  strength: number | null | undefined,
  startingMoneySp: number,
  transactions: readonly InventoryTransaction[],
): SheetEquipmentSummary {
  const armourPieces = inventory.filter(item => item.armour).flatMap(item =>
    Array.from({ length: item.quantity }, (_, index) => ({
      id: `${item.id}-${index + 1}`,
      ...item.armour!,
      state: item.state,
    })),
  );
  return {
    load: encumbranceSummary(inventory, strength),
    armour: summarizeArmour(armourPieces),
    funds: reconcileBalance(startingMoneySp, transactions),
  };
}
