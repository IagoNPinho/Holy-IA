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

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const rawName = process.argv.slice(2).join(" ").trim();

if (!rawName) {
  console.error("Usage: node scripts/new-task.js <task-name>");
  process.exit(1);
}

const slug = slugify(rawName);
const date = formatDate(new Date());
const dir = "docs/07-task-log";
const filePath = path.join(dir, `${date}-${slug}.md`);

ensureDir(dir);

if (fs.existsSync(filePath)) {
  console.error(`Task log already exists: ${filePath}`);
  process.exit(1);
}

const content = `# Task Log: ${rawName}

## Date
${date}

## Objective

## Scope

## Out of Scope

## Plan

## Files Changed

## Validation

## Documentation Updated

## Notes / Risks

## Final Outcome
`;

fs.writeFileSync(filePath, content, "utf8");
console.log(`Created: ${filePath}`);