"use client";

import {
    HoverCard,
    HoverCardTrigger,
    HoverCardContent,
} from "@/components/ui/hover-card";

import { Card, CardContent } from "@/components/ui/card"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay";

type Project = {
    title: string;
    subtitle?: string;
    description: string;
    imageUrl?: string;
    tech: string;
    link: string;
};

const projects: Project[] = [
    {
        title: "FATELESS Studios",
        subtitle: "Hack the Valley X Winner",
        description: "No-code, AI-powered Game Development Studio.",
        tech: "Python, MCP, Gemini, ElevenLabs",
        link: "https://www.youtube.com/watch?v=A5_xIJWFuLg",
    },
    {
        title: "BeyondSight",
        subtitle: "Hack the North 2025 Winner",
        description: "Wearable device to assist deafblind individuals.",
        tech: "Python, MongoDB, Flask, Genesys",
        link: "https://devpost.com/software/beyondsight-589mh7",
    },
    {
        title: "Be My Valentine?",
        subtitle: "A 3D Valentine Experience",
        description: "Ask someone to be your Valentine!",
        tech: "React, Three.js, Typescript",
        link: "https://valentine.isaacjiang.ca/",
    },
];

const FullProjects: Project[] = [
    {
        title: "FATELESS Studios",
        description: "Your personal no-code Game Development Studio. Create, play, and share video games with just one prompt. Powered by Gemini, ElevenLabs, and Pygame.",
        imageUrl: "/images/fateless.webp",
        tech: "MCP, Gemini, Python, Pygame, ElevenLabs",
        link: "https://www.youtube.com/watch?v=A5_xIJWFuLg",
    },
    {
        title: "BeyondSight",
        description: "A full AI-integrated wearable ecosystem designed to empower deafblind individuals with independence, communication, and safety.",
        imageUrl: "/images/beyondsight.webp",
        link: "https://github.com/IsaacJ60/BeyondSight",
        tech: "Arduino, Python, ElevenLabs, MongoDB, Flask, Whisper, Genesys",
    },
    {
        title: "Raspberry Pi Cloud Server",
        description: "A self-hosted cloud storage solution powered by Nextcloud, running on a Raspberry Pi 3 B+ with DietPi for lightweight performance. Features a USB/SSD boot setup, dynamic DNS, secure HTTPS with Let's Encrypt, and full LAN/remote access.",
        imageUrl: "/images/nextcloud.webp",
        link: "",
        tech: "DietPi, Nextcloud, Raspberry Pi",
    },
    {
        title: "FreePlay: Audio Aggregator and Player",
        description: "A cross-platform desktop music player with Electron and Vite, with core features to import Spotify playlists by integrating the Spotify API and youtube-dl-exec with a custom metadata aggregation pipeline",
        imageUrl: "/images/freeplay.webp",
        link: "https://github.com/IsaacJ60/FreePlay",
        tech: "Electron, Vite, JavaScript, HTML/CSS",
    },
    {
        title: "Will You Be My Valentine? 3D Edition",
        description:
            "A beautiful, interactive 3D Valentine's desktop website featuring a custom Three.js scene, Valentine's card, and smooth animations. Built with React, Three.js, @react-three/fiber, Framer Motion, and React Scroll Motion.",
        imageUrl: "https://github.com/user-attachments/assets/d116d81c-d0a3-4479-9a3f-276eaac9897b",
        link: "https://valentine.isaacjiang.ca",
        tech: "React, Three.js, TypeScript",
    },
    {
        title: "The Bigger Picture.",
        description:
            "An online photo mosaic generator that allows users to collaboratively prepare and render stunning mosaics.",
        imageUrl: "https://cdn.dorahacks.io/static/files/1947da8fb2dac26bc47d6e94f249987f.png",
        link: "https://github.com/IsaacJ60/The-Bigger-Picture",
        tech: "Amazon S3, mySQL, Vue.js, Flask, Python",
    },
    {
        title: "StudyLock",
        description:
            "A 3-in-1 studying application that detects distractions and sends text message alerts if you are caught scrolling on your phone, a plushie that shouts at you when you stray off task, and an integrated to-do list.",
        imageUrl: "https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/268/613/datas/original.png",
        link: "https://github.com/IsaacJ60/StudyLock",
        tech: "React Native, Flask, Twilio, Python, C++, TypeScript, OpenAI API",
    },
    {
        title: "EcoDash",
        description:
            "A full-stack application that empowers users to take action on world issues through up-to-date information on global developments relating to the UN's 17 sustainable development goals.",
        imageUrl: "https://d112y698adiu2z.cloudfront.net/photos/production/software_thumbnail_photos/003/209/324/datas/medium.png",
        link: "https://github.com/IsaacJ60/EcoDash",
        tech: "Vue.js, Flask, Selenium, Python, Git, Cohere API",
    },
    {
        title: "HealthScreen",
        description:
            "A medical screening application for patient use in free clinics in Detroit, MI, for an under-served patient population.",
        imageUrl: "/images/healthscreen.webp",
        link: "https://github.com/IsaacJ60/HealthScreen",
        tech: "Firebase, Flutter, Dart",
    },
    {
        title: "PowerNote",
        description:
            "An AI-powered flashcard and note generator.",
        imageUrl: "/images/powernote.webp",
        link: "https://github.com/IsaacJ60/masseyhacksIX",
        tech: "Java Swing, Python, Apache POI, OpenAI API",
    },
    {
        title: "KanBoy",
        description:
            "The only Discord-based Kanban board you'll ever need.",
        imageUrl: "/images/kanboy.webp",
        link: "https://github.com/IsaacJ60/kanboy",
        tech: "React, JavaScript, Discord API, Python",
    },
    {
        title: "Alan's Adventure",
        description:
            "A Downwell-inspired game made purely in Java Swing.",
        imageUrl: "/images/alansadventure.webp",
        link: "https://github.com/IsaacJ60/alanadventure",
        tech: "Java Swing, Game Development",
    },
    {
        title: "FyLy",
        description:
            "An AI-powered file organizer and command line application.",
        imageUrl: "/images/fyly.webp",
        link: "https://github.com/IsaacJ60/hackthe6ix2023",
        tech: "Taipy, Python Click, OpenAI API",
    },
    {
        title: "SideSchedule",
        description:
            "An AI-powered scheduler app, with Google Calendar integration.",
        imageUrl: "/images/sideschedule.webp",
        link: "https://github.com/IsaacJ60/side-schedule",
        tech: "React, Discord API, Python",
    },
    {
        title: "SurveyScreen",
        description:
            "An AI-powered general health screening tool, made as a web variant/prototype to HealthScreen.",
        imageUrl: "/images/surveyscreen.webp",
        link: "https://github.com/IsaacJ60/surveyscreen",
        tech: "React",
    },
    {
        title: "Arkanoid",
        description:
            "A remake of the classic Arkanoid game, made purely in Java Swing.",
        imageUrl: "/images/arkanoid.webp",
        link: "https://github.com/IsaacJ60/arkanoid",
        tech: "Java Swing, Game Development",
    },
    {
        title: "PAINT (AoT Edition)",
        description:
            "A reacreation of the classic MS Paint, with an Attack on Titan twist.",
        imageUrl: "/images/aotpaint.webp",
        link: "https://github.com/IsaacJ60/aotpaintfinal",
        tech: "Python, Pygame",
    },
];

export default function ProjectGrid() {
    return (
        <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {projects.map((proj, idx) => (
                    <HoverCard key={idx} openDelay={50} closeDelay={25}>
                        <HoverCardTrigger asChild>
                            <a href={proj.link} target="_blank" rel="noopener noreferrer">
                                <div
                                    className="
        p-2 rounded-md
        backdrop-blur-sm border border-border
        flex flex-col items-center justify-center cursor-pointer
        transition
      "
                                >
                                    <p className="text-xs font-semibold truncate">{proj.title}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{proj.subtitle}</p> {/* subtitle */}
                                </div>
                            </a>
                        </HoverCardTrigger>


                        <HoverCardContent
                            className="
                w-64 rounded-md
                 backdrop-blur-xl 
                border border-border
              "
                        >
                            <h4 className="text-sm font-semibold mb-1">{proj.title}</h4>
                            <p className="text-xs mb-2">{proj.description}</p>
                            <p className="text-xs italic">{proj.tech}</p>
                        </HoverCardContent>
                    </HoverCard>
                ))}
            </div>
        </div>
    );
}

export function FullProjectGrid() {
    return (
        <div>
            <Carousel plugins={[Autoplay({ delay: 2500 })]} className="w-full max-w-xl">
                <CarouselContent className="-ml-1">
                    {Array.from({ length: FullProjects.length }).map((_, index) => (
                        <CarouselItem key={index} className="pl-1 sm:basis-1/2 lg:basis-1/1">
                            <div className="p-1">
                                <Card className="h-44 border-border bg-card/60 hover:bg-card transition-colors backdrop-blur-sm">
  <CardContent className="relative p-4 h-full">
    <a
      href={FullProjects[index].link}
      target="_blank"
      rel="noopener noreferrer"
      className="relative flex h-full flex-col pr-20"
    >
      {/* Small image in top-right */}
      {FullProjects[index].imageUrl && (
        <img
          src={FullProjects[index].imageUrl}
          alt={FullProjects[index].title}
          className="absolute top-6 right-6 h-20 w-20 object-cover opacity-80 rounded-md border border-border"
        />
      )}

      {/* Main content */}
      <h3 className="text-base font-semibold">
        {FullProjects[index].title}
      </h3>

      <p className="text-sm text-muted-foreground mt-1 line-clamp-2 pr-12">
        {FullProjects[index].description}
      </p>

      {/* Tech pinned to bottom */}
      <p className="text-xs italic mt-auto text-muted-foreground">
        {FullProjects[index].tech}
      </p>
    </a>
  </CardContent>
</Card>


                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
            <div className="text-muted-foreground py-2 text-center text-sm">
                CS Projects Showcase (More coming soon!)
            </div>
        </div>
    )
}