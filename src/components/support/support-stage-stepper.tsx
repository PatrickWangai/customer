import { Check } from "lucide-react";

const STEP_LABELS = ["Received", "Being worked on", "Done"];

export function SupportStageStepper({ stage, activeLabel }: { stage: 1 | 2 | 3; activeLabel: string }) {
  return (
    <div className="flex items-center">
      {STEP_LABELS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const complete = step < stage;
        const active = step === stage;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                  complete
                    ? "bg-success text-success-foreground"
                    : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {complete ? <Check className="size-4" /> : step}
              </div>
              <span className={`max-w-24 text-center text-[11px] ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {active ? activeLabel : label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className={`mx-1 h-0.5 flex-1 ${complete ? "bg-success" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}
