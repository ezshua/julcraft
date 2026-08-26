"use client";

import { useEffect, useRef, useState } from "react";

const MIN_VISIBLE = 0.05; // 5% от размера картинки должно оставаться в кадре
const FIT_PADDING_X = 0.92; // 92vw
const FIT_PADDING_Y = 0.88; // 88vh

type Size = { w: number; h: number };

function clampPan(
  tx: number,
  ty: number,
  scale: number,
  img: Size,
  stage: Size,
): { x: number; y: number } {
  // Реальный размер картинки в пикселях экрана (с учётом текущего scale).
  const dispW = img.w * scale;
  const dispH = img.h * scale;
  // Максимальное смещение от центра по каждой оси.
  // - Если картинка меньше сцены: можно сдвинуть её так, чтобы она ещё касалась края (не дальше).
  // - Если картинка больше сцены: торчит минимум на MIN_VISIBLE*disp в каждую сторону,
  //   значит сместить от центра можно не больше чем disp*(1 - MIN_VISIBLE)/2.
  const maxX =
    dispW >= stage.w
      ? (dispW * (1 - MIN_VISIBLE)) / 2
      : (stage.w - dispW) / 2;
  const maxY =
    dispH >= stage.h
      ? (dispH * (1 - MIN_VISIBLE)) / 2
      : (stage.h - dispH) / 2;
  return {
    x: Math.max(-maxX, Math.min(maxX, tx)),
    y: Math.max(-maxY, Math.min(maxY, ty)),
  };
}

function fitScale(img: Size, stage: Size): number {
  if (img.w === 0 || img.h === 0) return 1;
  const kx = (stage.w * FIT_PADDING_X) / img.w;
  const ky = (stage.h * FIT_PADDING_Y) / img.h;
  return Math.min(kx, ky, 1);
}

export default function CollageLightbox({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const movedRef = useRef(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const naturalRef = useRef<Size>({ w: 0, h: 0 });
  const stageSizeRef = useRef<Size>({ w: 0, h: 0 });

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  useEffect(() => {
    if (!open) return;
    reset();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "+" || e.key === "=") {
        setScale((s) => {
          const next = Math.min(8, +(s + 0.25).toFixed(2));
          return next;
        });
      } else if (e.key === "-") {
        setScale((s) => Math.max(1, +(s - 0.25).toFixed(2)));
      } else if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Следим за размером сцены, чтобы корректно клампить pan.
  useEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      stageSizeRef.current = { w: r.width, h: r.height };
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // При изменении масштаба или натурального размера картинки пересчитываем pan,
  // чтобы картинка не «уезжала» за пределы видимой области.
  useEffect(() => {
    const img = naturalRef.current;
    const stage = stageSizeRef.current;
    if (img.w === 0 || img.h === 0 || stage.w === 0 || stage.h === 0) return;
    const clamped = clampPan(tx, ty, scale, img, stage);
    if (clamped.x !== tx || clamped.y !== ty) {
      setTx(clamped.x);
      setTy(clamped.y);
    }
  }, [scale, tx, ty]);

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.2;
    setScale((s) => Math.max(1, Math.min(8, +(s + delta).toFixed(2))));
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    movedRef.current = false;
    if (scale <= 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY, tx, ty };
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.x) > 4 || Math.abs(e.clientY - d.y) > 4) {
      movedRef.current = true;
    }
    const newTx = d.tx + (e.clientX - d.x);
    const newTy = d.ty + (e.clientY - d.y);
    const clamped = clampPan(newTx, newTy, scale, naturalRef.current, stageSizeRef.current);
    setTx(clamped.x);
    setTy(clamped.y);
  };
  const onMouseUp = () => {
    dragRef.current = null;
  };

  // Двойной клик по картинке: fit-to-screen ↔ 1:1.
  const onDoubleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    const img = naturalRef.current;
    const stage = stageSizeRef.current;
    const fit = fitScale(img, stage);
    if (Math.abs(scale - fit) < 0.01) {
      reset();
    } else {
      setScale(fit);
      setTx(0);
      setTy(0);
    }
  };

  return (
    <>
      <button
        className="icon-btn"
        style={{ width: 32, height: 32 }}
        title="Смотреть коллаж"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        🖼
      </button>
      {open && (
        <div
          className="modal-overlay open"
          style={{
            background: "rgba(20, 14, 10, 0.92)",
            padding: 0,
          }}
        >
          <div
            ref={stageRef}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onClick={(e) => {
              e.stopPropagation();
              if (movedRef.current) {
                movedRef.current = false;
                return;
              }
              if (e.target === stageRef.current) setOpen(false);
            }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: scale > 1 ? "grab" : "zoom-in",
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="Коллаж заявки"
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                naturalRef.current = { w: el.naturalWidth, h: el.naturalHeight };
              }}
              onDoubleClick={onDoubleClick}
              style={{
                maxWidth: "92vw",
                maxHeight: "88vh",
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transition: dragRef.current ? "none" : "transform 0.12s ease",
                userSelect: "none",
                border: "3px solid var(--brown)",
                borderRadius: 12,
                background: "var(--white)",
                boxShadow: "0 8px 30px rgba(0,0,0,.4)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (movedRef.current) {
                  movedRef.current = false;
                  return;
                }
                if (scale < 8) setScale((s) => Math.min(8, +(s + 0.5).toFixed(2)));
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span
              style={{
                color: "var(--paper)",
                fontSize: ".85rem",
                background: "rgba(0,0,0,.4)",
                padding: "6px 10px",
                borderRadius: 8,
                userSelect: "none",
              }}
            >
              {Math.round(scale * 100)}%
            </span>
            <button
              className="icon-btn"
              style={{ width: 36, height: 36, background: "var(--paper)" }}
              title="Уменьшить"
              onClick={() => setScale((s) => Math.max(1, +(s - 0.25).toFixed(2)))}
            >
              −
            </button>
            <button
              className="icon-btn"
              style={{ width: 36, height: 36, background: "var(--paper)" }}
              title="Сбросить масштаб"
              onClick={reset}
            >
              1:1
            </button>
            <button
              className="icon-btn"
              style={{ width: 36, height: 36, background: "var(--paper)" }}
              title="Увеличить"
              onClick={() => setScale((s) => Math.min(8, +(s + 0.25).toFixed(2)))}
            >
              +
            </button>
            <button
              className="icon-btn"
              style={{ width: 36, height: 36, background: "var(--paper)" }}
              title="Закрыть"
              aria-label="Закрыть"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
