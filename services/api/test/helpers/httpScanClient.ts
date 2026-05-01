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
