import { GraduationCap } from "lucide-react";

type QuestCampusLogoProps = {
  className?: string;
  textClassName?: string;
};

export function QuestCampusLogo({
  className = "",
  textClassName = "",
}: QuestCampusLogoProps) {
  return (
    <span
      aria-label="QuestCampus"
      className={`inline-flex items-center gap-2 text-on-surface ${className}`}
    >
      <span className="grid h-full min-h-7 aspect-square place-items-center rounded-md border-2 border-on-surface bg-primary text-white qc-hard-shadow-sm">
        <GraduationCap className="h-[58%] w-[58%]" aria-hidden />
      </span>
      <span
        className={`font-display text-[1.15rem] font-extrabold leading-none tracking-tight ${textClassName}`}
      >
        QuestCampus
      </span>
    </span>
  );
}
