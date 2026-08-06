"use client";

import Link from "next/link";

export default function PhotographyGrid() {
    return (
        <section className="photography-grid space-y-3">
            <p className="text-md uppercase text-muted-foreground tracking-wide">Photography</p>

            <div className="mt-4 flex justify-center">
                <Link
                    href="/photo"
                    className="inline-block rounded-md bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                >
                    Gallery
                </Link>
            </div>
        </section>
    );
}