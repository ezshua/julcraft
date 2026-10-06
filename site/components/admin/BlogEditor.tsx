"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "./ImageUploader";
import MarkdownField, { type MarkdownFieldHandle } from "./MarkdownField";
import { useAdminDict, useAdminLocale } from "./admin-dict-context";
import { slugify } from "@/lib/format";
import { toLS, L } from "@/lib/localize";
import type { BlogPostStatus } from "@/drizzle/schema";

export type BlogTagOption = { id: number; slug: string; name: string };

export type BlogEditorPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  status: BlogPostStatus;
  publishedAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  tagIds: number[];
};

type Localized = { ru: string; en: string; uk: string };

const EMPTY: Localized = { ru: "", en: "", uk: "" };
const LOCALES = ["ru", "en", "uk"] as const;
type LocaleKey = (typeof LOCALES)[number];

function lsOrEmpty(value: string | null | undefined): Localized {
  return value ? toLS(value) : { ...EMPTY };
}

// Пустое SEO-поле уходит в БД как null, заполненное — как JSON локали.
function nullableLs(value: Localized): string | null {
  const clean = {
    ...(value.ru.trim() ? { ru: value.ru.trim() } : {}),
    ...(value.en.trim() ? { en: value.en.trim() } : {}),
    ...(value.uk.trim() ? { uk: value.uk.trim() } : {}),
  };
  return Object.keys(clean).length === 0 ? null : JSON.stringify(clean);
}

type FormState = {
  slug: string;
  title: Localized;
  excerpt: Localized;
  content: Localized;
  coverImage: string | null;
  metaTitle: Localized;
  metaDescription: Localized;
  tagIds: number[];
};

function buildForm(post?: BlogEditorPost): FormState {
  if (!post) {
    return {
      slug: "",
      title: { ...EMPTY },
      excerpt: { ...EMPTY },
      content: { ...EMPTY },
      coverImage: null,
      metaTitle: { ...EMPTY },
      metaDescription: { ...EMPTY },
      tagIds: [],
    };
  }
  return {
    slug: post.slug,
    title: lsOrEmpty(post.title),
    excerpt: lsOrEmpty(post.excerpt),
    content: lsOrEmpty(post.content),
    coverImage: post.coverImage,
    metaTitle: lsOrEmpty(post.metaTitle),
    metaDescription: lsOrEmpty(post.metaDescription),
    tagIds: [...post.tagIds],
  };
}

function sameLocalized(a: Localized, b: Localized): boolean {
  return a.ru === b.ru && a.en === b.en && a.uk === b.uk;
}

// «Грязность» формы — сравнение со снимком. Локализованные поля сравниваем
// по значениям, а не по ссылке: форма и снимок строятся разными вызовами,
// иначе форма всегда считалась бы изменённой.
function isDirty(a: FormState, b: FormState): boolean {
  if (a.slug !== b.slug || a.coverImage !== b.coverImage) return true;
  if (
    !sameLocalized(a.title, b.title) ||
    !sameLocalized(a.excerpt, b.excerpt) ||
    !sameLocalized(a.content, b.content) ||
    !sameLocalized(a.metaTitle, b.metaTitle) ||
    !sameLocalized(a.metaDescription, b.metaDescription)
  ) {
    return true;
  }
  return a.tagIds.length !== b.tagIds.length || a.tagIds.some((id, i) => id !== b.tagIds[i]);
}

const CHIP_CYCLE = ["chip--mustard", "chip--rust", "chip--olive"];

// Дата публикации в строке статуса: 18.09.2026
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// Дата и время публикации в строке статуса: 18.09.2026 14:30
function fmtDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Редактор записи блога — копия разметки mockup/admin/blog-editor.html:
// «Основное» (заголовок, slug, кратко, обложка, рубрики), markdown с живым
// предпросмотром, SEO и кнопки сохранения/публикации. Статус и дату меняет
// отдельный /publish (D-B14) — форма их только показывает.
export default function BlogEditor({
  post,
  tags,
}: {
  post?: BlogEditorPost;
  tags: BlogTagOption[];
}) {
  const dict = useAdminDict();
  const d = dict.blogEditor;
  const locale = useAdminLocale() ?? "ru";
  const router = useRouter();

  const [form, setForm] = useState<FormState>(() => buildForm(post));
  const [snapshot, setSnapshot] = useState<FormState>(() => buildForm(post));
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newTag, setNewTag] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageAlt, setImageAlt] = useState("");
  const [media, setMedia] = useState<{ name: string; path: string }[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState("");

  // Активная локаль каждого локализованного поля (RU по умолчанию).
  const [fieldLocale, setFieldLocale] = useState<{
    title: LocaleKey;
    excerpt: LocaleKey;
    metaTitle: LocaleKey;
    metaDescription: LocaleKey;
  }>({
    title: locale === "en" ? "en" : locale === "uk" ? "uk" : "ru",
    excerpt: locale === "en" ? "en" : locale === "uk" ? "uk" : "ru",
    metaTitle: locale === "en" ? "en" : locale === "uk" ? "uk" : "ru",
    metaDescription: locale === "en" ? "en" : locale === "uk" ? "uk" : "ru",
  });

  const mdRef = useRef<MarkdownFieldHandle>(null);

  const status: BlogPostStatus = post?.status ?? "draft";
  const published = status === "published";
  const dirty = isDirty(form, snapshot);
  const isNew = !post;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Заголовок RU задаёт slug, пока тот не правлен руками (D-B9).
  const setLocalized = (key: "title" | "excerpt" | "metaTitle" | "metaDescription", loc: LocaleKey, value: string) => {
    setForm((prev) => {
      const next: FormState = { ...prev, [key]: { ...prev[key], [loc]: value } };
      if (key === "title" && loc === "ru" && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  // Предупреждение при уходе со страницы с несохранёнными правками.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const payload = () => ({
    slug: form.slug.trim(),
    title: form.title,
    excerpt: form.excerpt,
    content: form.content,
    coverImage: form.coverImage,
    metaTitle: nullableLs(form.metaTitle),
    metaDescription: nullableLs(form.metaDescription),
    tagIds: [...form.tagIds].sort((a, b) => a - b),
  });

  const readError = async (res: Response) => {
    const text = await res.text();
    setError(text || dict.blog.errorPublish);
  };

  // Сохраняет поля и рубрики. Для новой записи — POST (всегда черновик),
  // для существующей — PUT (статус и дату не трогает).
  const save = async (): Promise<number | null> => {
    if (busy) return null;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(isNew ? "/api/admin/blog" : `/api/admin/blog/${post!.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      if (!res.ok) {
        await readError(res);
        return null;
      }
      const json = (await res.json()) as { id?: number };
      // Снимок = то, что реально сохранено: после этого isDirty сбрасывается.
      setSnapshot({ ...form });
      if (!isNew) {
        setSlugTouched(true);
        router.refresh();
      }
      return isNew ? (json.id ?? null) : post!.id;
    } catch {
      setError(dict.blog.errorPublish);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const publishToggle = async () => {
    if (busy || !post) return;
    setBusy(true);
    setError("");
    try {
      // Сначала сохраняем правки, иначе публикуется старый текст.
      if (dirty) {
        const saved = await fetch(`/api/admin/blog/${post.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload()),
        });
        if (!saved.ok) {
          await readError(saved);
          return;
        }
      }
      const res = await fetch(`/api/admin/blog/${post.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: published ? "unpublish" : "publish" }),
      });
      if (!res.ok) {
        await readError(res);
        return;
      }
      router.refresh();
      router.push("/admin/blog");
    } catch {
      setError(dict.blog.errorPublish);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!post || busy) return;
    if (!confirm(dict.blog.confirmDelete.replace("{name}", L(form.title, locale)))) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, { method: "DELETE" });
      if (!res.ok) {
        await readError(res);
        return;
      }
      router.push("/admin/blog");
    } catch {
      setError(dict.blog.deleteFailed);
    } finally {
      setBusy(false);
    }
  };

  const toggleTag = (id: number) => {
    setField(
      "tagIds",
      form.tagIds.includes(id) ? form.tagIds.filter((x) => x !== id) : [...form.tagIds, id],
    );
  };

  const createTag = async () => {
    const name = newTag.trim();
    if (!name || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/blog/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: { ru: name },
          slug: slugify(name),
          sortOrder: (tags.length ? Math.max(...tags.map((t) => t.id)) : 0) + 1,
          isActive: true,
        }),
      });
      if (!res.ok) {
        setError(d.errorTags);
        return;
      }
      const { id } = (await res.json()) as { id: number };
      setField("tagIds", [...form.tagIds, id]);
      setNewTag("");
      // Список рубрик приедет с сервера; состояние формы при этом сохраняется.
      router.refresh();
    } catch {
      setError(d.errorTags);
    } finally {
      setBusy(false);
    }
  };

  const openImagePicker = async () => {
    setImageOpen(true);
    setMediaBusy(true);
    setMediaError("");
    try {
      const res = await fetch("/api/admin/blog/media");
      if (!res.ok) {
        setMediaError(d.errorMedia);
        return;
      }
      const { files } = (await res.json()) as { files: { name: string; path: string }[] };
      setMedia(files);
    } catch {
      setMediaError(d.errorMedia);
    } finally {
      setMediaBusy(false);
    }
  };

  const insertImage = (path: string) => {
    const alt = imageAlt.trim() || path.split("/").pop() || "";
    mdRef.current?.insertAtCaret(`![${alt}](${path})`);
    setImageAlt("");
    setImageOpen(false);
  };

  const leave = () => {
    if (dirty && !window.confirm(dict.products.confirmClose)) return;
    router.push("/admin/blog");
  };

  const locTabs = (
    field: "title" | "excerpt" | "metaTitle" | "metaDescription",
  ) => (
    <div className="loc-tabs">
      {LOCALES.map((loc) => (
        <button
          key={loc}
          type="button"
          className={fieldLocale[field] === loc ? "loc-tab is-active" : "loc-tab"}
          onClick={() => setFieldLocale((prev) => ({ ...prev, [field]: loc }))}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="page-title">
        <h1>{isNew ? d.headingNew : d.headingEdit}</h1>
        <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="doodle">{dirty ? d.doodleDirty : dict.blog.heading}</span>
          <button type="button" className="btn" onClick={leave}>
            {d.backLink}
          </button>
        </div>
      </div>

      <div className="blog-status-line">
        <span className={published ? "tag tag--done" : "tag tag--none"}>
          {published ? dict.blog.statusPublished : dict.blog.statusDraft}
        </span>
        <small className="muted" style={{ fontSize: "0.72rem" }}>
          {published ? (
            <>
              {fmtDateTime(post?.publishedAt ?? null)} ·{" "}
              <a href={`/blog/${form.slug}`} target="_blank" rel="noopener noreferrer">
                {d.openOnSite}
              </a>
            </>
          ) : (
            d.statusDraftHint
          )}
        </small>
      </div>

      <div className="board board--paper mb-20">
        <div className="form-card" style={{ boxShadow: "none" }}>
          <h3>{d.sectionMain}</h3>

          <div className="field--row">
            <div className="field" style={{ flex: 2 }}>
              {locTabs("title")}
              <label>{d.labelTitle}</label>
              <input
                type="text"
                value={form.title[fieldLocale.title]}
                placeholder={d.placeholderTitle}
                onChange={(e) => setLocalized("title", fieldLocale.title, e.target.value)}
              />
            </div>
            <div className="field">
              <label>{d.labelSlug}</label>
              <input
                type="text"
                value={form.slug}
                placeholder={d.placeholderSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setField("slug", e.target.value);
                }}
              />
              <span className="hint">{d.slugHint}</span>
            </div>
          </div>

          <div className="field">
            {locTabs("excerpt")}
            <label>{d.labelExcerpt}</label>
            <textarea
              value={form.excerpt[fieldLocale.excerpt]}
              placeholder={d.placeholderExcerpt}
              onChange={(e) => setLocalized("excerpt", fieldLocale.excerpt, e.target.value)}
            />
          </div>

          <h4>{d.labelCover}</h4>
          <div className="blog-cover-prev">
            <div className="bc-thumb">
              {form.coverImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={form.coverImage} alt="" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22242a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="9" cy="9" r="1.6" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              )}
            </div>
            <div className="bc-side">
              <ImageUploader
                kind="blog"
                maxMB={5}
                accept="image/jpeg,image/png,image/webp"
                title={d.dzTitle}
                hint={d.dzHint}
                onUploaded={(path) => setField("coverImage", path)}
                dict={{
                  photoTooBig: dict.products.photoTooBig,
                  photoError: dict.products.photoError,
                  photoUploading: dict.products.photoUploading,
                }}
              >
                {form.coverImage && (
                  <button
                    type="button"
                    className="btn btn--small"
                    style={{ marginTop: "10px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setField("coverImage", null);
                    }}
                  >
                    {d.coverRemove}
                  </button>
                )}
              </ImageUploader>
            </div>
          </div>

          <h4>{d.labelTags}</h4>
          <div className="tag-pick">
            {tags.map((tag, i) => (
              <button
                key={tag.id}
                type="button"
                className={`chip ${CHIP_CYCLE[i % CHIP_CYCLE.length]} ${form.tagIds.includes(tag.id) ? "is-on" : ""}`}
                onClick={() => toggleTag(tag.id)}
              >
                {L(tag.name, locale)}
              </button>
            ))}
          </div>
          <div className="field--row">
            <div className="field">
              <label>{d.newTagLabel}</label>
              <input
                type="text"
                value={newTag}
                placeholder={d.newTagPlaceholder}
                onChange={(e) => setNewTag(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: "none" }}>
              <label>&nbsp;</label>
              <button
                type="button"
                className="btn"
                disabled={busy || !newTag.trim()}
                onClick={() => void createTag()}
              >
                {d.addTagButton}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="board board--paper mb-20">
        <MarkdownField
          ref={mdRef}
          value={form.content}
          onChange={(next) => setField("content", next)}
          onPickImage={() => void openImagePicker()}
        />

        {imageOpen && (
          <div className="form-card" style={{ boxShadow: "none", borderTop: "3px dashed var(--dot)" }}>
            <h3>{d.imagePickerTitle}</h3>
            <div className="field">
              <label>{d.imageAltLabel}</label>
              <input
                type="text"
                value={imageAlt}
                placeholder={d.imageAltPlaceholder}
                onChange={(e) => setImageAlt(e.target.value)}
              />
            </div>
            <ImageUploader
              kind="blog"
              maxMB={5}
              accept="image/jpeg,image/png,image/webp"
              title={d.imagePickerUpload}
              hint={dict.components.dzHint}
              onUploaded={(path) => insertImage(path)}
              dict={{
                photoTooBig: dict.products.photoTooBig,
                photoError: dict.products.photoError,
                photoUploading: dict.products.photoUploading,
              }}
            />
            {mediaError && <p style={{ color: "var(--rust)", marginTop: "10px" }}>{mediaError}</p>}
            {mediaBusy && <small className="muted">{dict.components.uploading}</small>}
            {!mediaBusy && media.length > 0 && (
              <>
                <h4>{d.imagePickerFolder}</h4>
                <div className="tag-pick">
                  {media.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      className="btn btn--small"
                      onClick={() => insertImage(file.path)}
                    >
                      {file.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="board board--paper mb-20">
        <div className="form-card" style={{ boxShadow: "none" }}>
          <h3>{d.sectionSeo}</h3>
          <p className="hint mb-20">{d.seoHint}</p>
          <div className="field--row">
            <div className="field">
              {locTabs("metaTitle")}
              <label>{d.labelMetaTitle}</label>
              <input
                type="text"
                value={form.metaTitle[fieldLocale.metaTitle]}
                placeholder={d.placeholderMetaTitle}
                onChange={(e) => setLocalized("metaTitle", fieldLocale.metaTitle, e.target.value)}
              />
            </div>
            <div className="field">
              {locTabs("metaDescription")}
              <label>{d.labelMetaDescription}</label>
              <input
                type="text"
                value={form.metaDescription[fieldLocale.metaDescription]}
                placeholder={d.placeholderMetaDescription}
                onChange={(e) =>
                  setLocalized("metaDescription", fieldLocale.metaDescription, e.target.value)
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="board board--paper mb-20">
        <div className="form-card" style={{ boxShadow: "none" }}>
          <div className="form-actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className={`btn btn--primary ${dirty ? "is-dirty" : ""}`}
              disabled={busy || (!dirty && !isNew)}
              onClick={() => {
                void save().then((id) => {
                  if (isNew && id !== null) router.push(`/admin/blog/${id}`);
                });
              }}
            >
              {isNew ? d.saveDraft : d.saveChanges}
            </button>

            {post && (
              <button
                type="button"
                className={published ? "btn btn--secondary" : "btn btn--mustard"}
                disabled={busy}
                onClick={() => void publishToggle()}
              >
                {published ? dict.blog.unpublish : dict.blog.publish}
              </button>
            )}

            <button type="button" className="btn" disabled={busy} onClick={leave}>
              {dict.blog.cancel}
            </button>
            <span className="grow-1"></span>
            {post && (
              <button type="button" className="btn" disabled={busy} onClick={() => void remove()}>
                {d.deletePost}
              </button>
            )}
          </div>
          <p className="hint" style={{ marginTop: "14px" }}>
            {d.footerHint}
          </p>
          {error && (
            <p style={{ color: "var(--rust)", marginTop: "12px", fontWeight: "700" }}>{error}</p>
          )}
        </div>
      </div>
    </>
  );
}
