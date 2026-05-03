"use client";

import { useState } from "react";
import { BillingCheckSection } from "./BillingCheckSection";
import { CustomerExportSection } from "./CustomerExportSection";
import { EmptyPalletSearchSection } from "./EmptyPalletSearchSection";
import { InboundLabelPrintSection } from "./InboundLabelPrintSection";
import { InventoryLedgerSection } from "./InventoryLedgerSection";
import { PalletSearchSection } from "./PalletSearchSection";
import { ProjectNoCorrectionSection } from "./ProjectNoCorrectionSection";
import { WarehouseLocationSection } from "./WarehouseLocationSection";

type AdminTab =
  | "pallet-search"
  | "empty-pallet-search"
  | "project-no-correction"
  | "locations"
  | "billing-check"
  | "inventory-ledger"
  | "customer-export"
  | "inbound-label-print";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "pallet-search", label: "パレット検索" },
  { id: "empty-pallet-search", label: "空パレット検索" },
  { id: "project-no-correction", label: "project_no補正" },
  { id: "locations", label: "棚番マスタ" },
  { id: "billing-check", label: "請求確認" },
  { id: "inventory-ledger", label: "在庫台帳" },
  { id: "customer-export", label: "客先提出" },
  { id: "inbound-label-print", label: "入庫ラベル発行" },
];

const styles = {
  tabList: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
    marginTop: "1.5rem",
  },
  tabButton: {
    padding: "0.65rem 1rem",
    border: "1px solid #bbb",
    borderRadius: "999px",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  activeTabButton: {
    borderColor: "#1976d2",
    background: "#1976d2",
    color: "#fff",
  },
  panel: {
    marginTop: "2rem",
    padding: "1.25rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    background: "#fff",
  },
};

export function AdminDashboardTabs() {
  const [activeTab, setActiveTab] = useState<AdminTab>("pallet-search");

  return (
    <>
      <nav style={styles.tabList} aria-label="管理画面タブ">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={{
              ...styles.tabButton,
              ...(activeTab === tab.id ? styles.activeTabButton : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "pallet-search" ? <PalletSearchSection /> : null}
      {activeTab === "empty-pallet-search" ? <EmptyPalletSearchSection /> : null}
      {activeTab === "project-no-correction" ? <ProjectNoCorrectionSection /> : null}
      {activeTab === "locations" ? <WarehouseLocationSection /> : null}
      {activeTab === "billing-check" ? <BillingCheckSection /> : null}
      {activeTab === "inventory-ledger" ? <InventoryLedgerSection /> : null}
      {activeTab === "customer-export" ? <CustomerExportSection /> : null}
      {activeTab === "inbound-label-print" ? <InboundLabelPrintSection /> : null}
    </>
  );
}
