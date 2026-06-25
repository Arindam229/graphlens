import React from "react";
import { cn } from "@/lib/utils";

export function GridBackground({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-dvh w-full bg-background relative",
        className
      )}
    >
      {/* Subtle dot grid — very low opacity */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(100,116,139,0.10) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />
      {/* Vignette — keeps edges clean */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 0%, var(--background) 70%)",
        }}
      />
      {/* Ambient green glow — pushed to bottom-left, not behind headings */}
      <div className="pointer-events-none fixed bottom-[10%] left-[5%] w-[500px] h-[400px] rounded-full bg-green-500/4 blur-[150px] z-0" />
      {/* Ambient cyan glow bottom-right */}
      <div className="pointer-events-none fixed bottom-[5%] right-[10%] w-[400px] h-[300px] rounded-full bg-cyan-500/3 blur-[120px] z-0" />

      <div className="relative z-10 w-full flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
}
