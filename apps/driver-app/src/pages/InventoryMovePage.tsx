import { InventoryMoveApp } from "../InventoryMoveApp.js";
import { PalletMoveApp } from "../PalletMoveApp.js";
import { PageShell } from "./PageShell.js";

export function InventoryMovePage() {
  return (
    <PageShell>
      <InventoryMoveApp />
      <PalletMoveApp />
    </PageShell>
  );
}
