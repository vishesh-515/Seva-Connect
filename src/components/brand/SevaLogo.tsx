import React, { useId } from "react";

interface SevaLogoProps {
  className?: string;
  size?: number;
  variant?: "standalone" | "badge";
}

/**
 * SevaLogo — Refined Earth-Tone Emblem
 * Geometric harmony of service:
 * 1. An interlocking continuous flow (hands of community & dignified care)
 * 2. An iconic 'S' ribbon in Antique Gold & Muted Sage
 * 3. A central warm beacon of human dignity
 */
export function SevaLogo({ className = "", size = 32, variant = "badge" }: SevaLogoProps) {
  const id = useId().replace(/:/g, "");
  const gradGold = `seva-grad-gold-${id}`;
  const gradSage = `seva-grad-sage-${id}`;
  const gradCenter = `seva-grad-center-${id}`;

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200 group-hover:scale-105"
      aria-label="Seva Connect Logo"
    >
      <defs>
        {/* Warm Copper Gradient */}
        <linearGradient id={gradGold} x1="6" y1="8" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EFA66C" />
          <stop offset="50%" stopColor="#E29555" />
          <stop offset="100%" stopColor="#C87A38" />
        </linearGradient>

        {/* Forest Sage & Warm Cocoa Gradient */}
        <linearGradient id={gradSage} x1="34" y1="32" x2="10" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2EA063" />
          <stop offset="50%" stopColor="#24784B" />
          <stop offset="100%" stopColor="#4A3026" />
        </linearGradient>

        {/* Center Spark Glow */}
        <radialGradient id={gradCenter} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFDFB" />
          <stop offset="60%" stopColor="#F9DFCB" />
          <stop offset="100%" stopColor="#E29555" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g>
        {/* Upper Loop: Rising Hand / Wave of Empowerment in Warm Copper */}
        <path
          d="M 12 25 C 10 20 11 12 18 9 C 25 6 31 10 30 17 C 29.5 20.5 26.5 22.5 22 22.5 C 16.5 22.5 13 26 13 29.5 C 13 32 15 33.5 17.5 33.5 C 22 33.5 25 30 25.5 27.5"
          stroke={`url(#${gradGold})`}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Lower Interlocking Ribbon: Sheltering Embrace in Emerald */}
        <path
          d="M 28 15 C 30 20 29 28 22 31 C 15 34 9 30 10 23 C 10.5 19.5 13.5 17.5 18 17.5 C 23.5 17.5 27 14 27 10.5 C 27 8 25 6.5 22.5 6.5 C 18 6.5 15 10 14.5 12.5"
          stroke={`url(#${gradSage})`}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Luminous Node of Service */}
        <path
          d="M 20 16.5 Q 20 20 16.5 20 Q 20 20 20 23.5 Q 20 20 23.5 20 Q 20 20 20 16.5 Z"
          fill={`url(#${gradCenter})`}
        />
        <circle cx="20" cy="20" r="1.5" fill="#FFFDFB" />
      </g>
    </svg>
  );

  if (variant === "standalone") {
    return <div className={`inline-flex items-center justify-center ${className}`}>{mark}</div>;
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl border border-[#DCD0C1] bg-[#FFFCF6] p-1.5 shadow-2xs dark:border-[#35231C] dark:bg-[#1E1411] ${className}`}
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
        <span className="text-base text-[#30241F] dark:text-[#FFFDFB] leading-none font-bold tracking-tight">
          Seva <span className="text-[#C87A38] dark:text-[#E29555] font-semibold">Connect</span>
        </span>
        {showTagline && (
          <span className="text-[10px] tracking-wider text-[#76695E] dark:text-[#AFA196] font-medium mt-0.5">
            Every Need. The Right Support.
          </span>
        )}
      </div>
    </div>
  );
}
