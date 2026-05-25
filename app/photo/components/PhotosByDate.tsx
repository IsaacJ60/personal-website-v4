"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Layers3 } from "lucide-react";

type SmallPhoto = {
  id: string;
  src: string;
  title?: string;
  alt?: string;
  href?: string;
  date?: string;
};

type Props = {
  dateMap: Record<string, SmallPhoto[]>;
};

function monthName(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

export default function PhotosByDate({ dateMap }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"comfy" | "compact">("comfy");

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

  const leadingEmpty = (y: number, m: number) => new Date(y, m, 1).getDay();

  const monthGrid = useMemo(() => {
    const days = daysInMonth(viewYear, viewMonth);
    const lead = leadingEmpty(viewYear, viewMonth);
    const cells: (number | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };

  const handleNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const selectedPhotos = selectedDate ? dateMap[selectedDate] ?? [] : [];

  // Get background color class based on photo count (heatmap)
  const getCountColor = (cnt: number): string => {
    if (cnt === 0) return 'bg-white dark:bg-neutral-900/30';
    if (cnt === 1) return 'bg-green-100 dark:bg-green-950';
    if (cnt <= 3) return 'bg-green-200 dark:bg-green-900';
    if (cnt <= 5) return 'bg-green-300 dark:bg-green-800';
    return 'bg-green-400 dark:bg-green-700';
  };

  // Auto-select the most recent date that has photos on mount
  useEffect(() => {
    if (selectedDate) return;
    const keys = Object.keys(dateMap);
    if (keys.length === 0) return;
    // keys are ISO-like YYYY-MM-DD so lexicographic sort works
    const latest = keys.sort().reverse()[0];
    setSelectedDate(latest);
    // also navigate calendar to that month
    const y = Number(latest.slice(0, 4));
    const m = Number(latest.slice(5, 7)) - 1;
    setViewYear(y);
    setViewMonth(m);
  }, [dateMap, selectedDate]);

  const formatDateDisplay = (dateKey: string) => {
    try {
      const d = new Date(dateKey + 'T00:00:00');
      return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateKey;
    }
  };

  return (
    <section className="mt-12 w-full">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Calendar</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Browse by Date</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Explore photos chronologically. Click a date to view all images from that day.
        </p>
      </div>
      <div className="grid w-full grid-cols-1 gap-6 md:h-96 md:grid-cols-3">
        <div className="md:col-span-1 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl p-4 bg-neutral-50 dark:bg-neutral-900/20">
          <div className="flex items-center justify-between mb-2">
            <button onClick={handlePrev} className="px-2 py-0 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-900/50">‹</button>
            <div className="text-sm font-medium">{monthName(viewYear, viewMonth)}</div>
            <button onClick={handleNext} className="px-2 py-0 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-900/50">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs text-center text-muted-foreground">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={`${d}-${i}`} className="py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 mt-2">
            {monthGrid.map((cell, idx) => {
              if (cell === null) return <div key={"e-" + idx} />;
              const yyyy = viewYear;
              const mm = String(viewMonth + 1).padStart(2, '0');
              const dd = String(cell).padStart(2, '0');
              const dateKey = `${yyyy}-${mm}-${dd}`;
              const count = dateMap[dateKey]?.length ?? 0;
              const isSelected = selectedDate === dateKey;

              const bgClass = getCountColor(count);
              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  aria-pressed={isSelected}
                  className={`group relative overflow-hidden flex cursor-pointer flex-col items-center justify-center h-10 text-xs rounded-md border border-neutral-200/20 dark:border-neutral-700/30 ${bgClass}`}
                >
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[-60%] w-[70%] bg-gradient-to-r from-transparent via-white/45 to-transparent skew-x-[-20deg] opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:translate-x-[320%] dark:via-white/20" />
                  <div className="text-sm font-medium leading-none">{cell}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-2 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl p-4 flex flex-col h-full overflow-hidden">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{selectedDate ? formatDateDisplay(selectedDate) : 'Select a date to view photos'}</div>
              {selectedDate && (
                <div className="text-xs text-muted-foreground mt-1">{selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''}</div>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-full border border-neutral-200/40 bg-white/70 p-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm dark:border-neutral-700/40 dark:bg-neutral-900/50">
              {(["comfy", "compact"] as const).map((mode) => {
                const active = viewMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`rounded-full px-2.5 py-1 transition-colors ${active ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"}`}
                    aria-pressed={active}
                  >
                    {mode === "comfy" ? "Comfy" : "Compact"}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 photos-date-scroll">
            {selectedPhotos.length === 0 && <div className="text-muted-foreground italic">No photos for this date.</div>}
            {viewMode === "compact" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {selectedPhotos.map((p) => {
                  const isBundlePhoto = p.href?.includes("/bundles/") ?? false;
                  return (
                    <Link
                      key={p.id}
                      href={p.href ?? `/photo/photos/${p.id}`}
                      className="block rounded-xl overflow-hidden flex-shrink-0 bg-white shadow-sm dark:bg-neutral-950"
                    >
                      <div className="relative aspect-[4/3] bg-neutral-100">
                        <Image src={p.src} alt={p.alt ?? ''} fill className="object-cover" />
                        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 to-transparent" />
                        <div className="absolute left-3 top-3 right-3">
                          <div className="inline-flex max-w-full items-start gap-1.5 rounded-md bg-black/35 px-2 py-1 text-sm font-medium text-white backdrop-blur-[1px]">
                            {isBundlePhoto && <Layers3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/90" />}
                            <span className="line-clamp-2">{p.title ?? 'Untitled photo'}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedPhotos.map((p) => {
                  const isBundlePhoto = p.href?.includes("/bundles/") ?? false;
                  return (
                    <Link key={p.id} href={p.href ?? `/photo/photos/${p.id}`} className="block rounded-xl overflow-hidden flex-shrink-0 bg-white dark:bg-neutral-950 shadow-sm">
                      <div className="relative w-full h-48 bg-neutral-100">
                        <Image src={p.src} alt={p.alt ?? ''} fill className="object-cover" />
                        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 to-transparent" />
                        <div className="absolute left-3 top-3 right-3">
                          <div className="inline-flex max-w-full items-start gap-1.5 rounded-md bg-black/35 px-2 py-1 text-sm font-medium text-white backdrop-blur-[1px]">
                            {isBundlePhoto && <Layers3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/90" />}
                            <span className="line-clamp-2">{p.title ?? 'Untitled photo'}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
