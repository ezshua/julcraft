// Мелкие утилиты над Markdown-текстом записи (plan-5-blog.md §7).
//
// Модуль намеренно без директивы "use client" и без server-only: его читают
// серверные страницы витрины, клиентский предпросмотр редактора и скрипты
// проверок.

// Путь загруженной картинки внутри Markdown. Берём только свой путь сайта:
// внешний адрес с тем же /uploads/... не является файлом снапшота.
const UPLOAD_PATH = /(?:^|[\s("'=])(\/uploads\/[^\s"'()<>\]]+)/g;

// Строка определения ссылки: [подпись]: адрес.
const DEF_LINK = /^[ \t]*\[([^\]]+)\]:[ \t]*\S+.*$/gm;

// Знаки конца предложения, которые мастер нередко ставит сразу после адреса.
const TRAILING_PUNCT = /[.,;:!?]+$/;

/**
 * Чистый текст из Markdown — основа автоматического metaDescription.
 *
 * Снимает разметку инлайнов и блоков и схлопывает пробелы. Обрезка до
 * 160 символов остаётся на стороне вызова: утилита отвечает только за текст.
 */
export function stripMarkdown(src: string): string {
  if (!src) return "";

  // Подписи ссылок-определений: их нужно знать до того, как исчезнут строки
  // с самими определениями, иначе [подпись] осталась бы в тексте скобками.
  const refs = new Set<string>();
  for (const match of src.matchAll(DEF_LINK)) refs.add(match[1].toLowerCase());

  let text = src;

  // Ссылки и картинки: остаётся подпись, адрес уходит.
  text = text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Ссылки-определения и сноски.
  text = text.replace(DEF_LINK, "");
  text = text.replace(/\[\^[^\]]+\]:[^\n]*$/gm, "");
  text = text.replace(/\[\^[^\]]+\]/g, "");
  // Упоминание ссылки-определения: [подпись] или [подпись][] -> подпись.
  text = text.replace(/\[([^\]\s]+)\](?:\[[^\]]*\])?/g, (whole, label: string) =>
    refs.has(label.toLowerCase()) ? label : whole,
  );
  // Автоссылки <https://...> и <mailto:...>.
  text = text.replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, "$1");
  // Сырой HTML: react-markdown его и не рендерит (D-B5), здесь он тоже не нужен.
  text = text.replace(/<\/?[a-zA-Z][^>]*>/g, " ");
  // Ограждённый блок кода: оставляем содержимое, снимаем ограждение.
  text = text.replace(/^[ \t]*(?:```|~~~).*$/gm, "");
  // Встроенный код.
  text = text.replace(/`([^`]*)`/g, "$1");

  // Заголовки, цитаты, маркеры списков и пункты задач.
  text = text.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "");
  text = text.replace(/^[ \t]{0,3}>[ \t]?/gm, "");
  text = text.replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/gm, "");
  text = text.replace(/^[ \t]*\[[ xX]\][ \t]*/gm, "");

  // Разделитель и разделительная строка таблицы.
  text = text.replace(/^[ \t]*(?:[-*_][ \t]*){3,}$/gm, "");
  text = text.replace(/^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/gm, "");

  // Вертикальные черты таблицы — в пробелы.
  text = text.replace(/\|/g, " ");

  // Акценты. Подчёркивание внутри слова (snake_case) разметкой не считаем:
  // снимаем его только на границах слов.
  text = text.replace(/~~/g, "");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*\s][^*]*)\*/g, "$1");
  text = text.replace(/(^|[\s(])__([^_]+)__/g, "$1$2");
  text = text.replace(/(^|[\s(])_([^_\s][^_]*)_/g, "$1$2");

  // Экранированные символы возвращаем как обычные.
  text = text.replace(/\\([\\`*_{}[\]()#+\-.!>~=|])/g, "$1");

  return text.replace(/\s+/g, " ").trim();
}

/**
 * Уникальные пути загруженных картинок из Markdown-текста — в порядке
 * первого появления. Ловит и markdown-картинки, и html-подобный текст.
 */
export function extractImagePaths(src: string): string[] {
  if (!src) return [];

  const paths: string[] = [];
  const seen = new Set<string>();
  for (const match of src.matchAll(UPLOAD_PATH)) {
    const path = match[1].replace(TRAILING_PUNCT, "");
    if (!path || seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return paths;
}
