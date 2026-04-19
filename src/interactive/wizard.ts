import { input, select, confirm } from "@inquirer/prompts";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { logger } from "../core/logger.js";
import type { Profile } from "../core/types.js";
import { loadProfile } from "../core/loader.js";

export async function runProfileWizard(source: string, cwd = process.cwd()) {
  let profile: Profile | undefined;
  try {
    profile = await loadProfile(source, cwd);
    logger.info(`Loaded existing profile for ${profile.meta.name}`);
  } catch {
    logger.info("No existing profile — starting fresh");
  }

  const name = await input({
    message: "あなたの名前",
    default: profile?.meta.name,
  });
  const headline = await input({
    message: "一行キャッチ (ex: Frontend engineer who ships fast)",
    default: profile?.meta.headline ?? "",
  });
  const focusArea = await select({
    message: "今いちばん推していきたい領域は？",
    choices: [
      { name: "Frontend", value: "frontend" },
      { name: "Backend", value: "backend" },
      { name: "Infra / Platform", value: "infra" },
      { name: "Product / Leadership", value: "product" },
      { name: "Mixed", value: "mixed" },
    ],
  });

  const addHighlight = await confirm({
    message: "最近の目玉エピソードを1件追加する？",
    default: true,
  });

  let highlight = "";
  if (addHighlight) {
    highlight = await input({
      message: "ざっくり一文で (数値と『自分がやったこと』が入ると強い)",
    });
  }

  const suggestion = buildSuggestion({ name, headline, focusArea, highlight });
  logger.success("提案されたプロフィール:");
  console.log("\n" + suggestion + "\n");

  const write = await confirm({
    message: `このドラフトを ${source} に保存する？`,
    default: false,
  });
  if (write) {
    await writeFile(resolve(cwd, source), suggestion, "utf8");
    logger.success(`wrote ${source}`);
  } else {
    logger.info("保存はスキップしました");
  }
}

function buildSuggestion(input: {
  name: string;
  headline: string;
  focusArea: string;
  highlight: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const highlightBlock = input.highlight
    ? `\n## Recent highlight\n\n- ${input.highlight}\n`
    : "";
  return `---
name: ${input.name}
headline: ${input.headline}
updatedAt: ${today}
focus: ${input.focusArea}
experiences: []
skills: []
---

# ${input.name}

${input.headline}
${highlightBlock}`;
}
