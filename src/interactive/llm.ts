import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { confirm, input, select } from "@inquirer/prompts";
import kleur from "kleur";
import { logger } from "../core/logger.js";

const MODEL = "claude-opus-4-7";

const SYSTEM_PROMPT = `You are a writing partner for software engineers revising their resumes / 職務履歴書.

Rules:
- Keep the MDX frontmatter structure intact. Never drop required fields.
- Prefer concrete, quantified bullet points over vague adjectives.
- Match the language the user is writing in — do not translate unless asked.
- Output ONLY the revised MDX content. No explanations, no markdown fences.
- Preserve YAML frontmatter keys and ordering when possible.
- When rewriting highlights, favor verbs + impact + metric.

When the user's instruction is ambiguous, make the safest interpretation and proceed.
`;

export interface RefineOptions {
  source: string;
  cwd?: string;
}

export async function runRefine({ source, cwd = process.cwd() }: RefineOptions): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.error("ANTHROPIC_API_KEY is not set. Export your key and try again.");
    process.exit(1);
  }

  const abs = resolve(cwd, source);
  const original = await readFile(abs, "utf8");

  const mode = await select({
    message: "What do you want to do?",
    choices: [
      { name: "Tighten highlights (make bullets punchier)", value: "highlights" },
      { name: "Draft / rewrite summary", value: "summary" },
      { name: "Suggest skill categorization", value: "skills" },
      { name: "Free-form instruction", value: "freeform" },
    ],
  });

  let instruction: string;
  if (mode === "freeform") {
    instruction = await input({
      message: "Your instruction for Claude",
    });
  } else {
    instruction = DEFAULT_INSTRUCTIONS[mode] ?? "";
  }

  const client = new Anthropic();
  logger.info(`Calling ${MODEL} (streaming)...`);

  let revised = "";
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildUserMessage(instruction, original),
          },
        ],
      },
    ],
  });

  process.stdout.write(kleur.dim("\n─── revised MDX ───\n"));
  stream.on("text", (delta) => {
    process.stdout.write(delta);
    revised += delta;
  });

  const final = await stream.finalMessage();
  process.stdout.write(kleur.dim("\n──────────────────\n\n"));

  if (final.stop_reason === "max_tokens") {
    logger.warn("Response was truncated (hit max_tokens). Output may be incomplete.");
  }

  if (!revised.trim()) {
    logger.error("No text returned from Claude.");
    return;
  }

  const usage = final.usage;
  logger.info(
    `tokens: in=${usage.input_tokens} out=${usage.output_tokens}` +
      (usage.cache_read_input_tokens ? ` cache_read=${usage.cache_read_input_tokens}` : "") +
      (usage.cache_creation_input_tokens ? ` cache_write=${usage.cache_creation_input_tokens}` : ""),
  );

  const write = await confirm({
    message: `Overwrite ${source} with this revision?`,
    default: false,
  });
  if (!write) {
    logger.info("Skipped writing. Original file untouched.");
    return;
  }

  await writeFile(abs, stripFences(revised), "utf8");
  logger.success(`wrote ${source}`);
}

const DEFAULT_INSTRUCTIONS: Record<string, string> = {
  highlights:
    "Rewrite each experience's highlights to be more impactful. Use strong verbs, concrete scope, and numbers where plausible. Keep the same number of bullets per experience. Do not invent metrics — if numbers are absent, keep qualitative but specific.",
  summary:
    "Draft or rewrite the top-level `summary` frontmatter field into 2–3 sentences that frame the candidate's trajectory and current focus. Keep the rest of the file unchanged.",
  skills:
    "Reorganize the skills frontmatter into cleaner categories if helpful. Do not invent skills that aren't listed. You may adjust `level` fields only if clearly supported by the experience section.",
};

function buildUserMessage(instruction: string, mdx: string): string {
  return `Here is the current MDX profile. Apply the instruction below and return the full revised MDX (including frontmatter).

### Instruction
${instruction}

### Current MDX
\`\`\`mdx
${mdx}
\`\`\`

Return the revised MDX file content only — no fences, no commentary.`;
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:mdx|md|markdown)?\n([\s\S]*?)\n```\s*$/);
  if (fenced && fenced[1]) return fenced[1] + "\n";
  return trimmed.endsWith("\n") ? trimmed : trimmed + "\n";
}
