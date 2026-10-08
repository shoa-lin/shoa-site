import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// npm ci on CI (npm 11.19) rejects a lock file in which a locked package's required peer has no
// entry, while older local npm versions accept it, and `npm install` sometimes prunes such peers
// (it dropped @emnapi/core, the peer of @napi-rs/wasm-runtime, twice). Catch that before pushing.
test("every required peer dependency of a locked package has its own lock entry", () => {
  const { packages } = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  const resolves = (from, name) => {
    const levels = from.split("/node_modules/");
    for (let depth = levels.length; depth >= 1; depth -= 1) {
      if (packages[`${levels.slice(0, depth).join("/node_modules/")}/node_modules/${name}`]) return true;
    }
    return Boolean(packages[`node_modules/${name}`]);
  };
  const missing = Object.entries(packages).flatMap(([path, entry]) => (path
    ? Object.keys(entry.peerDependencies ?? {})
      .filter((name) => !entry.peerDependenciesMeta?.[name]?.optional && !resolves(path, name))
      .map((name) => `${path} needs ${name}`)
    : []));

  assert.deepEqual(missing, [], "restore the missing entries in package-lock.json (see PR #10), then check with the npm version CI uses");
});
