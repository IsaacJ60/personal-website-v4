"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PhotoImage } from "../types";

type RecentCarouselProps = {
  photos: (PhotoImage & { id: string; href?: string })[];
};

export default function RecentCarousel({ photos }: RecentCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: false,
    skipSnaps: false,
    slidesToScroll: 1,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(
    () => emblaApi && emblaApi.scrollPrev(),
    [emblaApi]
  );

  const scrollNext = useCallback(
    () => emblaApi && emblaApi.scrollNext(),
    [emblaApi]
  );

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const onInit = useCallback(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onInit();
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onInit);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onInit);
    };
  }, [emblaApi, onInit, onSelect]);

  return (
    <section className="mb-4">
      <h2 className="mb-4 text-center text-2xl font-semibold tracking-tight">Recent Work</h2>

      <div className="relative group mb-6">
        <div
          ref={emblaRef}
          className="overflow-hidden rounded-lg"
        >
          <div className="flex -ml-2">
            {photos.map((image) => (
              <Link
                key={image.id}
                href={image.href ?? `/photo/photos/${image.id}`}
                className="relative flex-[0_0_calc(100%/3)] min-w-0 pl-2"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-md group/image">
                  <Image
                    src={image.src}
                    alt={image.alt || image.title || "Photo"}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-300 group-hover/image:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Left Arrow */}
        <button
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-neutral-900/60 hover:bg-neutral-900/80 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous slide"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Right Arrow */}
        <button
          onClick={scrollNext}
          disabled={!canScrollNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-neutral-900/60 hover:bg-neutral-900/80 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next slide"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Dot Indicators - based on actual scroll snaps */}
      {scrollSnaps.length > 1 && (
        <div className="flex gap-2 justify-center">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === selectedIndex
                  ? "bg-neutral-900 dark:bg-neutral-100 w-6"
                  : "bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
