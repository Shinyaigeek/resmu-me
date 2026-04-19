export type BodyBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] };

export function parseBody(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  const lines = body.split("\n");
  let buffer: string[] = [];
  let mode: "paragraph" | "bullets" | null = null;

  const flush = () => {
    if (buffer.length === 0) return;
    if (mode === "bullets") {
      blocks.push({ type: "bullets", items: buffer.slice() });
    } else if (mode === "paragraph") {
      blocks.push({ type: "paragraph", text: buffer.join(" ") });
    }
    buffer = [];
    mode = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flush();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({
        type: "heading",
        level: heading[1]!.length,
        text: stripInline(heading[2]!),
      });
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (mode !== "bullets") flush();
      buffer.push(stripInline(bullet[1]!));
      mode = "bullets";
      continue;
    }
    if (mode === "bullets") flush();
    buffer.push(stripInline(line));
    mode = "paragraph";
  }
  flush();
  return blocks;
}

export function stripInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}
