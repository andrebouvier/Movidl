"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type PublicMovie = {
  imdbId: string;
  title: string;
  year: string | null;
  posterUrl: string;
};

type PublicQuestion = { left: PublicMovie; right: PublicMovie };

type DailyPayload = { date: string; questions: PublicQuestion[] };

type AnswerPayload = {
  correct: boolean;
  higherImdbId: string;
  leftImdbId: string;
  rightImdbId: string;
  leftRating: number;
  rightRating: number;
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Latest calendar day (YYYY-MM-DD) users can pick; matches UTC “today” for the daily puzzle. */
function maxSelectableDate(): string {
  return utcToday();
}

/** Briefly show correct answer + ratings before advancing (or finishing). */
const CORRECT_FEEDBACK_MS = 1250;

export default function DailyGame({ initialDate }: { initialDate?: string }) {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [date, setDate] = useState(() => {
    const max = maxSelectableDate();
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
      return initialDate > max ? max : initialDate;
    }
    return max;
  });

  const [payload, setPayload] = useState<DailyPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<AnswerPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Question index to show under the results overlay (last played or failed). */
  const [finishedQuestionIndex, setFinishedQuestionIndex] = useState<number | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const max = maxSelectableDate();
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
      if (initialDate > max) {
        setDate(max);
        router.replace(`/?date=${encodeURIComponent(max)}`);
        return;
      }
      setDate(initialDate);
      return;
    }
    setDate(max);
  }, [initialDate, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/daily?date=${encodeURIComponent(date)}`);
        const data = (await res.json()) as { error?: string } & Partial<DailyPayload>;
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load daily puzzle");
        }
        if (!data.questions?.length) {
          throw new Error("Invalid response");
        }
        if (!cancelled) {
          if (advanceTimerRef.current) {
            clearTimeout(advanceTimerRef.current);
            advanceTimerRef.current = null;
          }
          setPayload(data as DailyPayload);
          setIndex(0);
          setScore(0);
          setAnswered(false);
          setLastAnswer(null);
          setFinishedQuestionIndex(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load");
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const done = Boolean(payload && index >= payload.questions.length);
  const effectiveQIndex =
    payload && index >= payload.questions.length
      ? (finishedQuestionIndex ?? payload.questions.length - 1)
      : index;
  const q = payload?.questions[effectiveQIndex];

  const pick = useCallback(
    async (chosenImdbId: string) => {
      if (!payload || answered || submitting) return;
      setSubmitting(true);
      try {
        const res = await fetch("/api/daily/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: payload.date, questionIndex: index, chosenImdbId }),
        });
        const data = (await res.json()) as { error?: string } & Partial<AnswerPayload>;
        if (!res.ok) {
          throw new Error(data.error ?? "Could not submit answer");
        }
        const answer = data as AnswerPayload;

        if (!answer.correct) {
          setFinishedQuestionIndex(index);
          setIndex(payload.questions.length);
          return;
        }

        setLastAnswer(answer);
        setAnswered(true);
        setScore((s) => s + 1);

        const isLast = index + 1 >= payload.questions.length;
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = setTimeout(() => {
          advanceTimerRef.current = null;
          setAnswered(false);
          setLastAnswer(null);
          if (isLast) setFinishedQuestionIndex(index);
          setIndex((i) => (isLast ? payload.questions.length : i + 1));
        }, CORRECT_FEEDBACK_MS);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Submit failed");
      } finally {
        setSubmitting(false);
      }
    },
    [answered, index, payload, submitting],
  );

  const restartQuiz = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setIndex(0);
    setScore(0);
    setAnswered(false);
    setLastAnswer(null);
    setFinishedQuestionIndex(null);
  }, []);

  const openDatePicker = useCallback(() => {
    const input = dateInputRef.current;
    if (!input) return;
    input.showPicker?.();
    input.click();
  }, []);

  const onPickDate = useCallback(
    (nextDate: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return;
      const max = maxSelectableDate();
      if (nextDate > max) return;
      if (nextDate === date) return;
      setDate(nextDate);
      router.push(`/?date=${encodeURIComponent(nextDate)}`);
    },
    [date, router],
  );

  const maxSelectable = maxSelectableDate();
  const safeDate = date > maxSelectable ? maxSelectable : date;

  useEffect(() => {
    const max = maxSelectableDate();
    if (date > max) {
      setDate(max);
      router.replace(`/?date=${encodeURIComponent(max)}`);
    }
  }, [date, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--muted)]">
        Loading today&apos;s puzzle…
      </div>
    );
  }

  if (loadError && !payload) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold text-[var(--text)]">Can&apos;t load puzzle</h1>
        <p className="mt-3 text-[var(--muted)]">{loadError}</p>
        <p className="mt-6 text-sm text-[var(--muted)]">
          First time setup: copy <code className="text-[var(--text)]">.env.example</code> to{" "}
          <code className="text-[var(--text)]">.env.local</code>, add keys, run{" "}
          <code className="text-[var(--text)]">npm run db:push</code>, then call{" "}
          <code className="text-[var(--text)]">GET /api/cron/warm-pool</code> once to fill the movie pool.
        </p>
      </div>
    );
  }

  if (!payload) {
    return null;
  }

  if (!q) {
    return null;
  }

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Movidl</p>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Which has the higher IMDb rating?</h1>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-right text-sm text-[var(--muted)]">
            <div>
              Question{" "}
              <span className="font-mono text-[var(--text)]">
                {effectiveQIndex + 1}/{payload.questions.length}
              </span>
            </div>
            <div>
              Score{" "}
              <span className="font-mono text-[var(--text)]">
                {score}/{payload.questions.length}
              </span>
            </div>
            <div className="text-xs">UTC date: {payload.date}</div>
          </div>
          <button
            type="button"
            onClick={openDatePicker}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
            aria-label="Pick a previous game date"
            title="Pick a previous game date"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
          </button>
          <input
            key={`${safeDate}-${maxSelectable}`}
            ref={dateInputRef}
            type="date"
            defaultValue={safeDate}
            min="1970-01-01"
            max={maxSelectable}
            onBlur={(e) => {
              const el = e.currentTarget;
              const max = maxSelectableDate();
              const baseline = date > max ? max : date;
              const v = el.value;
              if (!v) {
                el.value = baseline;
                return;
              }
              if (v > max) {
                el.value = baseline;
                return;
              }
              if (v === baseline) return;
              onPickDate(v);
            }}
            className="sr-only"
            aria-label="Select daily game date"
          />
        </div>
      </header>

      <div
        className={`grid gap-6 md:grid-cols-2 ${done ? "pointer-events-none opacity-50" : ""}`}
        aria-hidden={done}
      >
        <MovieCard
          movie={q.left}
          disabled={answered || submitting || done}
          onPick={() => pick(q.left.imdbId)}
          highlight={
            answered && lastAnswer
              ? lastAnswer.higherImdbId === q.left.imdbId
                ? "higher"
                : "lower"
              : null
          }
          rating={answered && lastAnswer ? lastAnswer.leftRating : null}
        />
        <MovieCard
          movie={q.right}
          disabled={answered || submitting || done}
          onPick={() => pick(q.right.imdbId)}
          highlight={
            answered && lastAnswer
              ? lastAnswer.higherImdbId === q.right.imdbId
                ? "higher"
                : "lower"
              : null
          }
          rating={answered && lastAnswer ? lastAnswer.rightRating : null}
        />
      </div>

      {answered && lastAnswer && lastAnswer.correct && !done && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-lg font-medium text-[var(--correct)]">Correct</p>
        </div>
      )}

      {done && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-results-title"
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-2xl"
          >
            <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Daily puzzle</p>
            <h2 id="daily-results-title" className="mt-2 text-2xl font-semibold text-[var(--text)]">
              Finished
            </h2>
            <p className="mt-4 text-lg text-[var(--muted)]">
              Score{" "}
              <span className="font-mono text-[var(--text)]">
                {score}/{payload.questions.length}
              </span>
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">Date (UTC): {payload.date}</p>
            <button
              type="button"
              onClick={restartQuiz}
              className="mt-8 w-full cursor-pointer rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-dim)]"
            >
              Restart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MovieCard({
  movie,
  onPick,
  disabled,
  highlight,
  rating,
}: {
  movie: PublicMovie;
  onPick: () => void;
  disabled: boolean;
  highlight: "higher" | "lower" | null;
  rating: number | null;
}) {
  const border =
    highlight === "higher"
      ? "border-[var(--correct)] ring-1 ring-[var(--correct)]"
      : highlight === "lower"
        ? "border-[var(--wrong)] opacity-80"
        : "border-[var(--border)]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-[var(--surface)] text-left transition ${border} ${
        disabled && !rating ? "" : "hover:border-[var(--accent)]"
      }`}
    >
      <div className="relative aspect-[2/3] w-full bg-black/40">
        <Image src={movie.posterUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h2 className="text-lg font-semibold leading-snug text-[var(--text)]">{movie.title}</h2>
        {movie.year && <p className="text-sm text-[var(--muted)]">{movie.year}</p>}
        {rating !== null && (
          <p className="mt-2 font-mono text-sm text-[var(--muted)]">
            IMDb rating: <span className="text-[var(--text)]">{rating.toFixed(1)}</span>
          </p>
        )}
      </div>
    </button>
  );
}
