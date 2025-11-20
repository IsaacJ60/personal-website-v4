// list of experiences, that contains [role] @ [company] - [small description]
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"

import { Briefcase } from "lucide-react";

interface Experience {
    role: string;
    company: string;
    period?: string;
    description: React.ReactNode;
}

type ExperienceTimelineProps = {
  items: Experience[];
}

const experiences: Experience[] = [
  {
    role: "Incoming SWE Intern", 
    company: "SAP",
    period: "Jan 2026 - Aug 2026",
    description: "iXp Intern - Business Data Cloud",
  },
  {
    role: "SWE Intern",
    company: "University of Waterloo",
    period: "May 2025 - Aug 2025",
    description: (
      <>
        Built{" "}
        <a
          href="https://uwaterloo.ca/news/media/meet-jada"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 underline"
        >
          JADA
        </a>
        , in collaboration with {" "} 
        <a
          href="https://www.microsoft.com/en-ca/about/our-company"
          target="_blank"
          rel="noopener noreferrer"
          className=" underline"
        >
            Microsoft Canada
        </a>
      </>
    ),
  },
  {
    role: "AI/ML Intern",
    company: "University of Windsor",
    period: "June 2023 - Aug 2023",
    description: <>
        Developed <a
          href="https://github.com/fani-lab/ReQue"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 underline"
        >
          ReQue
        </a>, a query refinement workflow.
    </>,
  },
];

const all_experiences: Experience[] = [
    ...experiences,
    {
        role: "Web Developer",
        company: "UW Japanese Student Association",
        period: "Feb 2025 - Apr 2025",
        description: "Developed and launched the official UWJSA website using React and Tailwind CSS.",
    },
    {
        role: "Logistics Lead",
        company: "UW Data Science Club",
        period: "Dec 2024 - Feb 2025",
        description: "Organized CxC, Canada's largest data science competition.",
    },
    {
        role: "SWE Intern",
        company: "Riverside Minor Baseball Association",
        period: "May 2023 - Aug 2023",
        description: "Created a new player management system with React, Flask and Supabase.",
    }
];

export default function ExperiencePreview() {
    return (
        <div className="space-y-2">
            {experiences.map((exp, idx) => (
                <Item className="backdrop-blur-sm pt-3 pb-3" key={idx} variant={idx === 0 ? "outline" : "muted"}>
                    <ItemContent>
                        <ItemTitle>
                            {exp.role} @ {exp.company}
                        </ItemTitle>
                        <ItemDescription>{exp.description}</ItemDescription>
                    </ItemContent>
                    <ItemActions />
                </Item>
            ))}
        </div>
    );
}

export function ExperienceTimeline() {
    return (
    <div className="relative">
      {/* Vertical line */}

      <div className="space-y-4">
        {all_experiences.map((exp, i) => (
          <div key={i} className="relative">
            {/* Dot */}
            <div className="
              absolute left-[-0.2rem] top-1.5 h-3 w-3 rounded-full
              border border-border bg-background
            " />

            <div className="ml-6 p-4 rounded-lg border border-border bg-card/20 hover:bg-card transition-colors backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {exp.role}
                  </h3>
                  <p className="text-xs text-muted-foreground">{exp.company}</p>
                </div>

                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">{exp.period}</p>

              <div className="mt-2 text-sm leading-relaxed text-foreground/90">
                {exp.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}