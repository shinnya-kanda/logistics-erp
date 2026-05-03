export type ScanPostResult = {
  status: number;
  json: unknown;
  rawText: string;
};

export async function postScans(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/scans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function postRebuild(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/rebuild`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function postInventoryOut(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/inventory/out`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function postInventoryIn(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/inventory/in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function postInventoryMove(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/inventory/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function postPalletCreate(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/pallets/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function postPalletItemAdd(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/pallets/items/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function postPalletItemOut(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/pallets/items/out`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function postPalletMove(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/pallets/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function postPalletOut(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/pallets/out`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function getPalletSearch(
  baseUrl: string,
  warehouseCode?: string,
  status?: string,
  partNo?: string,
  palletCode?: string
): Promise<ScanPostResult> {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/pallets/search`);
  if (warehouseCode !== undefined) {
    url.searchParams.set("warehouse_code", warehouseCode);
  }
  if (status !== undefined) {
    url.searchParams.set("status", status);
  }
  if (partNo !== undefined) {
    url.searchParams.set("part_no", partNo);
  }
  if (palletCode !== undefined) {
    url.searchParams.set("pallet_code", palletCode);
  }
  const res = await fetch(url);
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function getPalletDetail(
  baseUrl: string,
  palletCode?: string
): Promise<ScanPostResult> {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/pallets/detail`);
  if (palletCode !== undefined) {
    url.searchParams.set("pallet_code", palletCode);
  }
  const res = await fetch(url);
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function getEmptyPallets(
  baseUrl: string,
  warehouseCode?: string
): Promise<ScanPostResult> {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/pallets/empty`);
  if (warehouseCode !== undefined) {
    url.searchParams.set("warehouse_code", warehouseCode);
  }
  const res = await fetch(url);
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function postPalletProjectNoUpdate(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/pallets/project-no/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function getWarehouseLocationsSearch(
  baseUrl: string,
  params?: { warehouseCode?: string; locationCode?: string; isActive?: string }
): Promise<ScanPostResult> {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/warehouse-locations/search`);
  if (params?.warehouseCode !== undefined) {
    url.searchParams.set("warehouse_code", params.warehouseCode);
  }
  if (params?.locationCode !== undefined) {
    url.searchParams.set("location_code", params.locationCode);
  }
  if (params?.isActive !== undefined) {
    url.searchParams.set("is_active", params.isActive);
  }
  const res = await fetch(url);
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function getWarehouseLocationsUnregistered(
  baseUrl: string
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/warehouse-locations/unregistered`);
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function getWarehouseLocationCheck(
  baseUrl: string,
  params?: { warehouseCode?: string; locationCode?: string }
): Promise<ScanPostResult> {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/warehouse-locations/check`);
  if (params?.warehouseCode !== undefined) {
    url.searchParams.set("warehouse_code", params.warehouseCode);
  }
  if (params?.locationCode !== undefined) {
    url.searchParams.set("location_code", params.locationCode);
  }
  const res = await fetch(url);
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function postWarehouseLocationCreate(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/warehouse-locations/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function postWarehouseLocationActiveUpdate(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<ScanPostResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/warehouse-locations/active/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { _parseError: true, rawText };
    }
  }
  return { status: res.status, json, rawText };
}

export async function getHealth(baseUrl: string): Promise<{
  status: number;
  json: unknown;
}> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/health`);
  const rawText = await res.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = null;
    }
  }
  return { status: res.status, json };
}

export async function optionsScans(baseUrl: string): Promise<Response> {
  return fetch(`${baseUrl.replace(/\/$/, "")}/scans`, { method: "OPTIONS" });
}
