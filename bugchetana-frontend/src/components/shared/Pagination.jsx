import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Reusable client-side pagination control.
 *
 * Props:
 *   currentPage   — 1-indexed active page (controlled).
 *   totalItems    — length of the full array being paginated.
 *   pageSize      — items per page.
 *   onPageChange  — receives the next 1-indexed page number.
 *
 * Behaviour:
 *   - Hides entirely when totalItems <= pageSize.
 *   - Clamps an out-of-range currentPage back to the last valid page.
 *   - Collapses to a compact "Previous / Page X of Y / Next" control on
 *     narrow viewports via a container-query-style breakpoint.
 */
export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}) {
  const [isCompact, setIsCompact] = useState(false);

  // Track narrow viewports so the full page-number row collapses to a
  // compact "Prev / Page X of Y / Next" control when it would overflow.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 640px)");
    const handle = (e) => setIsCompact(e.matches);
    handle(mq);
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  // Hide entirely when pagination is unnecessary.
  if (totalItems <= pageSize) return null;

  // If the controlled page is out of range (e.g. data shrank), push it back
  // to the last valid page.

  const goTo = (page) => {
    const next = Math.min(Math.max(1, page), totalPages);
    if (next !== currentPage) onPageChange(next);
  };

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  // Build the page-number row, with ellipses when the window is wide but
  // the page count is large. We always show 1 and totalPages plus a
  // 1-window around the current page.
  const pageNumbers = [];
  for (let p = 1; p <= totalPages; p += 1) {
    if (
      p === 1 ||
      p === totalPages ||
      (p >= currentPage - 1 && p <= currentPage + 1)
    ) {
      pageNumbers.push(p);
    } else if (
      p === currentPage - 2 ||
      p === currentPage + 2
    ) {
      pageNumbers.push("ellipsis");
    }
  }

  const baseButton =
    "inline-flex items-center justify-center h-8 px-3 rounded-lg text-xs font-medium border transition-colors";
  const enabledButton =
    "bg-white border-slate-200 text-slate-700 hover:bg-slate-50";
  const disabledButton =
    "bg-white border-slate-100 text-slate-300 cursor-not-allowed";
  const activePageButton =
    "bg-blue-600 border-blue-600 text-white";

  return (
    <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/50">
      <p className="text-xs text-slate-400 hidden sm:block">
        Showing{" "}
        <span className="font-medium text-slate-600">
          {(currentPage - 1) * pageSize + 1}–
          {Math.min(currentPage * pageSize, totalItems)}
        </span>{" "}
        of <span className="font-medium text-slate-600">{totalItems}</span>
      </p>

      <div className="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          onClick={() => goTo(currentPage - 1)}
          disabled={isFirst}
          aria-label="Previous page"
          className={`${baseButton} ${isFirst ? disabledButton : enabledButton}`}
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:mr-1" />
          <span className={isCompact ? "" : "hidden sm:inline"}>Previous</span>
        </button>

        {isCompact ? (
          <span className="text-xs text-slate-600 px-2">
            Page <span className="font-semibold text-slate-800">{currentPage}</span>{" "}
            of <span className="font-semibold text-slate-800">{totalPages}</span>
          </span>
        ) : (
          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((p, i) =>
              p === "ellipsis" ? (
                <span
                  key={`ellipsis-${i}`}
                  className="h-8 px-2 inline-flex items-center text-xs text-slate-400"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => goTo(p)}
                  aria-current={p === currentPage ? "page" : undefined}
                  className={`${baseButton} h-8 w-8 px-0 ${p === currentPage ? activePageButton : enabledButton
                    }`}
                >
                  {p}
                </button>
              )
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => goTo(currentPage + 1)}
          disabled={isLast}
          aria-label="Next page"
          className={`${baseButton} ${isLast ? disabledButton : enabledButton}`}
        >
          <span className={isCompact ? "" : "hidden sm:inline"}>Next</span>
          <ChevronRight className="h-3.5 w-3.5 sm:ml-1" />
        </button>
      </div>
    </div>
  );
}
