import kleur from "kleur";
import type { Logger } from "./plugin.js";

export const logger: Logger = {
  info: (msg) => console.log(kleur.cyan("›"), msg),
  warn: (msg) => console.warn(kleur.yellow("!"), msg),
  error: (msg) => console.error(kleur.red("✖"), msg),
  success: (msg) => console.log(kleur.green("✔"), msg),
};
