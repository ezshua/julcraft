"use client";

import {
  forwardRef,
  useDeferredValue,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import MarkdownBody from "@/components/blog/MarkdownBody";
import { useAdminDict, useAdminLocale } from "./admin-dict-context";

export type MdValue = { ru: string; en: string; uk: string };

export type MdEditResult = { text: string; start: number; end: number };

function clamp(value: number, text: string): number {
  return Math.max(0, Math.min(value, text.length));
}

/**
 * Правки markdown — чистые функции без DOM, чтобы их можно было покрыть
 * тестом без браузера (правило этапа 7).
 *
 * wrapSelection — оборачивает выделение; если выделение пустое, вставляет
 * пару и оставляет её выделенной, чтобы мастер сразу печатал.
 * prefixLines  — ставит префикс (##, >, -, 1., - [ ]) на каждую строку
 *                 выделения, предварительно снимая прежний маркер.
 * insertAt     — вставляет готовый блок в позицию курсора.
 * insertTable  — заготовка таблицы GFM в позиции курсора.
 */
export function wrapSelection(
  text: string,
  start: number,
  end: number,
  before: string,
  after: string,
): MdEditResult {
  const from = clamp(start, text);
  const to = Math.max(from, clamp(end, text));
  const inner = text.slice(from, to);
  const next = `${text.slice(0, from)}${before}${inner}${after}${text.slice(to)}`;
  if (inner === "") {
    return { text: next, start: from + before.length, end: from + before.length };
  }
  return { text: next, start: from, end: from + before.length + inner.length + after.length };
}

export function prefixLines(
  text: string,
  start: number,
  end: number,
  prefix: string,
  numbered = false,
): MdEditResult {
  const from = clamp(start, text);
  const to = Math.max(from, clamp(end, text));
  const block = text.slice(from, to);
  const lines = block === "" ? [""] : block.split("\n");

  let counter = 1;
  const marked = lines.map((line) => {
    // Порядок альтернатив важен: сначала чекбокс задачи («- [x] »),
    // иначе обычный маркер списка съел бы его и оставил «[x]» в тексте.
    const parts = line.match(
      /^(\s*)(?:- \[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+|>\s+)?([\s\S]*)$/,
    );
    const indent = parts?.[1] ?? "";
    const rest = parts?.[2] ?? "";
    const mark = numbered ? `${counter++}. ` : prefix;
    return `${indent}${mark}${rest}`;
  });

  const replaced = marked.join("\n");
  return { text: `${text.slice(0, from)}${replaced}${text.slice(to)}`, start: from, end: from + replaced.length };
}

export function insertAt(text: string, pos: number, block: string): MdEditResult {
  const at = clamp(pos, text);
  return {
    text: `${text.slice(0, at)}${block}${text.slice(at)}`,
    start: at + block.length,
    end: at + block.length,
  };
}

export function insertTable(text: string, pos: number, rows = 2, cols = 2): MdEditResult {
  const row = (cells: string[]) => `| ${cells.join(" | ")} |`;
  const empty = Array.from({ length: cols }, () => "  ");
  const block =
    `\n${row(empty)}\n${row(Array.from({ length: cols }, () => "---"))}\n` +
    `${Array.from({ length: rows }, () => row(empty)).join("\n")}\n`;
  return insertAt(text, pos, block);
}

type MdAction = {
  key: string;
  label: string;
  run: (text: string, start: number, end: number) => MdEditResult;
};

export type MarkdownFieldHandle = {
  /** Вставляет готовый markdown в позицию курсора (картинка из 7.4). */
  insertAtCaret: (markdown: string) => void;
};

type Props = {
  value: MdValue;
  onChange: (next: MdValue) => void;
  /** Открывает выбор картинки (BlogEditor, пункт 7.4). */
  onPickImage: () => void;
};

// Редактор markdown с живым предпросмотром: предпросмотр — тот же
// MarkdownBody, что и на витрине (D-B4). Разметка панелей — копия блоков
// md-toolbar / md-pane / md-head / md-foot из mockup/admin/blog-editor.html.
const MarkdownField = forwardRef<MarkdownFieldHandle, Props>(function MarkdownField(
  { value, onChange, onPickImage },
  ref,
) {
  const d = useAdminDict().blogEditor;
  const adminLocale = useAdminLocale();
  const [tab, setTab] = useState<"ru" | "en" | "uk">(
    adminLocale === "en" ? "en" : adminLocale === "uk" ? "uk" : "ru",
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const text = value[tab];
  // Предпросмотр откладываем: запись со 100+ картинками не должна подвисать
  // (plan-5-blog.md §9).
  const preview = useDeferredValue(text);

  const selection = () => {
    const el = textareaRef.current;
    return el
      ? { start: el.selectionStart, end: el.selectionEnd }
      : { start: text.length, end: text.length };
  };

  const apply = (result: MdEditResult) => {
    onChange({ ...value, [tab]: result.text });
    pendingRef.current = { start: result.start, end: result.end };
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pendingRef.current.start, pendingRef.current.end);
    });
  };

  useImperativeHandle(ref, () => ({
    insertAtCaret(markdown: string) {
      const { start } = selection();
      const needsBreak = start > 0 && !text.slice(0, start).endsWith("\n");
      apply(insertAt(text, start, `${needsBreak ? "\n" : ""}\n${markdown}\n`));
    },
  }));

  const actions: MdAction[] = [
    { key: "bold", label: d.mdBold, run: (t, s, e) => wrapSelection(t, s, e, "**", "**") },
    { key: "italic", label: d.mdItalic, run: (t, s, e) => wrapSelection(t, s, e, "*", "*") },
    { key: "strike", label: d.mdStrike, run: (t, s, e) => wrapSelection(t, s, e, "~~", "~~") },
    { key: "h2", label: d.mdH2, run: (t, s, e) => prefixLines(t, s, e, "## ") },
    { key: "h3", label: d.mdH3, run: (t, s, e) => prefixLines(t, s, e, "### ") },
    { key: "quote", label: d.mdQuote, run: (t, s, e) => prefixLines(t, s, e, "> ") },
    { key: "bullet", label: d.mdBullet, run: (t, s, e) => prefixLines(t, s, e, "- ") },
    { key: "ordered", label: d.mdOrdered, run: (t, s, e) => prefixLines(t, s, e, "", true) },
    { key: "task", label: d.mdTask, run: (t, s, e) => prefixLines(t, s, e, "- [ ] ") },
    { key: "table", label: d.mdTable, run: (t, _s, e) => insertTable(t, e) },
    { key: "link", label: d.mdLink, run: (t, s, e) => wrapSelection(t, s, e, "[", "](https://)") },
    { key: "code", label: d.mdCode, run: (t, s, e) => wrapSelection(t, s, e, "`", "`") },
    { key: "divider", label: d.mdDivider, run: (t, s) => insertAt(t, s, "\n---\n\n") },
  ];

  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  return (
    <div className="form-card" style={{ boxShadow: "none" }}>
      <div className="loc-tabs" style={{ marginBottom: "14px" }}>
        {(["ru", "en", "uk"] as const).map((loc) => (
          <button
            key={loc}
            type="button"
            className={tab === loc ? "loc-tab is-active" : "loc-tab"}
            onClick={() => setTab(loc)}
          >
            {loc.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="md-toolbar">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className="md-btn"
            onClick={() => {
              const { start, end } = selection();
              apply(action.run(text, start, end));
            }}
          >
            {action.label}
          </button>
        ))}
        <button type="button" className="md-btn" onClick={onPickImage}>
          {d.mdImage}
        </button>
      </div>

      <div className="blog-editor-grid">
        <div>
          <div className="md-head">
            <b>{d.mdTextLabel}</b>
            <small>{d.mdTextSub}</small>
          </div>
          <div className="md-pane">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => onChange({ ...value, [tab]: e.target.value })}
              aria-label={d.mdTextLabel}
            />
          </div>
        </div>
        <div>
          <div className="md-head">
            <b>{d.mdPreviewLabel}</b>
            <small>{d.mdPreviewSub}</small>
          </div>
          <div className="md-pane">
            <MarkdownBody source={preview} />
          </div>
        </div>
      </div>

      <div className="md-foot">
        <span>{d.mdChars.replace("{n}", String(text.length))}</span>
        <span>{d.mdWords.replace("{n}", String(words))}</span>
      </div>
    </div>
  );
});

export default MarkdownField;
