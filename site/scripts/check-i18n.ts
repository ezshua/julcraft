import { ru } from "../lib/dictionaries/ru";
import { en } from "../lib/dictionaries/en";
import { uk } from "../lib/dictionaries/uk";

function keyTree(value: object): Set<string> {
  const keys = new Set<string>();
  for (const key of Object.keys(value)) {
    const child: unknown = (value as Record<string, unknown>)[key];
    if (child !== null && typeof child === "object" && !Array.isArray(child)) {
      for (const sub of keyTree(child)) keys.add(`${key}.${sub}`);
    } else {
      keys.add(key);
    }
  }
  return keys;
}

const trees: Record<string, Set<string>> = {
  ru: keyTree(ru),
  en: keyTree(en),
  uk: keyTree(uk),
};

let failed = false;
for (const locale of ["en", "uk"] as const) {
  const other = trees[locale];
  const missing = [...trees.ru].filter((k) => !other.has(k));
  const extra = [...other].filter((k) => !trees.ru.has(k));
  for (const key of missing) {
    console.error(`FAIL ${locale}: отсутствует ключ "${key}"`);
    failed = true;
  }
  for (const key of extra) {
    console.error(`FAIL ${locale}: лишний ключ "${key}"`);
    failed = true;
  }
  if (!failed) {
    console.log(`OK ${locale}: ключи синхронны с ru (${other.size})`);
  }
}

console.log(`ru: ${trees.ru.size}, en: ${trees.en.size}, uk: ${trees.uk.size}`);

if (failed) {
  console.error("FAIL: деревья ключей ru/en/uk расходятся");
  process.exit(1);
}
