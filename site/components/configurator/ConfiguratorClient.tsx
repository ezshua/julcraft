"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Crumbs from "@/components/ui/Crumbs";
import OrderRequestModal from "@/components/configurator/OrderRequestModal";
import { useCurrency } from "@/lib/use-currency";
import {
  calcConfigPrice,
  calcConfigDays,
  type CalcCategory,
  type CalcComponent,
  type Selection,
} from "@/lib/calc";
import { formatPrice, plural } from "@/lib/format";
import type { FinanceSettings } from "@/lib/currency";

const CollageCanvas = dynamic(() => import("./CollageCanvas"), { ssr: false });

export type ConfiguratorSlot = {
  id: number;
  name: string;
  componentType: string;
  minQty: number;
  maxQty: number;
};

export type ConfiguratorComponent = CalcComponent & { photo: string };

// «Собираем {винительный}»: грамматический падеж не выводится из данных —
// статичная карта для существующих slug, фолбэк — имя категории (решение №4)
const ACCUSATIVE: Record<string, string> = {
  broshi: "брошь",
  kulony: "кулон",
  sergi: "серьги",
  kolca: "кольцо",
  braslety: "браслет",
  "busy-i-ozherelya": "бусы",
  komplekty: "комплект",
  "klipsy-i-manzhety": "клипсы",
  "amulety-i-podveski": "амулет",
};

const SQ_CLASSES = ["sq--mustard", "sq--rust", "sq--olive"];

// tag-строка signboard: для Кулонов — копия макета; прочие — имена типов
// комплектующих из справочника + хвост про коллаж (решение руководителя 2026-08-25)
const KULONY_TAG =
  "камень · подвески · шнур · застёжка — коллаж соберётся сам, вы можете двигать детали";

export default function ConfiguratorClient({
  category,
  slots,
  slotTypes,
  typeNames,
  components,
  finance,
  currencyCode,
}: {
  category: CalcCategory & { id: number; slug: string };
  slots: ConfiguratorSlot[];
  slotTypes: string[];
  typeNames: { code: string; name: string }[];
  components: ConfiguratorComponent[];
  finance: FinanceSettings;
  currencyCode: string;
}) {
  const { currency } = useCurrency(finance, currencyCode);

  const [selections, setSelections] = useState<Record<number, number>>({});
  const [panel, setPanel] = useState<"canvas" | "slots">("canvas");
  const [openTypes, setOpenTypes] = useState<Set<string>>(() => new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [collageDataUrl, setCollageDataUrl] = useState<string | null>(null);

  const componentsById = useMemo(
    () =>
      new Map<number, ConfiguratorComponent>(
        components.map((c) => [c.id, c]),
      ),
    [components],
  );

  // Склеенные группы слотов одного типа (решение №5): одна корзина на тип
  const groups = useMemo(
    () =>
      slotTypes.map((type) => {
        const groupSlots = slots.filter((s) => s.componentType === type);
        return {
          type,
          name: groupSlots.map((s) => s.name).join(" + "),
          slots: groupSlots,
          min: groupSlots.reduce((s, x) => s + x.minQty, 0),
          max: groupSlots.reduce((s, x) => s + x.maxQty, 0),
          comps: components.filter((c) => c.componentType === type),
        };
      }),
    [slotTypes, slots, components],
  );

  const selectionList: Selection[] = useMemo(
    () =>
      Object.entries(selections)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ componentId: Number(id), qty })),
    [selections],
  );

  const price = calcConfigPrice(category, selectionList, componentsById, currency, finance);
  const term = calcConfigDays(category, selectionList, componentsById);

  const requiredMissing = groups.some((g) => g.min > 0 && !g.comps.some((c) => (selections[c.id] ?? 0) > 0));

  const setQty = (componentId: number, qty: number) => {
    setSelections((prev) => ({ ...prev, [componentId]: Math.max(0, qty) }));
  };
  const changeQty = (componentId: number, delta: number, typeMax: number, type: string) => {
    // Занятость считаем только внутри своей группы типов: слоты разных типов независимы
    const used = Object.entries(selections).reduce((sum, [id, qty]) => {
      const comp = componentsById.get(Number(id));
      return sum + (comp && comp.componentType === type && comp.id !== componentId ? qty : 0);
    }, 0);
    const current = selections[componentId] ?? 0;
    const next = Math.min(typeMax - used, Math.max(0, current + delta));
    if (next === current) return;
    setQty(componentId, next);
  };

  const toggleType = (type: string) => {
    setOpenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const accusative = ACCUSATIVE[category.slug] ?? category.name;
  const estLine = `${slots.length} ${plural(slots.length, ["слот", "слота", "слотов"])}: ${slots.map((s) => s.name).join(", ")}`;
  const tagLine =
    category.slug === "kulony"
      ? KULONY_TAG
      : `${typeNames.map((t) => t.name.toLowerCase()).join(", ")} — коллаж соберётся сам, вы можете двигать детали`;

  const selectedSummary = selectionList
    .map((s) => {
      const c = componentsById.get(s.componentId);
      return c ? (s.qty > 1 ? `${c.name} ×${s.qty}` : c.name) : "";
    })
    .filter(Boolean)
    .join(" + ");

  return (
    <>
      <Crumbs
        items={[
          { label: "Главная", href: "/" },
          { label: "Конфигуратор", href: "/configurator" },
          { label: category.name },
        ]}
      />

      <div className="signboard signboard--small">
        <p className="est">✹ {category.slug} · {estLine} ✹</p>
        <h1>Собираем {accusative}</h1>
        <p className="tagline">{tagLine}</p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <div className="conf-tabs">
          <span
            className={panel === "canvas" ? "filter is-active" : "filter"}
            onClick={() => setPanel("canvas")}
          >
            Коллаж
          </span>
          <span
            className={panel === "slots" ? "filter is-active" : "filter"}
            onClick={() => setPanel("slots")}
          >
            Слоты и цена
          </span>
        </div>

        <div className="conf-grid">
          <div className={panel === "canvas" ? "conf-panel--canvas is-active" : "conf-panel--canvas"}>
            <CollageCanvas
              selections={selectionList}
              componentsById={componentsById}
              onRemove={(componentId) =>
                setSelections((prev) => ({
                  ...prev,
                  [componentId]: Math.max(0, (prev[componentId] ?? 0) - 1),
                }))
              }
              onDataUrl={setCollageDataUrl}
            />
          </div>

          <div className={panel === "slots" ? "conf-panel--slots is-active" : "conf-panel--slots"}>
            <div className="accordion">
              {groups.map((group, gi) => {
                const isOpen = openTypes.has(group.type);
                return (
                  <div key={group.type} className={isOpen ? "slot is-open" : "slot"}>
                    <div className="slot-head" onClick={() => toggleType(group.type)}>
                      <span className={`sq ${SQ_CLASSES[gi % SQ_CLASSES.length]}`}>{gi + 1}</span>
                      <b>{group.name}</b>
                      <small>
                        min {group.min} · max {group.max}
                      </small>
                      <span className="caret">▼</span>
                    </div>
                    <div className="slot-body">
                      <div className="comps">
                        {group.comps.map((comp) => {
                          const available = comp.stockQty > 0 || comp.isOrderable;
                          const qty = selections[comp.id] ?? 0;
                          const usedInGroup = selectionList.reduce((sum, s) => {
                            const c = componentsById.get(s.componentId);
                            return sum + (c?.componentType === group.type ? s.qty : 0);
                          }, 0);
                          const plusDisabled =
                            !available || qty <= 0
                              ? qty >= group.max || usedInGroup >= group.max
                              : usedInGroup >= group.max;
                          return (
                            <div
                              key={comp.id}
                              className={
                                qty > 0 ? "comp-card is-selected" : available ? "comp-card" : "comp-card is-disabled"
                              }
                            >
                              <div className="thumb">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={comp.photo} alt={comp.name} />
                              </div>
                              <div className="info">
                                <b>{comp.name}</b>
                                <small>
                                  {formatPrice(
                                    { priceMinor: comp.priceMinor, priceCurrency: comp.priceCurrency },
                                    currency,
                                    finance,
                                  )}{" "}
                                  + обработка{" "}
                                  {formatPrice(
                                    {
                                      priceMinor: comp.processingPriceMinor,
                                      priceCurrency: comp.processingPriceCurrency,
                                    },
                                    currency,
                                    finance,
                                  )}
                                  {" · "}
                                  {available
                                    ? comp.stockQty > 0
                                      ? "в наличии"
                                      : `под заказ · ${comp.deliveryDays} дн`
                                    : `${comp.stockQty} шт на складе`}
                                </small>
                              </div>
                              <div className="side">
                                {qty > 0 ? (
                                  <div className="stepper">
                                    <button onClick={() => changeQty(comp.id, -1, group.max, group.type)}>−</button>
                                    <span className="val">{qty}</span>
                                    <button
                                      disabled={plusDisabled}
                                      onClick={() => changeQty(comp.id, 1, group.max, group.type)}
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : available ? (
                                  <div className="stepper">
                                    <button disabled>−</button>
                                    <span className="val">0</span>
                                    <button
                                      disabled={usedInGroup >= group.max}
                                      onClick={() => changeQty(comp.id, 1, group.max, group.type)}
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <span className={`tag ${comp.isOrderable ? "tag--order" : "tag--stock"}`}>
                                    {comp.isOrderable ? `под заказ · ${comp.deliveryDays} дн` : "в наличии"}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="calc">
          <div className="row--big row">
            <div className="k">Итого · цена</div>
            <div className="v">{formatPrice(price.total, currency, finance)}</div>
            <div className="breakdown">
              Работа: {formatPrice(price.work, currency, finance)} + Компоненты:{" "}
              {formatPrice(price.componentsSum, currency, finance)}
            </div>
          </div>
          <div className="row">
            <div className="k">Срок изготовления</div>
            <div className="v--sm">
              {term.days} {plural(term.days, ["день", "дня", "дней"])}
            </div>
            <div className="breakdown">
              База {category.baseWorkDays} дн + обработка {term.processingDays} дн + доставка{" "}
              {term.deliveryDays} дн
            </div>
          </div>
          <button
            className="btn btn--primary"
            disabled={requiredMissing}
            title={requiredMissing ? "Выберите компоненты" : undefined}
            onClick={() => {
              setModalOpen(true);
            }}
          >
            Оформить заявку
          </button>
        </div>
      </section>

      <OrderRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        category={category}
        accusative={accusative}
        selections={selectionList}
        componentsById={componentsById}
        total={price.total}
        days={term.days}
        collageDataUrl={collageDataUrl}
        summary={selectedSummary}
        finance={finance}
        currencyCode={currencyCode}
      />

      <div className="zigzag"></div>
    </>
  );
}
