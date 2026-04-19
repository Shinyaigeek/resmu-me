import { pathToFileURL } from "node:url";
import { access, constants } from "node:fs/promises";
import { resolve } from "node:path";
import type { ResmuConfig } from "./plugin.js";

const CANDIDATES = ["resmu.config.mjs", "resmu.config.js"];

export async function loadConfig(cwd = process.cwd()): Promise<ResmuConfig> {
  for (const name of CANDIDATES) {
    const abs = resolve(cwd, name);
    try {
      await access(abs, constants.F_OK);
    } catch {
      continue;
    }
    const mod = await import(pathToFileURL(abs).href);
    const config = (mod.default ?? mod.config) as ResmuConfig | undefined;
    if (!config) {
      throw new Error(`${name} did not export a default config`);
    }
    return config;
  }
  throw new Error(
    `No resmu config found. Create resmu.config.mjs at ${cwd}`,
  );
}
