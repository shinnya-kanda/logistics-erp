/**
 * 契約テスト用: 開発 DB と分離するなら SCAN_CONTRACT_TEST_DATABASE_URL を設定。
 * 未設定時は DATABASE_URL のまま（DB 系テストは skip）。
 */
const contractUrl = process.env.SCAN_CONTRACT_TEST_DATABASE_URL?.trim();
if (contractUrl) {
  process.env.DATABASE_URL = contractUrl;
}
