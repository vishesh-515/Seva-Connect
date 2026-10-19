import React from "react";

export interface SevaLogoProps {
  className?: string;
  size?: number;
  variant?: "standalone" | "badge" | "full";
  alt?: string;
}

/**
 * SevaLogo — Official Seva Connect Brand Emblem
 * Features the golden sheltering hands, community trinity, and ascending green sprout of service.
 */
export function SevaLogo({
  className = "",
  size = 32,
  variant = "badge",
  alt = "Seva Connect Logo",
}: SevaLogoProps) {
  if (variant === "full") {
    return (
      <img
        src="/brand/seva-connect-full.png"
        alt={alt}
        width={size * 2.2}
        height={size * 2.2}
        className={`inline-block object-contain transition-transform duration-200 group-hover:scale-102 ${className}`}
        loading="eager"
        decoding="async"
      />
    );
  }

  const image = (
    <img
      src="/brand/seva-connect-emblem.png"
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
      loading="eager"
      decoding="async"
    />
  );

  if (variant === "standalone") {
    return <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>{image}</div>;
  }

  // "badge" variant with subtle framing
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-xl border border-[#E8DFD5] dark:border-[#35231C] bg-white/90 dark:bg-[#1E1411]/90 p-1 shadow-2xs backdrop-blur-xs ${className}`}
    >
      {image}
    </div>
  );
}

export interface SevaBrandProps {
  size?: number;
  showTagline?: boolean;
  className?: string;
  useFullArtwork?: boolean;
}

export function SevaBrand({
  size = 36,
  showTagline = true,
  className = "",
  useFullArtwork = false,
}: SevaBrandProps) {
  if (useFullArtwork) {
    return (
      <div className={`group inline-flex items-center ${className}`}>
        <img
          src="/brand/seva-connect-full.png"
          alt="Seva Connect — Every Need. The Right Support."
          width={size * 3}
          className="h-auto max-h-16 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
        />
      </div>
    );
  }

  return (
    <div className={`group flex items-center gap-2.5 font-bold tracking-tight ${className}`}>
      <SevaLogo size={size} variant="standalone" />
      <div className="flex flex-col">
        <span className="text-base text-[#2A1D17] dark:text-[#FFFDFB] leading-none font-bold tracking-tight">
          Seva <span className="text-[#C87A38] dark:text-[#E29555] font-semibold">Connect</span>
        </span>
        {showTagline && (
          <span className="text-[10px] tracking-wider text-[#7D6E63] dark:text-[#AFA196] font-medium mt-0.5">
            Every Need. The Right Support.
          </span>
        )}
      </div>
    </div>
  );
}
