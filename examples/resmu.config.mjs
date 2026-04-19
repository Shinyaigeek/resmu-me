import { defineConfig } from "../dist/plugin.js";
import plain from "../dist/plugins/plain/index.js";

export default defineConfig({
  source: "profile.mdx",
  outDir: "out",
  plugins: [plain()],
});
