import { PalletItemOutApp } from "../PalletItemOutApp.js";
import { PalletOutApp } from "../PalletOutApp.js";
import { PageShell } from "./PageShell.js";

export function InventoryOutPage() {
  return (
    <PageShell>
      <PalletOutApp />
      <PalletItemOutApp />
    </PageShell>
  );
}
