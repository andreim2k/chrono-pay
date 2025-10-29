import type { SVGProps } from "react";

export function ChronoPayLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Outer circle (timer/clock representation) */}
      <circle cx="12" cy="12" r="10" />

      {/* Checkmark - positioned left */}
      <path d="M5.5 12l2 2 3-3" strokeWidth="1.5" />

      {/* Dollar sign - positioned right */}
      <path d="M15.5 8v8" strokeWidth="1.5" />
      <path d="M17.5 9.5h-3a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3h-3" strokeWidth="1.5" />
    </svg>
  );
}
