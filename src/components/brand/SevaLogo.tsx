import React, { useId } from "react";

interface SevaLogoProps {
  className?: string;
  size?: number;
  variant?: "standalone" | "badge";
}

/**
 * SevaLogo
 * An innovative, modern emblem for Seva Connect.
 * The geometry fuses:
 * 1. An interlocking continuous flow (intertwined hands of service & community)
 * 2. An iconic 'S' dynamic ribbon
 * 3. A central 4-point beacon of hope & humanitarian dignity
 */
export function SevaLogo({ className = "", size = 32, variant = "badge" }: SevaLogoProps) {
  const id = useId().replace(/:/g, "");
  const gradPrimary = `seva-grad-primary-${id}`;
  const gradAccent = `seva-grad-accent-${id}`;
  const gradGlow = `seva-grad-glow-${id}`;
  const filterGlow = `seva-glow-${id}`;

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 group-hover:scale-105"
      aria-label="Seva Connect Logo"
    >
      <defs>
        {/* Vibrant Indigo -> Cyan gradient */}
        <linearGradient id={gradPrimary} x1="6" y1="8" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Warm Radiant Amber -> Rose gradient */}
        <linearGradient id={gradAccent} x1="34" y1="32" x2="10" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="60%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>

        {/* Center Spark Glow */}
        <radialGradient id={gradGlow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>

        {/* Soft Drop Shadow Filter */}
        <filter id={filterGlow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#4F46E5" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter={`url(#${filterGlow})`}>
        {/* Upper Loop: Rising Hand / Wave of Empowerment */}
        <path
          d="M 12 25 C 10 20 11 12 18 9 C 25 6 31 10 30 17 C 29.5 20.5 26.5 22.5 22 22.5 C 16.5 22.5 13 26 13 29.5 C 13 32 15 33.5 17.5 33.5 C 22 33.5 25 30 25.5 27.5"
          stroke={`url(#${gradPrimary})`}
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Lower Interlocking Ribbon: Sheltering Embrace */}
        <path
          d="M 28 15 C 30 20 29 28 22 31 C 15 34 9 30 10 23 C 10.5 19.5 13.5 17.5 18 17.5 C 23.5 17.5 27 14 27 10.5 C 27 8 25 6.5 22.5 6.5 C 18 6.5 15 10 14.5 12.5"
          stroke={`url(#${gradAccent})`}
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Luminous Node of Service (Spark of Compassion) */}
        <path
          d="M 20 16.5 Q 20 20 16.5 20 Q 20 20 20 23.5 Q 20 20 23.5 20 Q 20 20 20 16.5 Z"
          fill={`url(#${gradGlow})`}
        />
        <circle cx="20" cy="20" r="1.5" fill="#FFFFFF" />
      </g>
    </svg>
  );

  if (variant === "standalone") {
    return <div className={`inline-flex items-center justify-center ${className}`}>{mark}</div>;
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl border border-white/20 bg-gradient-to-br from-card/90 via-background to-card/60 p-1.5 shadow-md shadow-primary/15 backdrop-blur-md dark:border-white/10 dark:from-slate-900/90 dark:to-slate-950/80 ${className}`}
    >
      {mark}
    </div>
  );
}

interface SevaBrandProps {
  size?: number;
  showTagline?: boolean;
  className?: string;
}

export function SevaBrand({ size = 36, showTagline = true, className = "" }: SevaBrandProps) {
  return (
    <div className={`group flex items-center gap-2.5 font-bold tracking-tight ${className}`}>
      <SevaLogo size={size - 6} />
      <div className="flex flex-col">
        <span className="text-base text-foreground leading-none font-bold tracking-tight">
          Seva <span className="text-primary font-black">Connect</span>
        </span>
        {showTagline && (
          <span className="text-[10px] tracking-wider text-muted-foreground font-medium mt-0.5">
            Every Need. The Right Support.
          </span>
        )}
      </div>
    </div>
  );
}
