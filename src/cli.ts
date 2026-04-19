#!/usr/bin/env node
import { Command } from "commander";
import { loadConfig } from "./core/config.js";
import { runBuild, runSync } from "./core/run.js";
import { runProfileWizard } from "./interactive/wizard.js";
import { runRefine } from "./interactive/llm.js";
import { logger } from "./core/logger.js";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const program = new Command();

program
  .name("resmu")
  .description("Author your resume in MDX, output to anywhere via plugins")
  .version("0.0.1");

program
  .command("init")
  .description("Scaffold a resmu project in the current directory")
  .action(async () => {
    const cwd = process.cwd();
    await mkdir(resolve(cwd, "profile"), { recursive: true });
    await writeFile(
      resolve(cwd, "profile/index.mdx"),
      SAMPLE_MDX,
      { flag: "wx" },
    ).catch(() => logger.warn("profile/index.mdx already exists — skipping"));
    await writeFile(
      resolve(cwd, "resmu.config.mjs"),
      SAMPLE_CONFIG,
      { flag: "wx" },
    ).catch(() => logger.warn("resmu.config.mjs already exists — skipping"));
    logger.success("Initialized. Run `resmu build` to generate artifacts.");
  });

program
  .command("build [target]")
  .description("Run output plugins (all, or a specific plugin by name)")
  .action(async (target?: string) => {
    const config = await loadConfig();
    await runBuild(config, target);
  });

program
  .command("sync [target]")
  .description("Run sync plugins to push profile to remote media")
  .action(async (target?: string) => {
    const config = await loadConfig();
    await runSync(config, target);
  });

program
  .command("profile")
  .description("Interactively draft or refine your profile")
  .option("-s, --source <path>", "path to MDX source", "profile/index.mdx")
  .action(async (opts: { source: string }) => {
    await runProfileWizard(opts.source);
  });

program
  .command("refine")
  .description("Use Claude to rewrite parts of your MDX profile")
  .option("-s, --source <path>", "path to MDX source", "profile/index.mdx")
  .action(async (opts: { source: string }) => {
    await runRefine({ source: opts.source });
  });

program.parseAsync().catch((err) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

const SAMPLE_MDX = `---
name: Your Name
headline: Software engineer who ships
email: you@example.com
updatedAt: ${new Date().toISOString().slice(0, 10)}
links:
  github: https://github.com/yourname
experiences:
  - company: ACME
    role: Senior Software Engineer
    start: "2022-04"
    end: "present"
    highlights:
      - Shipped X that moved metric Y by Z%
    tags: [typescript, react, node]
skills:
  - category: Languages
    items:
      - name: TypeScript
        level: expert
      - name: Go
        level: proficient
---

# Your Name

A short narrative intro goes here. You can use **MDX** freely.
`;

const SAMPLE_CONFIG = `import { defineConfig } from "resmu-me/plugin";
import plain from "resmu-me/plugins/plain";

export default defineConfig({
  source: "profile/index.mdx",
  outDir: "out",
  plugins: [
    plain(),
    // add your own plugins here — PDF, web, API sync, etc.
  ],
});
`;
