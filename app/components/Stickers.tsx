"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type StickerPillProps = {
    imageSrc: string;
    label: string;
    href?: string;
    className?: string;
}

type Sticker = {
    id: string;
    label: string;
    imageSrc: string;
    href?: string;
    x?: number;
    y?: number;
}

const STICKERS: Sticker[] = [
    {
        id: "youtube",
        label: "Videos",
        imageSrc: "/images/youtube.webp",
        href: "https://www.youtube.com/@eyesackle",
        x: 23,
        y: 2,
    },
    {
        id: "valorant",
        label: "Valorant",
        imageSrc: "/images/valorant.webp",
        href: "https://tracker.gg/valorant/profile/riot/IP%20Snatcher%23dns",
        x: 77,
        y: 14,
    },
    {
        id: "writing",
        label: "Writing",
        imageSrc: "/images/writing.webp",
        href: "https://medium.com/@tinytalesisaac",
        x: 35,
        y: 65,
    },
    {
        id: "music",
        label: "Playlist",
        imageSrc: "/images/music.webp",
        href: "https://open.spotify.com/playlist/7MrF5HT1qHqfFguLJmszEr?si=dc3cc9c971ba4e92",
        x: 47,
        y: 30,
    },
    {
        id: "link",
        label: "Legacy Site",
        imageSrc: "/images/link.webp",
        href: "https://legacy.isaacjiang.ca",
        x: 2,
        y: 30,
    },
    {
        id: "hackathons",
        label: "Hackathons",
        imageSrc: "/images/computer.webp",
        href: "https://devpost.com/isaac-jiang66",
        x: 65,
        y: 60,
    },
    {
        id: "badminton",
        label: "Badminton",
        imageSrc: "/images/badminton.webp",
        x: 85,
        y: 70,
    },
    {
        id: "hockey",
        label: "Hockey",
        imageSrc: "/images/hockey.webp",
        x: 15,
        y: 60,
    },
    {
        id: "transformers",
        label: "Transformers",
        imageSrc: "/images/autobots.webp",
        x: 60,
        y: 2,
    }
];

export function StickerPill({
  label,
  imageSrc,
  href,
  className,
}: StickerPillProps) {
  const content = (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full border-t border-border",
        "bg-card/60 px-2 py-2 text-xs text-foreground/90",
        "shadow-sm hover:bg-card hover:translate-y-[-2px] hover:shadow-md",
        "transition-all duration-150",
        className
      )}
    >
      <Image
        src={imageSrc}
        alt={label}
        width={24}
        height={24}
        className="object-contain"
      />
    </div>
  );

  const trigger = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    content
  );

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        side="bottom" 
        className="px-2 py-1 mt-2 rounded-md text-foreground bg-popover border border-border text-xs [&_svg]:hidden!"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function StickerCloud() {
  return (
    <div className="relative mt-4 h-20 w-full">
      {STICKERS.map((sticker) => (
        <div
          key={sticker.id}
          className="absolute"
          style={{
            left: `${sticker.x}%`,
            top: `${sticker.y}%`,
          }}
        >
          <StickerPill
            label={sticker.label}
            imageSrc={sticker.imageSrc}
            href={sticker.href}
          />
        </div>
      ))}
    </div>
  );
}

export function StickerGrid() {
  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {STICKERS.map((sticker) => (
        <StickerPill
          key={sticker.id}
          label={sticker.label}
          imageSrc={sticker.imageSrc}
          href={sticker.href}
          className="justify-center"
        />
      ))}
    </div>
  );
}
