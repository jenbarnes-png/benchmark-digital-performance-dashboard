"use client";

/**
 * Opens the browser's own print dialogue, where "Save as PDF" is a destination
 * on every major browser and OS.
 *
 * Generating the PDF server-side was considered and rejected: it would mean a
 * headless-browser dependency, which is slow and awkward inside a Vercel
 * function, for output no better than the browser already produces. This way
 * the export always matches the filters on screen, with nothing to maintain.
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-md border border-black/15 px-3 py-2 text-sm font-medium text-black/70 transition-colors hover:border-black/30 hover:bg-black/5 hover:text-black dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
      </svg>
      Export to PDF
    </button>
  );
}
