import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

// ============================================================
// Проверяет инварианты слоя данных блога:
//   * черновик, запись без даты и запись с будущей датой недоступны
//     через публичные функции;
//   * сортировка, группировка по датам, пагинация и фильтр по рубрике;
//   * чистка связей запись↔рубрика.
//
// Даты тестовых записей отсчитываются от «сейчас»: проверка должна быть
// зелёной в любой день, а не только пока календарь совпадает с макетом.
//
// Скрипт работает на СВОЕЙ временной БД и никогда не трогает боевую:
// путь ставится в DATABASE_URL до импорта lib/db (dotenv не перекрывает
// уже заданные переменные).
//
// tsx компилирует скрипт в CJS, поэтому верхнего await нет — тело в main().
// ============================================================

const TMP_DB = resolve(process.cwd(), "tmp-blogcheck.db");
const LIVE_DB = resolve(process.cwd(), "julcraft.db");

type Sqlite = { close: () => void };
let sqlite: Sqlite | undefined;

function dropTmp() {
  for (const suffix of ["", "-wal", "-shm"]) rmSync(TMP_DB + suffix, { force: true });
}

// SQLite держит файл открытым — на Windows rmSync по открытому файлу EPERM,
function cleanup() {
  try {
    sqlite?.close();
  } catch {
    // соединение уже закрыто — нечего делать
  }
  dropTmp();
}

async function main() {
  if (TMP_DB === LIVE_DB) {
    console.error("ОШИБКА: временная БД совпала с боевой — проверка не запущена");
    process.exit(1);
  }

  dropTmp();
  process.env.DATABASE_URL = `file:${TMP_DB}`;

  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const dbModule = await import("../lib/db");
  sqlite = dbModule.sqlite as unknown as Sqlite;
  const { db } = dbModule;
  const { blogPostTags, blogPosts, blogTags } = await import("../drizzle/schema");
  const { storeLS } = await import("../lib/localize");
  const blog = await import("../lib/blog");

  migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });

  const NOW = new Date();
  const DAY = 24 * 60 * 60 * 1000;
  const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

  function addTag(slug: string, ru: string, sortOrder: number, isActive = true) {
    const res = db
      .insert(blogTags)
      .values({ slug, name: storeLS({ ru }), sortOrder, isActive })
      .run();
    return Number(res.lastInsertRowid);
  }

  // Опубликованные записи: сколько дней назад вышла.
  // DATES хранит ТОЧНЫЕ объекты Date, ушедшие в базу: drizzle хранит
  // publishedAt с точностью до секунды, поэтому повторный daysAgo(N) дал бы
  // другую секунду и запись находила бы саму себя как «предыдущую».
  const PUBLISHED: { slug: string; ru: string; days: number; id: number }[] = [];
  const DATES = new Map<string, Date>();
  function addPost(slug: string, ru: string, days: number) {
    const publishedAt = daysAgo(days);
    const res = db
      .insert(blogPosts)
      .values({
        slug,
        title: storeLS({ ru }),
        excerpt: storeLS({ ru: "кратко" }),
        content: storeLS({ ru: "текст" }),
        status: "published",
        publishedAt,
        createdAt: NOW,
        updatedAt: NOW,
      })
      .run();
    const id = Number(res.lastInsertRowid);
    PUBLISHED.push({ slug, ru, days, id });
    DATES.set(slug, publishedAt);
    return id;
  }

  function addHidden(slug: string, ru: string, status: "draft" | "published", publishedAt: Date | null) {
    const res = db
      .insert(blogPosts)
      .values({
        slug,
        title: storeLS({ ru }),
        excerpt: storeLS({ ru: "кратко" }),
        content: storeLS({ ru: "текст" }),
        status,
        publishedAt,
        createdAt: NOW,
        updatedAt: NOW,
      })
      .run();
    return Number(res.lastInsertRowid);
  }

  function link(postId: number, tagId: number) {
    db.insert(blogPostTags).values({ postId, tagId }).run();
  }

  const bakelit = addTag("bakelit", "Бакелит", 1);
  const emal = addTag("emal", "Эмаль", 2);
  const zakulisye = addTag("zakulisye", "Закулисье", 3);
  addTag("arhiv", "Архив", 9, false);

  const p1 = addPost("kak-ya-vybirayu-kamen", "Как я выбираю камень", 3);
  const p2 = addPost("emal-kapriznichaet", "Эмаль, которая капризничает", 10);
  const p3 = addPost("restavraciya-brosh", "Реставрация броши", 40);
  const draftId = addHidden("chernovik", "Черновик", "draft", null);
  addHidden("bez-daty", "Без даты", "published", null);
  addHidden("v-budushchem", "В будущем", "published", new Date(NOW.getTime() + 365 * DAY));

  link(p1, bakelit);
  link(p1, zakulisye);
  link(p2, emal);
  link(p3, bakelit);
  link(draftId, emal);

  // Ещё 12 записей — для проверки пагинации (9 + 3).
  const bulk = [];
  for (let i = 1; i <= 12; i++) bulk.push(addPost(`post-${i}`, `Запись ${i}`, 60 + i));

  const VISIBLE = PUBLISHED.length;
  const visibleSlugs = PUBLISHED.map((p) => p.slug);

  let checks = 0;
  function ok(condition: boolean, label: string) {
    assert.equal(condition, true, label);
    checks++;
    console.log(`OK ${label}`);
  }

  // --- черновики не видны публично ---
  const all = blog.getPublishedPosts();
  const slugs = all.posts.map((p) => p.slug);
  ok(!slugs.includes("chernovik"), "черновик не попадает в список витрины");
  ok(!slugs.includes("bez-daty"), "опубликованная запись без даты не попадает в витрину");
  ok(!slugs.includes("v-budushchem"), "запись с будущей датой не попадает в витрину");
  ok(all.total === VISIBLE, `в витрине ${VISIBLE} опубликованных записей, получено ${all.total}`);

  ok(blog.getPublishedPostBySlug("kak-ya-vybirayu-kamen") !== undefined, "опубликованная запись открывается по slug");
  ok(blog.getPublishedPostBySlug("chernovik") === undefined, "черновик не открывается по slug");
  ok(blog.getPublishedPostBySlug("bez-daty") === undefined, "запись без даты не открывается по slug");
  ok(blog.getPublishedPostBySlug("v-budushchem") === undefined, "запись с будущей датой не открывается по slug");

  // --- порядок ---
  ok(
    slugs.join(",") === [...visibleSlugs].sort().reverse().join(",") || slugs[0] === "kak-ya-vybirayu-kamen",
    `первой на витрине идёт самая свежая запись (${slugs[0]})`,
  );
  const three = blog.getPublishedPosts({ perPage: 3 });
  ok(
    three.posts.map((p) => p.slug).join(",") === "kak-ya-vybirayu-kamen,emal-kapriznichaet,restavraciya-brosh",
    `записи отсортированы свежие сверху (${three.posts.map((p) => p.slug).join(",")})`,
  );

  // --- группировка по датам (чистая функция, фиксированные даты) ---
  const fake = (y: number, m: number, d: number) =>
    ({ id: 0, slug: `${y}-${m}-${d}`, publishedAt: new Date(y, m - 1, d) }) as never;
  const gs = blog.buildPostGroups([
    fake(2026, 9, 18),
    fake(2026, 9, 11),
    fake(2026, 8, 24),
    fake(2026, 7, 1),
  ]);
  ok(gs.length === 3, `сентябрь, август и июль дают три группы (${gs.length})`);
  ok(gs[0].year === 2026 && gs[0].month === 9 && gs[0].posts.length === 2, "записи одного месяца попадают в одну группу");
  ok(gs[1].month === 8 && gs[2].month === 7, "группы идут в порядке убывания даты");
  ok(blog.buildPostGroups([]).length === 0, "пустой список даёт ни одной группы");

  // --- фильтр по году и месяцу (ожидания считаем из тех же данных) ---
  const p1Date = DATES.get("kak-ya-vybirayu-kamen")!;
  const year = p1Date.getFullYear();
  const month = p1Date.getMonth() + 1;
  const inMonth = PUBLISHED.filter((p) => {
    const dt = DATES.get(p.slug)!;
    return dt.getFullYear() === year && dt.getMonth() + 1 === month;
  });
  const byMonth = blog.getPublishedPosts({ year, month });
  ok(
    byMonth.total === inMonth.length,
    `фильтр по ${month}/${year} отдаёт ${inMonth.length} записей, получено ${byMonth.total}`,
  );
  ok(
    byMonth.posts.every((p) => p.publishedAt != null && p.publishedAt.getMonth() + 1 === month),
    "в выборке месяца нет записей из других месяцев",
  );
  const byYear = blog.getPublishedPosts({ year });
  ok(byYear.total === PUBLISHED.filter((p) => DATES.get(p.slug)!.getFullYear() === year).length, "фильтр по году отдаёт все записи года");
  ok(blog.getPublishedPosts({ year: 1999 }).total === 0, "пустой год даёт пустой список, а не ошибку");
  ok(blog.getPublishedPosts({ year, month: 13 }).total === 0, "несуществующий месяц даёт пустой список");

  // --- пагинация ---
  ok(all.pages === Math.ceil(VISIBLE / 9), `всего страниц ${Math.ceil(VISIBLE / 9)} (получено ${all.pages})`);
  ok(all.posts.length === Math.min(9, VISIBLE), `первая страница содержит ${Math.min(9, VISIBLE)} записей`);
  const last = blog.getPublishedPosts({ page: 999 });
  ok(last.page === all.pages, "page за пределами диапазона схлопывается на последний");
  ok(last.posts.length === VISIBLE - (all.pages - 1) * 9, "на последней странице остаток записей");
  const second = blog.getPublishedPosts({ page: 2 });
  ok(
    second.posts[0]?.slug !== all.posts[0]?.slug,
    "вторая страница начинается с другой записи",
  );
  ok(bulk.length === 12, "вспомогательные записи созданы");

  // --- фильтр по рубрике ---
  const byTag = blog.getPublishedPosts({ tagSlug: "bakelit" });
  ok(
    byTag.posts.map((p) => p.slug).join(",") === "kak-ya-vybirayu-kamen,restavraciya-brosh",
    `фильтр по рубрике «bakelit» отдаёт только её записи (${byTag.posts.map((p) => p.slug).join(",")})`,
  );
  ok(blog.getPublishedPosts({ tagSlug: "net-takoy" }).total === 0, "несуществующая рубрика даёт пустой список");
  ok(blog.getPublishedPosts({ tagSlug: "arhiv" }).total === 0, "неактивная рубрика без связей даёт пустой список");
  ok(
    blog.getPublishedPosts({ tagSlug: "bakelit", year: 1999 }).total === 0,
    "рубрика и пустой год вместе дают пустой список",
  );

  // --- рубрики витрины ---
  const tags = blog.getActiveTagsWithCounts();
  ok(tags.length === 3, `в фильтр витрины попали только активные рубрики (${tags.length})`);
  ok(!tags.some((t) => t.slug === "arhiv"), "неактивная рубрика скрыта из фильтра");
  ok(tags.find((t) => t.slug === "bakelit")?.count === 2, "счётчик рубрики считает только опубликованные записи");
  ok(tags.find((t) => t.slug === "emal")?.count === 1, "черновик не попадает в счётчик рубрики");

  // --- соседние записи ---
  // prev — предыдущая по времени (раньше), next — следующая по времени (позже).
  const newest = blog.getAdjacentPosts(DATES.get("kak-ya-vybirayu-kamen")!);
  ok(newest.prev?.slug === "emal-kapriznichaet", `предыдущая запись — более ранняя по дате (${newest.prev?.slug})`);
  ok(newest.next === null, "у самой свежей записи нет следующей");
  const middle = blog.getAdjacentPosts(DATES.get("emal-kapriznichaet")!);
  ok(middle.prev?.slug === "restavraciya-brosh", `предыдущая у средней записи — более ранняя (${middle.prev?.slug})`);
  ok(middle.next?.slug === "kak-ya-vybirayu-kamen", "следующая у средней записи — более поздняя");
  const oldest = blog.getAdjacentPosts(DATES.get("post-12")!);
  ok(oldest.prev === null, "у самой старой записи нет предыдущей");
  ok(oldest.next?.slug === "post-11", `следующая у самой старой — ближайшая более поздняя (${oldest.next?.slug})`);

  // --- админские функции ---
  const adminAll = blog.getAllPostsForAdmin();
  ok(adminAll.length === VISIBLE + 3, `в панели видны все записи, включая черновик (${adminAll.length})`);
  ok(blog.getAllPostsForAdmin({ status: "draft" }).length === 1, "фильтр панели «черновики» находит черновик");
  ok(
    blog.getAllPostsForAdmin({ status: "published" }).length === VISIBLE + 2,
    "фильтр панели «опубликованные» не включает черновик",
  );
  ok(blog.getAllPostsForAdmin({ q: "kamen" }).length === 1, "поиск по slug находит запись");
  ok(blog.getAllPostsForAdmin({ q: "камень" }).length === 1, "поиск по русскому заголовку находит запись");
  ok(blog.getAllPostsForAdmin({ tagSlug: "emal" }).length === 2, "фильтр панели по рубрике учитывает и черновики");
  ok(blog.getAllPostsForAdmin({ tagSlug: "net-takoy" }).length === 0, "несуществующая рубрика в панели даёт пустой список");
  ok(blog.getPostForAdminById(draftId)?.slug === "chernovik", "админ получает черновик по id");
  ok(blog.getPostForAdminById(999999) === undefined, "несуществующий id даёт undefined");

  const adminTags = blog.getTagsForAdmin();
  ok(adminTags.length === 4, `панель видит все рубрики, включая неактивную (${adminTags.length})`);
  ok(adminTags.find((t) => t.slug === "emal")?.postCount === 2, "счётчик рубрики в панели считает все записи");
  ok(adminTags.map((t) => t.slug).join(",") === "bakelit,emal,zakulisye,arhiv", "рубрики панели отсортированы по sortOrder");

  const p1Tags = blog.getTagIdsForPost(p1).slice().sort((a, b) => a - b).join(",");
  ok(p1Tags === [bakelit, zakulisye].sort((a, b) => a - b).join(","), "рубрики записи читаются");
  ok(blog.getTagsForPost(p1).map((t) => t.slug).join(",") === "bakelit,zakulisye", "рубрики записи возвращаются по порядку сортировки");
  ok(blog.isValidTagIds([bakelit, emal]), "существующие id рубрик проходят проверку");
  ok(!blog.isValidTagIds([bakelit, 999999]), "несуществующий id рубрики отклоняется");
  ok(blog.isValidTagIds([]), "пустой набор рубрик валиден");

  // --- связи: полная замена набора ---
  blog.setPostTags(p1, [emal]);
  ok(blog.getTagIdsForPost(p1).join(",") === String(emal), "setPostTags заменяет набор рубрик целиком");
  blog.setPostTags(p1, [bakelit, emal, zakulisye]);
  ok(blog.getTagIdsForPost(p1).length === 3, "setPostTags добавляет недостающие связи");
  blog.setPostTags(p1, [bakelit, bakelit, emal]);
  ok(blog.getTagIdsForPost(p1).length === 2, "повторяющиеся id рубрик не создают дубль связи");
  blog.setPostTags(p1, []);
  ok(blog.getTagIdsForPost(p1).length === 0, "пустой набор снимает все рубрики");

  blog.deleteTagLinks(zakulisye);
  ok(db.select().from(blogPostTags).all().every((r) => r.tagId !== zakulisye), "удаление рубрики снимает её связи");
  blog.deletePostTags(p3);
  ok(blog.getTagIdsForPost(p3).length === 0, "удаление записи снимает её связи");

  ok(blog.BLOG_PAGE_SIZE === 9, "размер страницы витрины — 9 записей");

  sqlite.close();
  sqlite = undefined;
  dropTmp();

  console.log(`\nOK blog: ${checks} проверок пройдено`);
}

main().catch((error) => {
  cleanup();
  console.error(error);
  process.exitCode = 1;
});
