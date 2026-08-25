"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Text, Group } from "react-konva";
import type Konva from "konva";
import type { CalcComponent, Selection } from "@/lib/calc";

// Коллаж (T-5.2): react-konva вместо div.canvas из макета.
// Авторазмещение — сетка 3×N с лёгким случайным наклоном (seed по id компонента).
// Взаимодействия: drag каждой детали, зум колесом, удаление кликом по ×.

const CANVAS = 640;

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

type PlacedItem = {
  uid: string;
  componentId: number;
  name: string;
  photo: string;
  x: number;
  y: number;
  rotation: number;
  boxSize: number;
};

type CanvasComp = CalcComponent & { photo: string };

export default function CollageCanvas({
  selections,
  componentsById,
  onRemove,
  onDataUrl,
}: {
  selections: Selection[];
  componentsById: Map<number, CanvasComp>;
  onRemove: (componentId: number) => void;
  onDataUrl?: (dataUrl: string | null) => void;
}) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [scale, setScale] = useState(1);
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [size, setSize] = useState(CANVAS);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  // Порядок наведения: uid, поднятые кликом/перетаскиванием (последний — верхний)
  const [raised, setRaised] = useState<string[]>([]);
  // uid экземпляра, удалённого крестиком: он должен уйти конкретный, а не «последний
  // добавленный того же типа», как получалось бы при обычной свёртке selections
  const removedUidRef = useRef<string | null>(null);
  // монотонный счётчик uid — не связан с порядковым номером копии в selections
  const uidCounterRef = useRef(0);

  const raise = (uid: string) =>
    setRaised((prev) => [...prev.filter((u) => u !== uid), uid]);

  // Пользовательский фон коллажа (файл → data URL → Image)
  const loadBgFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => setBgImage(img);
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Адаптивная ширина сцены
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Предзагрузка картинок компонентов
  useEffect(() => {
    let alive = true;
    const next = new Map(images);
    let pending = false;
    for (const sel of selections) {
      const comp = componentsById.get(sel.componentId);
      if (!comp || next.has(comp.photo)) continue;
      pending = true;
      const img = new window.Image();
      img.src = comp.photo;
      img.onload = () => {
        if (!alive) return;
        setImages((prev) => new Map(prev).set(comp.photo, img));
      };
      next.set(comp.photo, img);
    }
    if (!pending) return () => { alive = false; };
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections, componentsById]);

  // Устойчивые позиции: экземпляр получает место в сетке один раз при добавлении,
  // дальше живёт в state — drag/порядок отрисовки/удаление чужие координаты не трогают
  const [placed, setPlaced] = useState<PlacedItem[]>([]);

  // Синхронизация размещений с selections. uid экземпляров монотонный и не связан
  // с порядковым номером копии — удаление/добавление не создаёт «дырок» в нумерации:
  // крестик убирает конкретный экземпляр, внешнее уменьшение счётчика — последние
  // копии типа, добавление — новые экземпляры в конец сетки
  useEffect(() => {
    const wanted = new Map<number, { name: string; photo: string; qty: number }>();
    let total = 0;
    for (const sel of selections) {
      const comp = componentsById.get(sel.componentId);
      if (!comp || sel.qty <= 0) continue;
      wanted.set(comp.id, { name: comp.name, photo: comp.photo, qty: sel.qty });
      total += sel.qty;
    }
    const n = Math.max(total, 1);
    const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(n))));
    const rows = Math.ceil(n / cols);
    const cellW = size / cols;
    const cellH = size / Math.max(rows, cols);
    // Размер детали фиксированный (от базовой сетки 3 колонки), чтобы все были одинаковыми
    // независимо от того, сколько элементов уже добавлено
    const boxSize = (size / 3) * 0.62;
    setPlaced((prev) => {
      const items = prev.filter((p) => wanted.has(p.componentId));
      // крестик: удалить именно тот экземпляр, на котором нажали
      if (removedUidRef.current != null) {
        const i = items.findIndex((p) => p.uid === removedUidRef.current);
        if (i !== -1) items.splice(i, 1);
        removedUidRef.current = null;
      }
      // лишние копии (счётчик уменьшили вне холста) — убираем последние
      const counts = new Map<number, number>();
      for (const p of items) counts.set(p.componentId, (counts.get(p.componentId) ?? 0) + 1);
      for (const [cid, w] of wanted) {
        let excess = (counts.get(cid) ?? 0) - w.qty;
        for (let i = items.length - 1; i >= 0 && excess > 0; i--) {
          if (items[i].componentId === cid) {
            items.splice(i, 1);
            excess -= 1;
          }
        }
      }
      // недостающие — новые экземпляры со свежими uid в конец сетки
      for (const [cid, w] of wanted) {
        let deficit = w.qty - items.filter((p) => p.componentId === cid).length;
        while (deficit > 0) {
          const idx = items.length;
          uidCounterRef.current += 1;
          const jitterX = (pseudoRandom(cid * 31 + idx) - 0.5) * cellW * 0.25;
          const jitterY = (pseudoRandom(cid * 17 + idx + 7) - 0.5) * cellH * 0.2;
          items.push({
            uid: `${cid}#${uidCounterRef.current}`,
            componentId: cid,
            name: w.name,
            photo: w.photo,
            x: (idx % cols) * cellW + cellW / 2 + jitterX,
            y: Math.floor(idx / cols) * cellH + cellH / 2 + jitterY,
            rotation: (pseudoRandom(cid * 23 + idx + 13) - 0.5) * 12,
            boxSize,
          });
          deficit -= 1;
        }
      }
      return items;
    });
  }, [selections, componentsById, size]);

  // Порядок отрисовки: поднятые кликом/drag элементы рисуются последними (сверху)
  const drawOrder = useMemo(
    () =>
      [...placed].sort((a, b) => {
        const ra = raised.indexOf(a.uid);
        const rb = raised.indexOf(b.uid);
        if (ra === -1 && rb === -1) return 0;
        if (ra === -1) return -1;
        if (rb === -1) return 1;
        return ra - rb;
      }),
    [placed, raised],
  );

  // Сброс вида: элементы не двигаются — подбирается масштаб, при котором
  // весь коллаж (с учётом габаритов деталей) помещается в холст
  const resetView = () => {
    const pad = 16;
    let maxX = 0;
    let maxY = 0;
    for (const p of placed) {
      const img = images.get(p.photo);
      const ratio = img && img.width > 0 ? img.height / img.width : 1;
      const hw = p.boxSize / 2;
      const hh = (p.boxSize * ratio) / 2 + 28;
      maxX = Math.max(maxX, p.x + hw);
      maxY = Math.max(maxY, p.y + hh);
    }
    // Зум в Konva идёт от точки (0,0), поэтому делим размер холста
    // на максимальные координаты правого/нижнего края коллажа
    const avail = size - pad * 2;
    const fit = Math.min(2.5, 1, avail / maxX, avail / maxY);
    setScale(Math.max(0.2, fit));
  };

  // Экспорт PNG для заявки (после отрисовки); фон тоже участвует
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !onDataUrl) return;
    if (placed.length === 0) {
      onDataUrl(null);
      return;
    }
    const t = window.setTimeout(() => onDataUrl(stage.toDataURL({ pixelRatio: 1.5 })), 60);
    return () => window.clearTimeout(t);
  }, [placed.length, images, bgImage, onDataUrl]);

  return (
    <div className="canvas-area">
      <div className="ca-bar">
        <div>
          <b>Ваш коллаж</b>
          <br />
          <small>
            {placed.length === 0 ? "пока пусто" : `${placed.length} деталей`} · перетаскивайте · Ctrl+колесо — зум
          </small>
        </div>
        <div className="tools">
          <span className="chip" onClick={resetView} style={{ cursor: "pointer" }}>
            сброс
          </span>
        </div>
      </div>
      <div ref={containerRef} style={{ width: "100%" }}>
        <Stage
          ref={stageRef}
          width={size}
          height={size}
          scaleX={scale}
          scaleY={scale}
          onWheel={(e) => {
            // Зум только по Ctrl+колесо; обычное колесо не перехватываем — страница скроллится
            if (!e.evt.ctrlKey) return;
            e.evt.preventDefault();
            setScale((s) => Math.min(2.5, Math.max(0.5, s + (e.evt.deltaY > 0 ? -0.08 : 0.08))));
          }}
        >
          <Layer listening={false}>
            {/* Пользовательский фон — самый нижний слой, растягивается на весь холст */}
            {bgImage && (
              <KonvaImage
                image={bgImage}
                x={0}
                y={0}
                width={size}
                height={size}
                scaleX={1 / scale}
                scaleY={1 / scale}
              />
            )}
          </Layer>
          <Layer>
            {drawOrder.map((item) => {
              const img = images.get(item.photo);
              const ratio = img && img.width > 0 ? img.height / img.width : 1;
              const w = item.boxSize;
              const h = w * ratio;
              return (
                <Group
                  key={item.uid}
                  x={item.x}
                  y={item.y}
                  rotation={item.rotation}
                  draggable
                  onMouseDown={() => raise(item.uid)}
                  onTouchStart={() => raise(item.uid)}
                  onDragStart={() => raise(item.uid)}
                  onDragEnd={(e) => {
                    const { x, y } = e.target.attrs;
                    setPlaced((prev) =>
                      prev.map((p) =>
                        p.uid === item.uid ? { ...p, x, y } : p,
                      ),
                    );
                  }}
                >
                  {img ? (
                    <KonvaImage
                      image={img}
                      x={-w / 2}
                      y={-h / 2}
                      width={w}
                      height={h}
                      cornerRadius={12}
                    />
                  ) : (
                    <>
                      {/* плейсхолдер, пока картинка грузится */}
                      <Text text="…" x={-10} y={-10} fontSize={20} />
                    </>
                  )}
                  <Text
                    text={`✕`}
                    x={w / 2 - 14}
                    y={-h / 2}
                    fontSize={16}
                    fill="#c0392b"
                    onClick={() => {
                      removedUidRef.current = item.uid;
                      onRemove(item.componentId);
                    }}
                    onTap={() => {
                      removedUidRef.current = item.uid;
                      onRemove(item.componentId);
                    }}
                  />
                  <Text
                    text={item.name}
                    x={-w / 2}
                    y={h / 2 + 8}
                    width={w}
                    align="center"
                    fontSize={11}
                    fill="#666"
                  />
                </Group>
              );
            })}
            {placed.length === 0 && (
              <Group>
                <Text
                  text="Выберите камни и подвески слева —\nколлаж соберётся автоматически"
                  x={size / 2 - 180}
                  y={size / 2 - 20}
                  width={360}
                  align="center"
                  fontSize={15}
                  fill="#999"
                />
              </Group>
            )}
          </Layer>
        </Stage>
      </div>
      <div className="ca-bar ca-bar--bottom">
        <button className="btn btn--secondary btn--small" onClick={() => bgInputRef.current?.click()}>
          Загрузить фон
        </button>
        {bgImage && (
          <button
            className="btn btn--secondary btn--small"
            onClick={() => {
              setBgImage(null);
              if (bgInputRef.current) bgInputRef.current.value = "";
            }}
          >
            Очистить фон
          </button>
        )}
        <input
          ref={bgInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            loadBgFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
