import { and, asc, desc, eq, gt, inArray, like, lt, lte, or } from "drizzle-orm";
import { db } from "./db";
import {
  blogPostTags,
  blogPosts,
  blogTags,
  type BlogPost,
  type BlogTag,
} from "../drizzle/schema";
import { Locale } from "./i18n";

// Доступ к записям блога (направление 5, plan-5-blog.md §5).
//
// ГЛАВНОЕ ПРАВИЛО: публичные функции ниже — единственный путь к записям для
// витрины, и каждая из них начинает выборку с publishedFilter(). Прямых
// db.select() по blogPosts в публичных страницах быть не должно (D-B2):
// именно здесь, а не в разметке, решается, что черновик никто не увидит.
// Админские функции фильтра по статусу намеренно НЕ применяют — они живут
// в этом же файле, чтобы разница была видна в одном месте.

// Сколько записей на странице витрины — как на странице категории.
export const BLOG_PAGE_SIZE = 9;

/**
 * Фильтр опубликованных записей: статус published И дата публикации уже
 * наступила. Функция, а не константа: now() должен вычисляться на каждый
 * запрос, иначе процесс-долгожитель «заморозил» бы момент проверки.
 */
function publishedFilter() {
  return and(
    eq(blogPosts.status, "published"),
    lte(blogPosts.publishedAt, new Date()),
  );
}

export type BlogGroup = {
  year: number;
  month: number;
  posts: BlogPost[];
};

export type PublishedPosts = {
  posts: BlogPost[];
  total: number;
  pages: number;
  page: number;
  groups: BlogGroup[];
};

export type PublishedPostsFilters = {
  year?: number;
  month?: number;
  tagSlug?: string;
  page?: number;
  perPage?: number;
};

const EMPTY_LIST: PublishedPosts = {
  posts: [],
  total: 0,
  pages: 1,
  page: 1,
  groups: [],
};

function emptyList(page = 1): PublishedPosts {
  return { ...EMPTY_LIST, page: Math.max(1, page) };
}

/** Границы месяца по локальному времени — так же, как даты в админке. */
function monthBounds(year: number, month: number) {
  return {
    from: new Date(year, month - 1, 1, 0, 0, 0, 0),
    to: new Date(year, month, 1, 0, 0, 0, 0),
  };
}

/** Границы года по локальному времени. */
function yearBounds(year: number) {
  return {
    from: new Date(year, 0, 1, 0, 0, 0, 0),
    to: new Date(year + 1, 0, 1, 0, 0, 0, 0),
  };
}

/** id записей с заданной рубрикой; null — рубрики нет. */
function postIdsByTagSlug(tagSlug: string): number[] | null {
  const tag = db
    .select({ id: blogTags.id })
    .from(blogTags)
    .where(eq(blogTags.slug, tagSlug))
    .get();
  if (!tag) return null;
  return db
    .select({ postId: blogPostTags.postId })
    .from(blogPostTags)
    .where(eq(blogPostTags.tagId, tag.id))
    .all()
    .map((r) => r.postId);
}

/**
 * Разбивает уже отсортированный (свежие сверху) список на группы по дате.
 * Порядок групп и постов внутри них сохраняется — сортировка не теряется.
 */
export function buildPostGroups(posts: BlogPost[]): BlogGroup[] {
  const groups: BlogGroup[] = [];
  for (const post of posts) {
    if (!post.publishedAt) continue;
    const year = post.publishedAt.getFullYear();
    const month = post.publishedAt.getMonth() + 1;
    const last = groups[groups.length - 1];
    if (last && last.year === year && last.month === month) {
      last.posts.push(post);
    } else {
      groups.push({ year, month, posts: [post] });
    }
  }
  return groups;
}

/**
 * Опубликованные записи для витрины: фильтр по дате и рубрике, пагинация,
 * группировка по годам и месяцам.
 * Несуществующая рубрика и «пустой» год дают пустой список, а не ошибку —
 * витрина показывает пустое состояние.
 */
export function getPublishedPosts(filters: PublishedPostsFilters = {}): PublishedPosts {
  const conditions = [publishedFilter()];

  if (filters.year && filters.month) {
    const { from, to } = monthBounds(filters.year, filters.month);
    conditions.push(gt(blogPosts.publishedAt, new Date(from.getTime() - 1)));
    conditions.push(lte(blogPosts.publishedAt, to));
  } else if (filters.year) {
    const { from, to } = yearBounds(filters.year);
    conditions.push(gt(blogPosts.publishedAt, new Date(from.getTime() - 1)));
    conditions.push(lte(blogPosts.publishedAt, to));
  }

  let postIds: number[] | null = null;
  if (filters.tagSlug) {
    postIds = postIdsByTagSlug(filters.tagSlug);
    if (postIds === null || postIds.length === 0) return emptyList(filters.page);
    conditions.push(inArray(blogPosts.id, postIds));
  }

  const all = db
    .select()
    .from(blogPosts)
    .where(and(...conditions))
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id))
    .all();

  const perPage = filters.perPage && filters.perPage > 0 ? filters.perPage : BLOG_PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(all.length / perPage));
  const page = Math.min(Math.max(1, filters.page ?? 1), pages);
  const posts = all.slice((page - 1) * perPage, page * perPage);

  return {
    posts,
    total: all.length,
    pages,
    page,
    groups: buildPostGroups(posts),
  };
}

/** Одна опубликованная запись по slug. Черновик даёт undefined. */
export function getPublishedPostBySlug(slug: string): BlogPost | undefined {
  return db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), publishedFilter()))
    .get();
}

/** Соседние записи по дате публикации (для переходов в конце страницы). */
export function getAdjacentPosts(
  publishedAt: Date,
): { prev: BlogPost | null; next: BlogPost | null } {
  const base = publishedFilter();
  const prev =
    db
      .select()
      .from(blogPosts)
      .where(and(base, lt(blogPosts.publishedAt, publishedAt)))
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id))
      .get() ?? null;
  const next =
    db
      .select()
      .from(blogPosts)
      .where(and(base, gt(blogPosts.publishedAt, publishedAt)))
      .orderBy(asc(blogPosts.publishedAt), asc(blogPosts.id))
      .get() ?? null;
  return { prev, next };
}

/** Активные рубрики со счётчиком опубликованных записей — фильтр витрины. */
export function getActiveTagsWithCounts(): { slug: string; name: string; count: number }[] {
  const active = db
    .select()
    .from(blogTags)
    .where(eq(blogTags.isActive, true))
    .orderBy(asc(blogTags.sortOrder), asc(blogTags.id))
    .all();
  if (active.length === 0) return [];

  const counts = new Map<number, number>();
  for (const row of db
    .select({ tagId: blogPostTags.tagId })
    .from(blogPostTags)
    .innerJoin(blogPosts, eq(blogPostTags.postId, blogPosts.id))
    .where(publishedFilter())
    .all()) {
    counts.set(row.tagId, (counts.get(row.tagId) ?? 0) + 1);
  }

  return active.map((tag) => ({
    slug: tag.slug,
    name: tag.name,
    count: counts.get(tag.id) ?? 0,
  }));
}

// --------------------------------------------------------------------------
// Админская часть — без фильтра по статусу.
// --------------------------------------------------------------------------

export type AdminPostsFilters = {
  status?: "all" | "draft" | "published";
  tagSlug?: string;
  q?: string;
};

/** Все записи для панели: фильтр статуса, рубрики и поиск по slug или названию. */
export function getAllPostsForAdmin(filters: AdminPostsFilters = {}): BlogPost[] {
  const conditions = [];

  if (filters.status === "draft") {
    conditions.push(eq(blogPosts.status, "draft"));
  } else if (filters.status === "published") {
    conditions.push(eq(blogPosts.status, "published"));
  }

  if (filters.tagSlug) {
    const ids = postIdsByTagSlug(filters.tagSlug);
    if (ids === null || ids.length === 0) return [];
    conditions.push(inArray(blogPosts.id, ids));
  }

  const q = filters.q?.trim();
  if (q) {
    // title хранится JSON-строкой {"ru":"…"} — LIKE по строке находит
    // в том числе русский заголовок, отдельная колонка не нужна.
    const pattern = `%${q}%`;
    conditions.push(or(like(blogPosts.slug, pattern), like(blogPosts.title, pattern))!);
  }

  const rows = db
    .select()
    .from(blogPosts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(blogPosts.createdAt), desc(blogPosts.id))
    .all();
  return rows;
}

export function getPostForAdminById(id: number): BlogPost | undefined {
  return db.select().from(blogPosts).where(eq(blogPosts.id, id)).get();
}

/** Все рубрики с общим числом записей (для вкладки «Рубрики»). */
export function getTagsForAdmin(): {
  id: number;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  postCount: number;
}[] {
  const rows = db
    .select()
    .from(blogTags)
    .orderBy(asc(blogTags.sortOrder), asc(blogTags.id))
    .all();
  const used = db
    .select({ tagId: blogPostTags.tagId })
    .from(blogPostTags)
    .all();
  const counts = new Map<number, number>();
  for (const row of used) {
    counts.set(row.tagId, (counts.get(row.tagId) ?? 0) + 1);
  }
  return rows.map((tag) => ({
    id: tag.id,
    slug: tag.slug,
    name: tag.name,
    sortOrder: tag.sortOrder,
    isActive: tag.isActive,
    postCount: counts.get(tag.id) ?? 0,
  }));
}

export function getTagIdsForPost(postId: number): number[] {
  return db
    .select({ tagId: blogPostTags.tagId })
    .from(blogPostTags)
    .where(eq(blogPostTags.postId, postId))
    .all()
    .map((r) => r.tagId);
}

/** Рубрики записи — для карточек списка и страницы записи. */
export function getTagsForPost(postId: number): BlogTag[] {
  return db
    .select({
      id: blogTags.id,
      slug: blogTags.slug,
      name: blogTags.name,
      sortOrder: blogTags.sortOrder,
      isActive: blogTags.isActive,
    })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.postId, postId))
    .orderBy(asc(blogTags.sortOrder), asc(blogTags.id))
    .all();
}

/** Все id рубрик существуют? — проверка перед сохранением записи. */
export function isValidTagIds(ids: number[]): boolean {
  if (ids.length === 0) return true;
  const found = db
    .select({ id: blogTags.id })
    .from(blogTags)
    .where(inArray(blogTags.id, ids))
    .all()
    .map((r) => r.id);
  return found.length === new Set(ids).size;
}

/**
 * Полная замена набора рубрик записи: добавляем недостающие связи и
 * удаляем лишние (подход categories/[id] со слотами). ON DELETE CASCADE
 * не работает — PRAGMA foreign_keys в better-sqlite3 выключен.
 */
export function setPostTags(postId: number, tagIds: number[]): void {
  const wanted = [...new Set(tagIds)];
  const current = getTagIdsForPost(postId);
  const toAdd = wanted.filter((id) => !current.includes(id));
  const toRemove = current.filter((id) => !wanted.includes(id));

  for (const tagId of toAdd) {
    db.insert(blogPostTags).values({ postId, tagId }).run();
  }
  for (const tagId of toRemove) {
    db.delete(blogPostTags)
      .where(and(eq(blogPostTags.postId, postId), eq(blogPostTags.tagId, tagId)))
      .run();
  }
}

/** Снимает все связи записи — вызывается перед удалением записи. */
export function deletePostTags(postId: number): void {
  db.delete(blogPostTags).where(eq(blogPostTags.postId, postId)).run();
}

/** Снимает все связи рубрики — вызывается перед удалением рубрики. */
export function deleteTagLinks(tagId: number): void {
  db.delete(blogPostTags).where(eq(blogPostTags.tagId, tagId)).run();
}

// Дата записи в формате макета: «18 сентября 2026». Intl даёт падеж месяца
// для каждой локали, 
// порядок частей оставляем локальным (en: «September 18, 2026»).
export function postDate(date: Date, locale: Locale): string {
  const parts = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(date);
  return parts
    //.filter((part) => !(part.type === "literal" && part.value.trim() === "г."))
    .map((part) => part.value)
    .join("")
    .replace(/\s+/g, ".")
    .trim();
}

export function postDateTime(date: Date, locale: Locale): string {
  const datePart = postDate(date, locale);
  const timeParts = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "numeric",
    // second: "numeric",
  }).formatToParts(date);
  const timePart = timeParts
    .map((part) => part.value)
    .join("")
    //.replace(/\s+/g, " ")
    .trim();
  return `${datePart} ${timePart}`;
}
