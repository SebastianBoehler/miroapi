const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const requiredFiles = ["README.md", "LICENSE", "index.js", "package.json"];

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}

const pkg = require(path.join(repoRoot, "package.json"));
const library = require(path.join(repoRoot, "index.js"));

if (pkg.main !== "index.js") {
  throw new Error(`Expected package.json main to be index.js, received ${pkg.main}`);
}

const expectedExports = [
  "MiroRequests",
  "ThinkificAPI",
  "JiraClass",
  "conceptBoard",
  "ConceptBoard",
];

for (const exportName of expectedExports) {
  if (typeof library[exportName] !== "function") {
    throw new Error(`Expected export ${exportName} to be a function or class`);
  }
}

console.log("Repository validation passed.");
