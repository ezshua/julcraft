import type { HoursEntry } from "@/lib/settings";
import { L } from "@/lib/localize";
import type { Locale } from "@/lib/i18n";
import { getDictionary, getLocale } from "@/lib/i18n";

// Копия div.hours-board из макета: заголовок «Часы работы» + строки .day
export default async function HoursBoard({
  hours,
  className,
  style,
  locale,
}: {
  hours: HoursEntry[];
  className?: string;
  style?: React.CSSProperties;
  locale?: Locale;
}) {
  const effLocale = locale ?? (await getLocale());
  const dict = getDictionary(effLocale);
  return (
    <div
      className={className ? `hours-board ${className}` : "hours-board"}
      style={style}
    >
      <h3>{dict.layout.hoursTitle}</h3>
      {hours.map((entry, i) => (
        <div className="day" key={i}>
          <span>{L(entry.day, effLocale)}</span>
          {entry.closed ? (
            <span className="closed">{L(entry.value, effLocale)}</span>
          ) : (
            <span>{L(entry.value, effLocale)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
