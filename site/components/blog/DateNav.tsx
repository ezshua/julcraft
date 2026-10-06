import { getDictionary, getLocale } from "@/lib/i18n";

type Props = {
  /** Годы с опубликованными записями, свежие сверху. */
  years: number[];
  /** Месяцы выбранного года с записями, свежие сверху. */
  months: number[];
  selectedYear?: number;
  selectedMonth?: number;
  /** Ссылка пункта навигации: год и месяц (undefined — сброс фильтра). */
  linkTo: (year?: number, month?: number) => string;
};

// Копия блока «По датам» из mockup/blog.html: div.date-nav.
// Месяцы показываются для выбранного года — как в макете.
export default async function DateNav({
  years,
  months,
  selectedYear,
  selectedMonth,
  linkTo,
}: Props) {
  const locale = await getLocale();
  const blog = getDictionary(locale).blog;

  return (
    <div className="board board--paper mb-30">
      <div className="b-head">
        <h3>{blog.navTitle}</h3>
      </div>
      <div className="b-body">
        <div className="date-nav">
          <div className="dn-block">
            <span className="dn-label">{blog.navYear}</span>
            <div className="dn-row">
              {years.map((year) => (
                <a
                  key={year}
                  className={year === selectedYear ? "dn-item is-active" : "dn-item"}
                  href={linkTo(year, undefined)}
                >
                  {year}
                </a>
              ))}
            </div>
          </div>
          {selectedYear !== undefined && months.length > 0 && (
            <div className="dn-block">
              <span className="dn-label">{blog.navMonth}</span>
              <div className="dn-row">
                {months.map((month) => (
                  <a
                    key={month}
                    className={month === selectedMonth ? "dn-item is-active" : "dn-item"}
                    href={linkTo(selectedYear, month)}
                  >
                    {blog.months[month - 1]}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
