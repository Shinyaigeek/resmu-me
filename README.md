# resmu-me

Author your resume / 職務履歴書 once in MDX, ship it anywhere via plugins.

- **One source of truth**: write your profile in MDX with structured frontmatter.
- **Output plugins**: render to PDF, plain text, web, slides — whatever you plug in.
- **Sync plugins**: push updates to external media (GitHub profiles, LinkedIn-style services, custom APIs) through a uniform plugin contract.
- **Interactive wizard**: the `resmu profile` command walks you through sharpening your profile conversationally.

Status: early scaffolding — core types, CLI, MDX loader, built-in `plain` and `pdf` output plugins, and an LLM-assisted `refine` command are in place.

## Quickstart

```bash
npm install
npm run build
node ./dist/cli.js init      # scaffold a project in the cwd
node ./dist/cli.js build     # run all output plugins
node ./dist/cli.js profile   # interactive wizard
```

Or try the bundled example:

```bash
npm run build
cd examples
node ../dist/cli.js build
cat out/resume.txt
```

## Concepts

### Profile

Your profile lives in a single MDX file. Structured data (experiences, skills, projects) goes in frontmatter so plugins can render it reliably. The MDX body is yours — use it for narrative sections.

### Config

`resmu.config.mjs` wires the source file to a list of plugins:

```js
import { defineConfig } from "resmu-me/plugin";
import plain from "resmu-me/plugins/plain";

export default defineConfig({
  source: "profile/index.mdx",
  outDir: "out",
  plugins: [plain()],
});
```

### Plugin API

A plugin is a small JS object. Two kinds are supported today:

```ts
// Output plugin — turns a Profile into artifacts on disk
{
  kind: "output",
  name: "my-pdf",
  async render(profile, ctx) {
    return { path: "resume.pdf", contents: buffer };
  }
}

// Sync plugin — pushes profile to an external medium
{
  kind: "sync",
  name: "my-site",
  async push(profile, ctx) {
    // call your API here
    return { target: "https://example.com/me", status: "ok" };
  }
}
```

See `src/plugins/plain` for a complete reference implementation.

## Commands

| Command | What it does |
| --- | --- |
| `resmu init` | scaffold `profile/index.mdx` and `resmu.config.mjs` |
| `resmu build [target]` | run all output plugins (or a single one by name) |
| `resmu sync [target]` | run all sync plugins (or a single one by name) |
| `resmu profile` | interactive wizard — drafts / refines your MDX |
| `resmu refine` | LLM-assisted rewrite (tighten highlights, draft summary, free-form) — needs `ANTHROPIC_API_KEY` |

## LLM refine

`resmu refine` sends your current MDX to Claude (`claude-opus-4-7`) and streams a revised version back. Pick a preset (tighten highlights, draft summary, suggest skill categorization) or give a free-form instruction. The revision is shown first; you confirm before it overwrites the file.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
resmu refine --source profile/index.mdx
```

## Roadmap

- HTML / themed web output plugin
- First-party sync plugins (GitHub profile README, custom webhook)
- Diff preview for `refine` before write
- Plugin presets for common job-hunting workflows

## License

MIT
