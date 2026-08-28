import { readFileSync } from "node:fs";
const files = ["components/admin/ProductModal.tsx", "components/admin/ComponentModal.tsx"];
const css = readFileSync("public/css/style.css", "utf8");
const used = new Set();
for (const f of files) {
  const txt = readFileSync(f, "utf8");
  const re = /className=(?:\{([^}]*)\}|["'`]([^"'`]+)["'`])/g;
  let m;
  while ((m = re.exec(txt))) {
    const part = m[1] || m[2] || "";
    for (const tok of part.split(/\s+/)) {
      const c = tok.trim().replace(/[{}`"'+\s]/g, "");
      if (c && /^[a-z][a-z0-9_-]+$/.test(c)) used.add(c);
    }
  }
}
const missing = [];
for (const c of used) {
  if (!new RegExp("\\." + c + "[ ,.{}:]").test(css)) missing.push(c);
}
console.log("Отсутствуют в style.css:", missing.sort().join(", ") || "—");
