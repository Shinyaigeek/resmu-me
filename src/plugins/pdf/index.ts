import PDFDocument from "pdfkit";
import type { OutputPlugin } from "../../core/plugin.js";
import type { Profile } from "../../core/types.js";
import { parseBody } from "../../core/body.js";

export interface PdfOptions {
  filename?: string;
  accentColor?: string;
}

export default function pdf(options: PdfOptions = {}): OutputPlugin {
  return {
    kind: "output",
    name: "pdf",
    async render(profile) {
      const bytes = await renderPdf(profile, options);
      return {
        path: options.filename ?? "resume.pdf",
        contents: bytes,
        contentType: "application/pdf",
      };
    },
  };
}

// Bare URLs inside flowing text (stripInline renders markdown links as
// "text (url)") become clickable link annotations: the text is emitted as
// continued runs, with `link` set only on the URL spans, which are drawn
// in the link color with an underline so they read as links on paper too.
const URL_RE = /(https?:\/\/[^\s()<>\u3000-\uffff]*[^\s()<>\u3000-\uffff.,;:])/;

const LINK_COLOR = "#1f6feb";

function textWithLinks(doc: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) {
  const parts = text.split(URL_RE).filter((p) => p !== "");
  if (parts.length === 0) {
    doc.text(text, options);
    return;
  }
  const bodyColor = ((doc as unknown as { _fillColor?: unknown[] })._fillColor?.[0] ?? "#222") as string;
  parts.forEach((part, i) => {
    const isUrl = /^https?:\/\//.test(part);
    doc.fillColor(isUrl ? LINK_COLOR : bodyColor).text(part, {
      ...options,
      continued: i < parts.length - 1,
      link: isUrl ? part : (null as unknown as string),
      underline: isUrl,
    });
  });
  doc.fillColor(bodyColor);
}

function renderPdf(profile: Profile, options: PdfOptions): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 54, size: "LETTER" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);

    const accent = options.accentColor ?? "#1f6feb";

    doc.fillColor("#111").font("Helvetica-Bold").fontSize(24).text(profile.meta.name);
    if (profile.meta.headline) {
      doc.moveDown(0.2).font("Helvetica").fontSize(12).fillColor("#555").text(profile.meta.headline);
    }
    const contactBits = [profile.meta.email, profile.meta.location].filter(Boolean);
    if (profile.meta.links) {
      for (const [k, v] of Object.entries(profile.meta.links)) contactBits.push(`${k}: ${v}`);
    }
    if (contactBits.length) {
      doc.moveDown(0.3).fontSize(10).fillColor("#444");
      textWithLinks(doc, contactBits.join("  ·  "));
    }
    doc.moveDown(0.8);

    if (profile.summary) {
      heading(doc, "Summary", accent);
      doc.font("Helvetica").fontSize(11).fillColor("#222");
      textWithLinks(doc, profile.summary, { align: "left", lineGap: 2 });
      doc.moveDown(0.6);
    }

    if (profile.experiences.length > 0) {
      heading(doc, "Experience", accent);
      for (const exp of profile.experiences) {
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor("#111")
          .text(`${exp.role} — ${exp.company}`, { continued: false });
        const meta = [`${exp.start} — ${exp.end ?? "present"}`, exp.location].filter(Boolean).join("  ·  ");
        doc.font("Helvetica-Oblique").fontSize(10).fillColor("#666").text(meta);
        doc.moveDown(0.2);
        doc.font("Helvetica").fontSize(11).fillColor("#222");
        for (const h of exp.highlights) {
          textWithLinks(doc, `•  ${h}`, { indent: 6, lineGap: 2 });
        }
        if (exp.tags?.length) {
          doc.moveDown(0.1).font("Helvetica-Oblique").fontSize(9).fillColor("#888").text(exp.tags.join(" · "));
        }
        doc.moveDown(0.5);
      }
    }

    if (profile.skills.length > 0) {
      heading(doc, "Skills", accent);
      for (const g of profile.skills) {
        const items = g.items.map((s) => (s.level ? `${s.name} (${s.level})` : s.name)).join(", ");
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor("#111")
          .text(`${g.category}: `, { continued: true })
          .font("Helvetica")
          .fillColor("#222")
          .text(items);
      }
      doc.moveDown(0.4);
    }

    if (profile.projects?.length) {
      heading(doc, "Projects", accent);
      for (const p of profile.projects) {
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#111").text(p.name);
        if (p.url) doc.font("Helvetica-Oblique").fontSize(9).fillColor(accent).text(p.url, { link: p.url });
        doc.font("Helvetica").fontSize(11).fillColor("#222");
        textWithLinks(doc, p.description, { lineGap: 2 });
        doc.moveDown(0.3);
      }
    }

    if (profile.education?.length) {
      heading(doc, "Education", accent);
      for (const e of profile.education) {
        const period = [e.start, e.end].filter(Boolean).join(" — ");
        const line = `${e.school}${e.degree ? ` · ${e.degree}` : ""}${period ? `  (${period})` : ""}`;
        doc.font("Helvetica").fontSize(11).fillColor("#222").text(line);
      }
      doc.moveDown(0.4);
    }

    const bodyBlocks = parseBody(profile.raw.body);
    for (const block of bodyBlocks) {
      if (block.type === "heading") {
        if (block.level <= 2) {
          heading(doc, block.text, accent);
        } else {
          doc.moveDown(0.3);
          doc.font("Helvetica-Bold").fontSize(11).fillColor("#111").text(block.text);
          doc.moveDown(0.1);
        }
      } else if (block.type === "paragraph") {
        doc.font("Helvetica").fontSize(11).fillColor("#222");
        textWithLinks(doc, block.text, { lineGap: 2 });
        doc.moveDown(0.3);
      } else {
        doc.font("Helvetica").fontSize(11).fillColor("#222");
        for (const item of block.items) textWithLinks(doc, `•  ${item}`, { indent: 6, lineGap: 2 });
        doc.moveDown(0.3);
      }
    }

    doc.end();
  });
}

function heading(doc: PDFKit.PDFDocument, text: string, accent: string) {
  doc.moveDown(0.2);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(accent).text(text.toUpperCase(), {
    characterSpacing: 1.2,
  });
  const y = doc.y + 2;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor(accent)
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.4);
}
