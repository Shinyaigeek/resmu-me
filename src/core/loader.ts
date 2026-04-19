import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import matter from "gray-matter";
import { compile } from "@mdx-js/mdx";
import type {
  Education,
  Experience,
  Profile,
  ProfileMeta,
  Project,
  Skill,
  SkillGroup,
} from "./types.js";

export async function loadProfile(filepath: string, cwd = process.cwd()): Promise<Profile> {
  const abs = resolve(cwd, filepath);
  const raw = await readFile(abs, "utf8");
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;

  const compiled = await compile(parsed.content, {
    outputFormat: "function-body",
    development: false,
  });

  return {
    meta: readMeta(data),
    summary: typeof data.summary === "string" ? data.summary : undefined,
    experiences: readExperiences(data.experiences),
    skills: readSkills(data.skills),
    projects: readProjects(data.projects),
    education: readEducation(data.education),
    raw: {
      frontmatter: data,
      body: parsed.content,
      compiledJsx: String(compiled.value),
    },
  };
}

function readMeta(data: Record<string, unknown>): ProfileMeta {
  const name = typeof data.name === "string" ? data.name : "Unnamed";
  return {
    name,
    headline: str(data.headline),
    email: str(data.email),
    location: str(data.location),
    links: isRecord(data.links) ? (data.links as Record<string, string>) : undefined,
    updatedAt: str(data.updatedAt),
  };
}

function readExperiences(value: unknown): Experience[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): Experience[] => {
    if (!isRecord(entry)) return [];
    const company = str(entry.company);
    const role = str(entry.role);
    const start = str(entry.start);
    if (!company || !role || !start) return [];
    return [
      {
        company,
        role,
        start,
        end: str(entry.end),
        location: str(entry.location),
        description: str(entry.description),
        highlights: Array.isArray(entry.highlights)
          ? entry.highlights.filter((h): h is string => typeof h === "string")
          : [],
        tags: Array.isArray(entry.tags)
          ? entry.tags.filter((t): t is string => typeof t === "string")
          : undefined,
      },
    ];
  });
}

function readSkills(value: unknown): SkillGroup[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): SkillGroup[] => {
    if (!isRecord(entry)) return [];
    const category = str(entry.category);
    if (!category) return [];
    const items = Array.isArray(entry.items)
      ? entry.items.flatMap((item): Skill[] => {
          if (typeof item === "string") return [{ name: item }];
          if (!isRecord(item)) return [];
          const name = str(item.name);
          if (!name) return [];
          return [
            {
              name,
              level: parseLevel(item.level),
              years: typeof item.years === "number" ? item.years : undefined,
              note: str(item.note),
            },
          ];
        })
      : [];
    return [{ category, items }];
  });
}

function readProjects(value: unknown): Project[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry): Project[] => {
    if (!isRecord(entry)) return [];
    const name = str(entry.name);
    const description = str(entry.description);
    if (!name || !description) return [];
    return [
      {
        name,
        description,
        url: str(entry.url),
        tags: Array.isArray(entry.tags)
          ? entry.tags.filter((t): t is string => typeof t === "string")
          : undefined,
      },
    ];
  });
}

function readEducation(value: unknown): Education[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry): Education[] => {
    if (!isRecord(entry)) return [];
    const school = str(entry.school);
    if (!school) return [];
    return [
      {
        school,
        degree: str(entry.degree),
        start: str(entry.start),
        end: str(entry.end),
      },
    ];
  });
}

function parseLevel(value: unknown): Skill["level"] {
  if (value === "familiar" || value === "comfortable" || value === "proficient" || value === "expert") {
    return value;
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
