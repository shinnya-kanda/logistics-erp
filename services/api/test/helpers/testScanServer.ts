import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { handleScanHttp } from "../../src/scanHttpHandler.js";

export type TestScanServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

/**
 * ランダムポートで scan HTTP ハンドラを起動（契約テスト用）。
 */
export async function startTestScanServer(): Promise<TestScanServer> {
  const server = createServer((req, res) => {
    void handleScanHttp(req, res, { corsOrigin: "*" });
  });
  await new Promise<void>((resolve, reject) => {
    server.listen(0, () => resolve());
    server.on("error", reject);
  });
  const addr = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  return {
    baseUrl,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
