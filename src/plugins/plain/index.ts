import type { OutputPlugin } from "../../core/plugin.js";
import type { Profile } from "../../core/types.js";

export interface PlainOptions {
  filename?: string;
}

export default function plain(options: PlainOptions = {}): OutputPlugin {
  return {
    kind: "output",
    name: "plain",
    async render(profile) {
      return {
        path: options.filename ?? "resume.txt",
        contents: renderPlain(profile),
        contentType: "text/plain",
      };
    },
  };
}

function renderPlain(profile: Profile): string {
  const lines: string[] = [];
  lines.push(profile.meta.name);
  if (profile.meta.headline) lines.push(profile.meta.headline);
  const contact = [profile.meta.email, profile.meta.location].filter(Boolean).join(" · ");
  if (contact) lines.push(contact);
  if (profile.meta.links) {
    lines.push(
      Object.entries(profile.meta.links)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · "),
    );
  }
  lines.push("");

  if (profile.summary) {
    lines.push("SUMMARY");
    lines.push(profile.summary);
    lines.push("");
  }

  if (profile.experiences.length > 0) {
    lines.push("EXPERIENCE");
    for (const exp of profile.experiences) {
      const period = `${exp.start} — ${exp.end ?? "present"}`;
      lines.push(`${exp.role} @ ${exp.company}  (${period})`);
      if (exp.location) lines.push(`  ${exp.location}`);
      for (const h of exp.highlights) lines.push(`  - ${h}`);
      if (exp.tags?.length) lines.push(`  [${exp.tags.join(", ")}]`);
      lines.push("");
    }
  }

  if (profile.skills.length > 0) {
    lines.push("SKILLS");
    for (const g of profile.skills) {
      const items = g.items
        .map((s) => (s.level ? `${s.name} (${s.level})` : s.name))
        .join(", ");
      lines.push(`${g.category}: ${items}`);
    }
    lines.push("");
  }

  if (profile.projects?.length) {
    lines.push("PROJECTS");
    for (const p of profile.projects) {
      lines.push(`- ${p.name}${p.url ? ` — ${p.url}` : ""}`);
      lines.push(`  ${p.description}`);
    }
    lines.push("");
  }

  if (profile.education?.length) {
    lines.push("EDUCATION");
    for (const e of profile.education) {
      const period = [e.start, e.end].filter(Boolean).join(" — ");
      lines.push(`- ${e.school}${e.degree ? `, ${e.degree}` : ""}${period ? `  (${period})` : ""}`);
    }
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
