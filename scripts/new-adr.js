const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function titleCase(input) {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getNextAdrNumber(dir) {
  if (!fs.existsSync(dir)) return 1;

  const files = fs.readdirSync(dir);
  const numbers = files
    .map((file) => {
      const match = file.match(/^ADR-(\d+)-/i);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n) => Number.isInteger(n));

  if (numbers.length === 0) return 1;
  return Math.max(...numbers) + 1;
}

const rawName = process.argv.slice(2).join(" ").trim();

if (!rawName) {
  console.error("Usage: node scripts/new-adr.js <decision-name>");
  process.exit(1);
}

const dir = "docs/02-decisions";
ensureDir(dir);

const adrNumber = String(getNextAdrNumber(dir)).padStart(3, "0");
const slug = slugify(rawName);
const title = titleCase(rawName);
const filePath = path.join(dir, `ADR-${adrNumber}-${slug}.md`);

if (fs.existsSync(filePath)) {
  console.error(`ADR already exists: ${filePath}`);
  process.exit(1);
}

const content = `# ADR-${adrNumber}: ${title}

## Status
Proposed

## Context

## Decision

## Consequences

## Alternatives Considered
`;

fs.writeFileSync(filePath, content, "utf8");
console.log(`Created: ${filePath}`);