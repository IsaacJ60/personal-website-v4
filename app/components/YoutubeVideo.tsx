"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils"; // if you have one, otherwise inline classes
import { DialogTitle } from "@radix-ui/react-dialog";
import { useState } from "react";

type YoutubeHighlightProps = {
    videoId: string;
    title: string;
    subtitle?: string;
    className?: string;
};

export function YoutubeHighlight({
    videoId,
    title,
    subtitle = "About Me",
    className,
}: YoutubeHighlightProps) {
    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    const [clicked, setClicked] = useState(false);

    return (
        <Dialog modal={true}>
            <DialogTrigger asChild>
                <button onClick={() => setClicked(true)}
                    className={cn(
                        "group flex items-center gap-3 rounded-lg border-t border-border",
                        "bg-card/60 hover:bg-card transition-colors",
                        "px-3 py-2 text-left text-xs sm:text-sm",
                        "backdrop-blur-sm cursor-pointer",
                        !clicked && "bob"
                        , className
                    )}
                >
                    <div className="relative h-10 w-16 overflow-hidden rounded-md">
                        <Image
                            src={thumbnail}
                            alt={title}
                            fill
                            sizes="64px"
                            className="object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Play className="h-4 w-4 text-primary-foreground" />
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                            Click to Watch
                        </span>
                        <span className="text-xs font-medium text-foreground line-clamp-1">
                            {title}
                        </span>
                        <span className="text-[0.7rem] text-muted-foreground">
                            {subtitle}
                        </span>
                    </div>
                </button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl w-full border-border bg-popover">
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <div className="aspect-video w-full rounded-lg p-3">
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={title}
                        className="h-full w-full rounded-md"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share"
                        allowFullScreen
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
