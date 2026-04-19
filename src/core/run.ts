import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { OutputArtifact, OutputPlugin, Plugin, ResmuConfig, SyncPlugin } from "./plugin.js";
import { loadProfile } from "./loader.js";
import { logger } from "./logger.js";

export async function runBuild(config: ResmuConfig, target: string | undefined, cwd = process.cwd()) {
  const profile = await loadProfile(config.source, cwd);
  const outputs = pickOutputs(config.plugins, target);
  if (outputs.length === 0) {
    logger.warn(`No output plugin matched target: ${target ?? "(all)"}`);
    return;
  }

  for (const plugin of outputs) {
    logger.info(`building with ${plugin.name}`);
    const result = await plugin.render(profile, {
      cwd,
      logger,
      config,
    });
    const artifacts = Array.isArray(result) ? result : [result];
    for (const art of artifacts) {
      await writeArtifact(cwd, config.outDir, art);
    }
    logger.success(`${plugin.name} done`);
  }
}

export async function runSync(config: ResmuConfig, target: string | undefined, cwd = process.cwd()) {
  const profile = await loadProfile(config.source, cwd);
  const syncs = pickSyncs(config.plugins, target);
  if (syncs.length === 0) {
    logger.warn(`No sync plugin matched target: ${target ?? "(all)"}`);
    return;
  }

  for (const plugin of syncs) {
    logger.info(`syncing with ${plugin.name}`);
    const res = await plugin.push(profile, { cwd, logger, config });
    if (res.status === "ok") logger.success(`${plugin.name} → ${res.target}`);
    else if (res.status === "skipped") logger.warn(`${plugin.name} skipped: ${res.detail ?? ""}`);
    else logger.error(`${plugin.name} failed: ${res.detail ?? ""}`);
  }
}

function pickOutputs(plugins: Plugin[], target: string | undefined): OutputPlugin[] {
  return plugins.filter((p): p is OutputPlugin => p.kind === "output" && (!target || p.name === target));
}

function pickSyncs(plugins: Plugin[], target: string | undefined): SyncPlugin[] {
  return plugins.filter((p): p is SyncPlugin => p.kind === "sync" && (!target || p.name === target));
}

async function writeArtifact(cwd: string, outDir: string, artifact: OutputArtifact) {
  const abs = resolve(cwd, outDir, artifact.path);
  await mkdir(dirname(abs), { recursive: true });
  const data = typeof artifact.contents === "string" ? artifact.contents : Buffer.from(artifact.contents);
  await writeFile(abs, data);
  logger.info(`wrote ${abs}`);
}
