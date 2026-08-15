// Иконки категорий — копия 1:1 из mockup/home.html (viewBox, фигуры, stroke)
const ICONS: Record<string, React.ReactNode> = {
  broshi: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22242a"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="10" r="6" />
      <circle cx="12" cy="10" r="2" />
      <path d="M12 16v5M8 19h8" />
    </svg>
  ),
  kulony: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22242a"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="9" r="5" />
      <path d="M12 14v7M8 17h8" />
    </svg>
  ),
  sergi: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22242a"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M7 3v7a5 5 0 0 0 10 0V3M5 21h14M12 15v6" />
    </svg>
  ),
  kolca: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22242a"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="6" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
  braslety: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22242a"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 17a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3M4 17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10" />
    </svg>
  ),
  "busy-i-ozherelya": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22242a"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 12h18M12 3v18M6 6h12M6 18h12" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  komplekty: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22242a"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="9" r="3" />
      <circle cx="7" cy="18" r="3" />
      <circle cx="17" cy="18" r="3" />
      <path d="M12 12v3M7 15v0M17 15v0" />
    </svg>
  ),
  "klipsy-i-manzhety": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22242a"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M8 3v7a4 4 0 0 0 8 0V3M10 21h4M12 14v7" />
    </svg>
  ),
  "vintazhnyj-remont": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22242a"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.9 2.9-3-3z" />
    </svg>
  ),
  "amulety-i-podveski": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22242a"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" />
    </svg>
  ),
};

export default function CategoryIcon({ slug }: { slug: string }) {
  return <div className="cat-icon">{ICONS[slug] ?? null}</div>;
}
