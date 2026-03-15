import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

let loaded = false;

export function loadEnv() {
  if (loaded) return;

  const rootEnv = path.resolve(process.cwd(), ".env");

  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
    console.log("[loadEnv] loaded root env:", rootEnv);
  } else {
    console.log("[loadEnv] root .env not found:", rootEnv);
  }

  loaded = true;
}
