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

export default function DailyGame({ initialDate }: { initialDate?: string }) {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [date, setDate] = useState(() => {
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) return initialDate;
    return utcToday();
  });

  const [payload, setPayload] = useState<DailyPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<AnswerPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
      setDate(initialDate);
      return;
    }
    setDate(utcToday());
  }, [initialDate]);

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
          setPayload(data as DailyPayload);
          setIndex(0);
          setScore(0);
          setAnswered(false);
          setLastAnswer(null);
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

  const q = payload?.questions[index];
  const done = Boolean(payload && index >= payload.questions.length);

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
        setLastAnswer(data as AnswerPayload);
        setAnswered(true);
        if (data.correct) setScore((s) => s + 1);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Submit failed");
      } finally {
        setSubmitting(false);
      }
    },
    [answered, index, payload, submitting],
  );

  const next = useCallback(() => {
    if (!payload) return;
    setAnswered(false);
    setLastAnswer(null);
    setIndex((i) => i + 1);
  }, [payload]);

  const openDatePicker = useCallback(() => {
    const input = dateInputRef.current;
    if (!input) return;
    input.showPicker?.();
    input.click();
  }, []);

  const onPickDate = useCallback(
    (nextDate: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return;
      const today = utcToday();
      if (nextDate > today) return;
      if (nextDate === date) return;
      setDate(nextDate);
      router.push(`/?date=${encodeURIComponent(nextDate)}`);
    },
    [date, router],
  );

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

  if (!payload || done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm uppercase tracking-widest text-[var(--muted)]">Daily puzzle</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Finished</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          Score:{" "}
          <span className="font-mono text-[var(--text)]">
            {score}/{payload?.questions.length ?? 10}
          </span>
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">Date (UTC): {payload?.date}</p>
      </div>
    );
  }

  if (!q) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
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
                {index + 1}/{payload.questions.length}
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
            aria-label="Pick a previous game date"
            title="Pick a previous game date"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            max={utcToday()}
            onChange={(e) => onPickDate(e.target.value)}
            className="sr-only"
            aria-label="Select daily game date"
          />
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <MovieCard
          movie={q.left}
          disabled={answered || submitting}
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
          disabled={answered || submitting}
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

      {answered && lastAnswer && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <p
            className={`text-lg font-medium ${
              lastAnswer.correct ? "text-[var(--correct)]" : "text-[var(--wrong)]"
            }`}
          >
            {lastAnswer.correct ? "Correct" : "Wrong"}
          </p>
          <button
            type="button"
            onClick={() => {
              if (index + 1 >= payload.questions.length) {
                setIndex(payload.questions.length);
              } else {
                next();
              }
            }}
            className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-dim)]"
          >
            {index + 1 >= payload.questions.length ? "See results" : "Next question"}
          </button>
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
      className={`group flex flex-col overflow-hidden rounded-xl border bg-[var(--surface)] text-left transition ${border} ${
        disabled && !rating ? "cursor-default" : "cursor-pointer hover:border-[var(--accent)]"
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
