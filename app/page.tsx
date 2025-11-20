"use client";

import ProjectPreview from "./components/ProjectPreview";
import ExperiencePreview, { ExperienceTimeline } from "./components/ExperiencePreview";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { YoutubeHighlight } from "./components/YoutubeVideo";
import { FaLinkedin, FaGithub, FaYoutube, FaFileAlt } from "react-icons/fa";
import { useState } from "react";
import { Separator } from "@/components/ui/separator"
import { FullProjectGrid } from "./components/ProjectPreview";
import { OptimusPrimeSpinner } from "./components/OptimusPrime";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { StickerCloud, StickerGrid } from "./components/Stickers";
import Particles from "@/components/Particles";


export default function Home() {
  const [activeView, setActiveView] = useState<"default" | "projects" | "experience" | "more">("default");

  return (

    <main className="flex justify-center px-6 py-20 mt-[-100px]">

      <div className="pointer-events-none fixed inset-0 -z-10">
        <Particles
          particleColors={['#023100', '#0c200d']}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false} className={undefined} />
      </div>

      <div className="flex justify-center px-6 py-20">

        <div className="max-w-xl w-full space-y-2">



          {/* TOP HEADER ROW — Name + Theme Switch */}
          <header className="flex items-center justify-between">
            <div className="flex items-end gap-4">
              <h1 className="text-4xl font-semibold tracking-tight">
                Isaac Jiang
              </h1>

              <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2">
                <Avatar>
                  <AvatarImage src="images/pfp2.jpg" alt="@isaacJ60" />
                  <AvatarFallback>IJ</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarImage
                    src="images/pfp1.png"
                    alt="@isaacj60"
                  />
                  <AvatarFallback>IJ</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarImage
                    src="images/pfp3.jpg"
                    alt="@eyesackle"
                  />
                  <AvatarFallback>IJ</AvatarFallback>
                </Avatar>
              </div>

            </div>

            <ThemeSwitch />
          </header>

          <p className="text-muted-foreground">
            CS @ University of Waterloo, Incoming SWE Intern @ SAP
          </p>

          <section className="space-y-4 mb-4">
            <p className="text-sm leading-6 text-foreground/90">
              This site documents my personal projects, experiences, and some info about me. Feel free to explore, reach out, and connect! <img src="images/mudkip.gif" alt="mudkip" className="inline-block h-7 w-7 ml-1 mt-[-10]" />
            </p>
          </section>

          {/* SECOND ROW — YouTube + Nav */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">
              <YoutubeHighlight
                videoId="2SYfT-AL6Ms"
                title="About Me"
                subtitle="Updated August 2025"
              />
            </div>

            <div className="flex items-center space-x-4 text-foreground">
              <a href="https://www.linkedin.com/in/isaac6/" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                <FaLinkedin size={24} />
              </a>
              <a href="https://github.com/IsaacJ60" aria-label="GitHub" target="_blank" rel="noopener noreferrer">
                <FaGithub size={24} />
              </a>
              <a href="https://www.youtube.com/@eyesackle" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
                <FaYoutube size={24} />
              </a>
              <a href="https://drive.google.com/file/d/1v5q1la3g808hRPcUNbdcoXB1d3JVBp9N/view" aria-label="Resume" target="_blank" rel="noopener noreferrer">
                <FaFileAlt size={24} />
              </a>
            </div>


          </div>

          <div className="flex flex-row flex-wrap items-center gap-12">

          </div>

          <Separator className="mt-[-5] mb-5" />

          {/* NAVBAR TABS */}
          <div className="flex items-center gap-2 rounded-lg border-b border-border bg-card/40 p-1 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setActiveView("default")}
              className={`
              flex-1 rounded-md px-3 py-1.5 transition cursor-pointer
              ${activeView === "default"
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:bg-card/60"}
            `}
            >
              Summary
            </button>

            <button
              type="button"
              onClick={() => setActiveView("projects")}
              className={`
              flex-1 rounded-md px-3 py-1.5 transition cursor-pointer
              ${activeView === "projects"
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:bg-card/60"}
            `}
            >
              Projects
            </button>

            <button
              type="button"
              onClick={() => setActiveView("experience")}
              className={`
              flex-1 rounded-md px-3 py-1.5 transition cursor-pointer
              ${activeView === "experience"
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:bg-card/60"}
            `}
            >
              Experience
            </button>

            <button
              type="button"
              onClick={() => setActiveView("more")}
              className={`
              flex-1 rounded-md px-3 py-1.5 transition cursor-pointer
              ${activeView === "more"
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:bg-card/60"}
            `}
            >
              More
            </button>
          </div>

          {/* CONTENT SWITCHER */}
          {activeView === "default" && (
            <section className="pt-2 space-y-0 border-border">
              <div className="space-y-5">
                <div>
                  <p className="text-md uppercase text-muted-foreground tracking-wide">
                    About Me </p>
                  <StickerCloud />
                </div>
                <div>
                  <p className="text-md uppercase text-muted-foreground tracking-wide">
                    Projects
                  </p>
                  <div className="mt-2">
                    <ProjectPreview />
                  </div>
                </div>

                <div>
                  <div>
                    <p className="text-md uppercase text-muted-foreground tracking-wide">
                      Professional Experience
                    </p>
                  </div>
                  <div className="mt-2">
                    <ExperiencePreview />
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeView === "projects" && (
            <section className="pt-4 pl-10 pr-10 border-border">
              <FullProjectGrid />
            </section>
          )}


          {activeView === "experience" && (
            <section className="pt-4 border-border">
              <div className="text-sm text-muted-foreground">
                <ExperienceTimeline />
              </div>
            </section>
          )}

          {activeView === "more" && (
            <section className="pt-4 space-y-6 border-border">

              <OptimusPrimeSpinner />
            </section>
          )}
        </div>
      </div>

    </main>
  );
}