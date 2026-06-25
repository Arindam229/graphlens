import { cn } from "@/lib/utils";

interface DotGridProps {
  className?: string;
  dotColor?: string;
}

export function DotGrid({ className, dotColor = "rgba(100,116,139,0.35)" }: DotGridProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, var(--background) 80%)",
        }}
      />
    </div>
  );
}
