import type { Profile } from "./types.js";

export interface PluginContext {
  cwd: string;
  logger: Logger;
  config: ResmuConfig;
}

export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  success(msg: string): void;
}

export interface OutputPlugin {
  kind: "output";
  name: string;
  render(profile: Profile, ctx: PluginContext): Promise<OutputArtifact | OutputArtifact[]>;
}

export interface SyncPlugin {
  kind: "sync";
  name: string;
  push(profile: Profile, ctx: PluginContext): Promise<SyncResult>;
}

export type Plugin = OutputPlugin | SyncPlugin;

export interface OutputArtifact {
  path: string;
  contents: string | Uint8Array;
  contentType?: string;
}

export interface SyncResult {
  target: string;
  status: "ok" | "skipped" | "failed";
  detail?: string;
}

export interface ResmuConfig {
  source: string;
  outDir: string;
  plugins: Plugin[];
}

export function defineConfig(config: ResmuConfig): ResmuConfig {
  return config;
}
