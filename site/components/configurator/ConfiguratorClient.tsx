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
import { formatPrice } from "@/lib/format";
import type { Dictionary } from "@/lib/dictionaries/ru";
import type { FinanceSettings } from "@/lib/currency";
import type { Locale } from "@/lib/i18n";
import { t, plural } from "./i18n-client";
import { L } from "@/lib/localize";

const CollageCanvas = dynamic(() => import("./CollageCanvas"), { ssr: false });

export type ConfiguratorSlot = {
  id: number;
  name: string;
  componentType: string;
  minQty: number;
  maxQty: number;
};

export type ConfiguratorComponent = CalcComponent & { photo: string };

const SQ_CLASSES = ["sq--mustard", "sq--rust", "sq--olive"];

export default function ConfiguratorClient({
  category,
  slots,
  slotTypes,
  typeNames,
  components,
  finance,
  currencyCode,
  dict,
  locale,
  initialBackground,
}: {
  category: CalcCategory & { id: number; slug: string };
  slots: ConfiguratorSlot[];
  slotTypes: string[];
  typeNames: { code: string; name: string }[];
  components: ConfiguratorComponent[];
  finance: FinanceSettings;
  currencyCode: string;
  dict: Dictionary["configurator"];
  locale: Locale;
  initialBackground: string | null;
}) {
  const conf = dict;
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

  // «Собираем {винительный}»: грамматический падеж не выводится из данных —
  // статичная карта в словаре для существующих slug, фолбэк — имя категории
  const accusative = conf.accusative[category.slug as keyof typeof conf.accusative] ?? category.name;
  const estLine = t(conf.slotDesc, {
    n: slots.length,
    word: plural(slots.length, conf.slotWord, locale),
    names: slots.map((s) => s.name).join(", "),
  });
  const tagLine =
    category.slug === "kulony"
      ? conf.kulonyTag
      : t(conf.taglineCustom, {
          names: typeNames.map((x) => L(x.name, locale).toLowerCase()).join(", "),
        });

  const selectedSummary = selectionList
    .map((s) => {
      const c = componentsById.get(s.componentId);
      return c ? (s.qty > 1 ? `${L(c.name, locale)} ×${s.qty}` : L(c.name, locale)) : "";
    })
    .filter(Boolean)
    .join(" + ");

  return (
    <>
      <Crumbs
        items={[
          { label: conf.crumbsHome, href: "/" },
          { label: conf.crumbsConfigurator, href: "/configurator" },
          { label: L(category.name, locale) },
        ]}
      />

      <div className="signboard signboard--small">
        <p className="est">✹ {category.slug} · {estLine} ✹</p>
        <h1>{t(conf.assembling, { name: accusative })}</h1>
        <p className="tagline">{tagLine}</p>
      </div>
      <div className="zigzag"></div>

      <section className="sect">
        <div className="conf-tabs">
          <span
            className={panel === "canvas" ? "filter is-active" : "filter"}
            onClick={() => setPanel("canvas")}
          >
            {conf.tabCollage}
          </span>
          <span
            className={panel === "slots" ? "filter is-active" : "filter"}
            onClick={() => setPanel("slots")}
          >
            {conf.tabSlots}
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
              initialBackground={initialBackground}
              dict={conf}
              locale={locale}
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
                                <img src={comp.photo} alt={L(comp.name, locale)} />
                              </div>
                              <div className="info">
                                <b>{L(comp.name, locale)}</b>
                                <small>
                                  {t(conf.pricePlusProcessing, {
                                    price: formatPrice(
                                      { priceMinor: comp.priceMinor, priceCurrency: comp.priceCurrency },
                                      currency,
                                      finance,
                                    ),
                                    processing: formatPrice(
                                      {
                                        priceMinor: comp.processingPriceMinor,
                                        priceCurrency: comp.processingPriceCurrency,
                                      },
                                      currency,
                                      finance,
                                    ),
                                  })}
                                  {" · "}
                                  {available
                                    ? comp.stockQty > 0
                                      ? conf.inStock
                                      : t(conf.madeToOrder, { n: comp.deliveryDays ?? 0 })
                                    : t(conf.stockQty, { n: comp.stockQty })}
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
                                    {comp.isOrderable ? t(conf.madeToOrder, { n: comp.deliveryDays ?? 0 }) : conf.inStock}
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
            <div className="k">{conf.totalPrice}</div>
            <div className="v">{formatPrice(price.total, currency, finance)}</div>
            <div className="breakdown">
              {t(conf.workComponents, {
                work: formatPrice(price.work, currency, finance),
                components: formatPrice(price.componentsSum, currency, finance),
              })}
            </div>
          </div>
          <div className="row">
            <div className="k">{conf.termTitle}</div>
            <div className="v--sm">
              {term.days} {plural(term.days, conf.days, locale)}
            </div>
            <div className="breakdown">
              {t(conf.termBreakdown, {
                base: category.baseWorkDays,
                processing: term.processingDays,
                delivery: term.deliveryDays,
              })}
            </div>
          </div>
          <button
            className="btn btn--primary"
            disabled={requiredMissing}
            title={requiredMissing ? conf.chooseComponents : undefined}
            onClick={() => {
              setModalOpen(true);
            }}
          >
            {conf.submit}
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
        dict={conf}
        locale={locale}
      />

      <div className="zigzag"></div>
    </>
  );
}
