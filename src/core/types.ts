export interface Profile {
  meta: ProfileMeta;
  summary?: string;
  experiences: Experience[];
  skills: SkillGroup[];
  projects?: Project[];
  education?: Education[];
  raw: {
    frontmatter: Record<string, unknown>;
    body: string;
    compiledJsx?: string;
  };
}

export interface ProfileMeta {
  name: string;
  headline?: string;
  email?: string;
  location?: string;
  links?: Record<string, string>;
  updatedAt?: string;
}

export interface Experience {
  company: string;
  role: string;
  start: string;
  end?: string;
  location?: string;
  highlights: string[];
  tags?: string[];
  description?: string;
}

export interface SkillGroup {
  category: string;
  items: Skill[];
}

export interface Skill {
  name: string;
  level?: "familiar" | "comfortable" | "proficient" | "expert";
  years?: number;
  note?: string;
}

export interface Project {
  name: string;
  url?: string;
  description: string;
  tags?: string[];
}

export interface Education {
  school: string;
  degree?: string;
  start?: string;
  end?: string;
}
