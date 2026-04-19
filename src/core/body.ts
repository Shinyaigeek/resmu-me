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
    if (raw.trim() === "") {
      flush();
      continue;
    }
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(raw.trim());
    if (headingMatch) {
      flush();
      blocks.push({
        type: "heading",
        level: headingMatch[1]!.length,
        text: stripInline(headingMatch[2]!),
      });
      continue;
    }
    const bulletMatch = /^[-*]\s+(.*)$/.exec(raw.trim());
    if (bulletMatch) {
      if (mode !== "bullets") flush();
      buffer.push(stripInline(bulletMatch[1]!));
      mode = "bullets";
      continue;
    }
    const isIndentedContinuation = /^\s{2,}\S/.test(raw);
    if (mode === "bullets" && isIndentedContinuation && buffer.length > 0) {
      buffer[buffer.length - 1] = `${buffer[buffer.length - 1]} ${stripInline(raw.trim())}`;
      continue;
    }
    if (mode === "bullets") flush();
    buffer.push(stripInline(raw.trim()));
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
