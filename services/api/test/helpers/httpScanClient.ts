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
