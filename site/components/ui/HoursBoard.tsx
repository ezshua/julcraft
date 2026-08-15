import type { HoursEntry } from "@/lib/settings";

// Копия div.hours-board из макета: заголовок «Часы работы» + строки .day
export default function HoursBoard({
  hours,
  className,
  style,
}: {
  hours: HoursEntry[];
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className ? `hours-board ${className}` : "hours-board"}
      style={style}
    >
      <h3>Часы работы</h3>
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
