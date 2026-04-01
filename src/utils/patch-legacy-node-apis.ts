import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function patchLegacyNodeApis() {
  const legacyUtil: Record<string, unknown> = require("node:util");

  if (typeof legacyUtil.isObject !== "function") {
    legacyUtil.isObject = (value: unknown) => typeof value === "object" && value !== null;
  }

  if (typeof legacyUtil.isFunction !== "function") {
    legacyUtil.isFunction = (value: unknown) => typeof value === "function";
  }
}
