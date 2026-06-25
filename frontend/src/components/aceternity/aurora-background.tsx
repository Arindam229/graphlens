import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <>
      <style>
        {`
          @keyframes aurora {
            from { background-position: 50% 50%, 50% 50%; }
            to { background-position: 350% 50%, 350% 50%; }
          }
          .animate-aurora {
            animation: aurora 60s linear infinite;
          }
        `}
      </style>
      <div
        className={cn(
          "relative flex flex-col min-h-dvh w-full items-center justify-center overflow-hidden",
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className={cn(
              `
            [--white-gradient:repeating-linear-gradient(100deg,#f0fdf4_0%,#f0fdf4_7%,transparent_10%,transparent_12%,#f0fdf4_16%)]
            [--dark-gradient:repeating-linear-gradient(100deg,#0c1222_0%,#0c1222_7%,transparent_10%,transparent_12%,#0c1222_16%)]
            [--aurora:repeating-linear-gradient(100deg,#22c55e_10%,#10b981_15%,#06b6d4_20%,#0ea5e9_25%,#22c55e_30%)]
            [background-image:var(--white-gradient),var(--aurora)]
            dark:[background-image:var(--dark-gradient),var(--aurora)]
            [background-size:300%,_200%]
            [background-position:50%_50%,50%_50%]
            filter blur-[10px]
            after:content-[""] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] 
            after:dark:[background-image:var(--dark-gradient),var(--aurora)]
            after:[background-size:200%,_100%] 
            after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference
            pointer-events-none
            absolute -inset-[10px] opacity-40 will-change-transform`,
              showRadialGradient &&
                `[mask-image:radial-gradient(ellipse_at_20%_0%,black_10%,transparent_65%)]`
            )}
          ></div>
        </div>
        <div className="relative z-10 w-full flex-1 flex flex-col">{children}</div>
      </div>
    </>
  );
};
