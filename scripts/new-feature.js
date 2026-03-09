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

const rawName = process.argv.slice(2).join(" ").trim();

if (!rawName) {
  console.error("Usage: node scripts/new-feature.js <feature-name>");
  process.exit(1);
}

const slug = slugify(rawName);
const title = titleCase(rawName);
const dir = "docs/05-features";
const filePath = path.join(dir, `${slug}.md`);

ensureDir(dir);

if (fs.existsSync(filePath)) {
  console.error(`Feature file already exists: ${filePath}`);
  process.exit(1);
}

const content = `# Feature: ${title}

## Objective

## Scope

## Out of Scope

## User Flow

## Technical Notes

## API / Data Contracts

## Risks

## Acceptance Criteria
`;

fs.writeFileSync(filePath, content, "utf8");
console.log(`Created: ${filePath}`);