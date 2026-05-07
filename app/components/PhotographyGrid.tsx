"use client";

import Link from "next/link";

export default function PhotographyGrid() {
    return (
        <section className="photography-grid space-y-3">
            <p className="text-md uppercase text-muted-foreground tracking-wide">Photography</p>

            <div className="h-32 rounded-lg bg-gray-50 dark:bg-zinc-900 flex items-center justify-center px-6">
                <p className="text-center text-muted-foreground">
                    I love photography! I love how it can freeze any given moment in time, capture the tiniest details, and make people feel appreciated, and loved.
                    To view my portfolio, please click the button below.
                </p>
            </div>

            <div className="mt-4 flex justify-center">
                <Link
                    href="/photo"
                    className="inline-block rounded-md bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                >
                    Enter full viewer
                </Link>
            </div>
        </section>
    );
}