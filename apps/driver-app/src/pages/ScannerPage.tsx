import { EmptyPalletSearchApp } from "../EmptyPalletSearchApp.js";
import { PartLocationSearchApp } from "../PartLocationSearchApp.js";
import { ScannerApp } from "../ScannerApp.js";
import { PageShell } from "./PageShell.js";

export function ScannerPage() {
  return (
    <PageShell>
      <PartLocationSearchApp />
      <EmptyPalletSearchApp />
      <ScannerApp />
    </PageShell>
  );
}
