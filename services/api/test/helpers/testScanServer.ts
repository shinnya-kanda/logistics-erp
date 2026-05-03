import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { handleScanHttp } from "../../src/scanHttpHandler.js";

export type TestScanServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

export type StartTestScanServerOptions = {
  /** 既定 true。false で JWT / profile 検証を有効にする（契約テストの認証系のみ）。 */
  skipAuthGuard?: boolean;
};

/**
 * ランダムポートで scan HTTP ハンドラを起動（契約テスト用）。
 */
export async function startTestScanServer(
  opts?: StartTestScanServerOptions
): Promise<TestScanServer> {
  const skipAuthGuard = opts?.skipAuthGuard ?? true;
  const server = createServer((req, res) => {
    void handleScanHttp(req, res, {
      corsOrigin: "*",
      skipAuthGuard,
    });
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
