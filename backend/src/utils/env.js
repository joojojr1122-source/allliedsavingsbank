const fs = require("fs");
const path = require("path");

function loadLocalEnv() {
  if (process.env.VERCEL) return;

  const envPath = path.join(__dirname, "..", "..", "..", ".env");

  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) return;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  });
}

module.exports = {
  loadLocalEnv
};
