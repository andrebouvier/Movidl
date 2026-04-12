"use client";

import { useCallback, useEffect, useId, useState } from "react";

export default function ContactButton() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const contactEmail =
    typeof process.env.NEXT_PUBLIC_CONTACT_EMAIL === "string"
      ? process.env.NEXT_PUBLIC_CONTACT_EMAIL.trim()
      : "";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)] shadow-lg transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        Contact
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="text-lg font-semibold text-[var(--text)]">
              Contact
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--muted)]">
              <p>
                <span className="font-medium text-[var(--text)]">Movidl</span> is a daily movie quiz: each puzzle has
                several rounds where you choose which of two films has the higher IMDb rating. Scores and puzzles are
                tied to the calendar day (UTC).
              </p>
              <p>
                Ratings come from IMDb; this project is not affiliated with IMDb. Poster imagery is shown for context
                only.
              </p>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Email</p>
                {contactEmail ? (
                  <a
                    href={`mailto:${encodeURIComponent(contactEmail)}`}
                    className="mt-1 block break-all text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 transition hover:text-[var(--accent)] hover:decoration-[var(--accent)]"
                  >
                    {contactEmail}
                  </a>
                ) : (
                  <p className="mt-1 text-[var(--muted)]">
                    Set <code className="text-[var(--text)]">NEXT_PUBLIC_CONTACT_EMAIL</code> in{" "}
                    <code className="text-[var(--text)]">.env.local</code> to show your address here.
                  </p>
                )}
              </div>
              <p className="text-xs">
                For bug reports, feature ideas, or other questions, use the email above from your own mail client.
              </p>
            </div>

            <button
              type="button"
              onClick={close}
              className="mt-6 w-full rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--text)] hover:text-[var(--text)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
