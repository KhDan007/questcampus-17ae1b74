import { Reveal } from "./Reveal";

const PAINS = [
  {
    icon: "🧭",
    title: "No clear starting point",
    body: "Thousands of universities, zero guidance on which ones actually fit your profile and goals.",
  },
  {
    icon: "💸",
    title: "Counselors cost thousands",
    body: "Private college counselors charge $1,500–$5,000+. That shouldn't determine who gets good advice.",
  },
  {
    icon: "⏰",
    title: "Deadlines sneak up fast",
    body: "By the time most students find the right schools, they've missed application windows entirely.",
  },
];

// Moment of recognition — name the exact pain. Opens cold, cinematic, dark.
export function ProblemSection() {
  return (
    <section className="bg-inverse-surface px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-[900px]">
        <Reveal y={20} scaleFrom={0.95}>
          <h2 className="mx-auto max-w-[720px] text-center text-headline-md text-inverse-on-surface">
            The university application process was not designed for you.
          </h2>
        </Reveal>

        <ul className="mt-12 grid gap-4 sm:grid-cols-3">
          {PAINS.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.12} y={30}>
              <div className="h-full rounded-lg bg-surface-container-high/10 p-6 ring-1 ring-white/10">
                <span className="text-2xl" aria-hidden>
                  {p.icon}
                </span>
                <h3 className="mt-4 text-headline-sm text-inverse-on-surface">
                  {p.title}
                </h3>
                <p className="mt-2 text-body-md text-outline-variant">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.2} y={20}>
          <blockquote className="mx-auto mt-12 max-w-[600px] border-l-[3px] border-secondary-container pl-5">
            <p className="text-body-lg italic text-inverse-on-surface">
              QuestCampus is the older sibling who&apos;s already been through it —
              and built a map so you don&apos;t have to figure it out alone.
            </p>
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}
