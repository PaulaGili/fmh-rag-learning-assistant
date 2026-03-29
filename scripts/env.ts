import fs from "fs";
import path from "path";

export function loadEnv(): void {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local not found — set ANTHROPIC_API_KEY and AUTH_PASSWORD");
  }
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^=#+\s][^=]*)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}
