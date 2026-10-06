import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MarkdownBody from "../components/blog/MarkdownBody";
import { extractImagePaths, stripMarkdown } from "../lib/markdown-utils";

// ============================================================
// Проверяет markdown-подсистему блога (plan-5-blog.md §7):
//   * stripMarkdown отдаёт чистый текст;
//   * extractImagePaths находит пути /uploads/... из markdown-ссылок
//     и html-подобного текста, повторы не дублируются;
//   * MarkdownBody рендерится через react-dom/server: GFM работает,
//     сырой HTML не попадает в разметку, опасный протокол в href
//     обнуляется библиотекой, картинка ленивая, внешняя ссылка
//     открывается в новой вкладке.
//
// Скрипт не ходит в БД и ничего не меняет на диске.
// ============================================================

let checks = 0;

function ok(condition: boolean, message: string) {
  assert.ok(condition, message);
  checks += 1;
}

const SAMPLE = [
  "# Как я выбираю камень",
  "",
  "Текст с **жирным**, *курсивом*, ~~зачёркнутым~~ и \`кодом\`.",
  "",
  "## Что я спрашиваю",
  "",
  "- прожилки",
  "- воздух внутри",
  "  - трещины по краю",
  "",
  "1. взять в руку",
  "2. приложить к свету",
  "",
  "- [x] вымыть",
  "- [ ] отполировать",
  "",
  "> Бакелит всё время шутит.",
  "",
  "\`\`\`ts",
  "const kamen = 'bakelit';",
  "\`\`\`",
  "",
  "| Камень | Цвет |",
  "| --- | --- |",
  "| Бакелит | Карамель |",
  "",
  "![Кусок бакелита у окна](/uploads/blog/bakelit.jpg)",
  "",
  "[Портфолио мастера](https://example.com/portfolio)",
  "",
  "[Все записи](/blog)",
  "",
  "---",
  "",
  "Поле для заметки: some_field_name и [сноска].",
  "",
  "[сноска]: https://example.com/note",
].join("\n");

// --- stripMarkdown ---
const text = stripMarkdown(SAMPLE);
ok(text.length > 0, "stripMarkdown вернул непустой текст");
ok(text.startsWith("Как я выбираю камень Текст с жирным"), "заголовок и абзац идут слитно без разметки");
ok(text.includes("жирным") && text.includes("курсивом") && text.includes("зачёркнутым"), "акценты сняты, слова на месте");
ok(text.includes("кодом"), "встроенный код превращён в текст");
ok(text.includes("Что я спрашиваю"), "подзаголовок сохранён");
ok(text.includes("трещины по краю"), "вложенный пункт списка сохранён");
ok(text.includes("вымыть") && text.includes("отполировать"), "пункты задач сохранены без галочек");
ok(text.includes("Бакелит всё время шутит."), "цитата сохранена");
ok(text.includes("const kamen = 'bakelit';"), "содержимое блока кода сохранено");
ok(text.includes("Бакелит Карамель"), "ячейки таблицы сохранены, разделительная строка убрана");
ok(text.includes("Кусок бакелита у окна"), "подпись картинки сохранена");
ok(text.includes("Портфолио мастера") && !text.includes("example.com/portfolio"), "адрес ссылки убран, подпись оставлена");
ok(text.includes("Все записи") && !text.includes("(https"), "внутренняя ссылка оставлена подписью");
ok(text.includes("some_field_name"), "подчёркивание внутри слова не тронуто");
ok(!/[#|~*\`]/.test(text), "в чистом тексте не осталось символов разметки");
ok(!/\s{2,}/.test(text), "пробелы схлопнуты в один");
ok(stripMarkdown("").toString() === "", "пустая строка даёт пустой текст");
ok(stripMarkdown("**только** _акцент_ ~~зачёркнутый~~") === "только акцент зачёркнутый", "короткий текст без блоков");

// --- extractImagePaths ---
ok(
  extractImagePaths("![a](/uploads/blog/a.jpg)").join() === "/uploads/blog/a.jpg",
  "путь из markdown-картинки",
);
ok(
  extractImagePaths('<img src="/uploads/blog/b.jpg">').join() === "/uploads/blog/b.jpg",
  "путь из html-подобного текста",
);
ok(
  extractImagePaths("![c](/uploads/blog/c.png \"обложка\")").join() === "/uploads/blog/c.png",
  "путь из картинки с подписью в скобках",
);
ok(
  extractImagePaths("/uploads/blog/a.jpg, ещё раз — /uploads/blog/a.jpg").join() === "/uploads/blog/a.jpg",
  "повтор пути не дублируется, знак препинания не попал в путь",
);
ok(
  extractImagePaths("![x](/uploads/blog/d.jpg)\n![y](/uploads/blog/e.jpg)\n![z](/uploads/blog/d.jpg)").join()
    === "/uploads/blog/d.jpg,/uploads/blog/e.jpg",
  "уникальные пути в порядке первого появления",
);
ok(
  extractImagePaths("![внешняя](https://cdn.example.com/uploads/blog/f.jpg)").length === 0,
  "внешний адрес не считается файлом сайта",
);
ok(extractImagePaths("текст без картинок").length === 0, "текст без картинок даёт пустой список");
ok(extractImagePaths("").length === 0, "пустая строка даёт пустой список");
ok(
  extractImagePaths(SAMPLE).join() === "/uploads/blog/bakelit.jpg",
  "путь из размеченного текста записи",
);

// --- MarkdownBody: рендер через react-dom/server ---
function render(source: string) {
  return renderToStaticMarkup(createElement(MarkdownBody, { source }));
}

ok(render("текст").startsWith('<div class="prose">'), "рендер обёрнут в .prose");

const xss = render(
  [
    "<script>alert(1)</script>",
    "",
    '<img src="x" onerror="alert(2)">',
    "",
    "[клик](javascript:alert(3))",
  ].join("\n"),
);
ok(!/<script/i.test(xss), "тег script не попал в HTML");
ok(!/alert\(1\)<\/script/i.test(xss), "тело script не попало в разметку как разметка");
ok(!/<img[^>]*onerror/i.test(xss), "обработчик onerror не стал атрибутом");
ok(xss.includes("&lt;script&gt;"), "сырой HTML показан текстом, а не разобран (D-B5)");
ok(!/javascript:/i.test(xss), "протокол javascript: не попал в HTML");
ok(/<a href="">/.test(xss), "ссылка с javascript: получила пустой href");

const gfm = render(
  [
    "| Камень | Цвет |",
    "| --- | --- |",
    "| Бакелит | Карамель |",
    "",
    "~~зачёркнуто~~",
    "",
    "- [x] задача",
    "",
    "![картинка](/uploads/blog/a.jpg)",
    "",
    "[внешняя](https://example.com/portfolio)",
    "",
    "[внутренняя](/blog)",
    "",
    "автоссылка: https://example.com/auto",
  ].join("\n"),
);
ok(/<table>/.test(gfm), "GFM-таблица разметилась в table");
ok(/<th[^>]*>Камень<\/th>/.test(gfm), "заголовок таблицы разметился в th");
ok(/<del>зачёркнуто<\/del>/.test(gfm), "зачёркивание разметилось в del");
ok(/<ul class="contains-task-list">/.test(gfm), "список задач получил класс contains-task-list");
ok(/type="checkbox"/.test(gfm), "пункт задачи получил input checkbox");
ok(/<img[^>]*src="\/uploads\/blog\/a\.jpg"/.test(gfm), "картинка сохранила свой адрес");
ok(/<img[^>]*loading="lazy"/.test(gfm), "картинка загружается лениво");
ok(/<img[^>]*decoding="async"/.test(gfm), "картинка декодируется асинхронно");
ok(/<img[^>]*class="prose-img"/.test(gfm), "картинка получила класс prose-img");
ok(/<a[^>]*href="https:\/\/example\.com\/portfolio"[^>]*target="_blank"/.test(gfm), "внешняя ссылка открывается в новой вкладке");
ok(/rel="noopener noreferrer"/.test(gfm), "у внешней ссылки стоит rel=noopener noreferrer");
ok(
  /<a href="\/blog">внутренняя<\/a>/.test(gfm),
  "внутренняя ссылка осталась без target",
);
ok(
  !/<a[^>]*href="\/blog"[^>]*target/.test(gfm),
  "target есть только у внешних ссылок",
);
ok(
  /<a[^>]*href="https:\/\/example\.com\/auto"/.test(gfm),
  "GFM-автоссылка стала ссылкой",
);
const softBreak = render("первая строка\nвторая строка");
ok(!/<br\s*\/>/.test(gfm), "в разметке записей нет br (D-B11)");
ok(
  />первая строка\s+вторая строка</.test(softBreak) && !/<br\s*\/>/.test(softBreak),
  "одиночный перенос строки внутри абзаца не даёт br (D-B11)",
);

const sample = render(SAMPLE);
ok(/<h1>Как я выбираю камень<\/h1>/.test(sample), "заголовок первого уровня разметился в h1");
ok(/<h2>Что я спрашиваю<\/h2>/.test(sample), "заголовок второго уровня разметился в h2");
ok(/<blockquote>/.test(sample), "цитата разметилась в blockquote");
ok(/<pre><code class="language-ts">/.test(sample), "блок кода получил pre и code с языком");
ok(render("").includes('<div class="prose">'), "пустой текст даёт пустую обёртку .prose");

console.log(`\nOK markdown: ${checks} проверок пройдено`);
