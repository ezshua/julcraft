import type { HoursEntry } from "@/lib/settings";
import { getDictionary, getLocale } from "@/lib/i18n";

// Копия div.hours-board из макета: заголовок «Часы работы» + строки .day
export default async function HoursBoard({
  hours,
  className,
  style,
}: {
  hours: HoursEntry[];
  className?: string;
  style?: React.CSSProperties;
}) {
  const dict = getDictionary(await getLocale());
  return (
    <div
      className={className ? `hours-board ${className}` : "hours-board"}
      style={style}
    >
      <h3>{dict.layout.hoursTitle}</h3>
      {hours.map((entry, i) => (
        <div className="day" key={i}>
          <span>{entry.day}</span>
          {entry.closed ? (
            <span className="closed">{entry.value}</span>
          ) : (
            <span>{entry.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}
