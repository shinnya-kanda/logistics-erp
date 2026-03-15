import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

let loaded = false;

function findEnvFile(startDir: string): string | null {
  let current = path.resolve(startDir);

  while (true) {
    const candidate = path.join(current, ".env");
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function loadEnv() {
  if (loaded) return;

  const candidates = [process.cwd(), process.env.INIT_CWD].filter(
    (v): v is string => Boolean(v)
  );

  for (const dir of candidates) {
    const envPath = findEnvFile(dir);
    if (envPath) {
      dotenv.config({ path: envPath });
      loaded = true;
      return;
    }
  }

  loaded = true;
}
