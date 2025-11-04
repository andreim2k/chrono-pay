import type { SVGProps } from "react";

export function ChronoPayLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      {...props}
    >
      <rect width="32" height="32" rx="6" fill="currentColor" opacity="0.1"/>

      {/* Calendar icon - top left */}
      <rect x="4" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M5 7.5h7M8 5v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Invoice/Document icon - top right */}
      <path d="M18 4h6.5a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H18a1.5 1.5 0 01-1.5-1.5v-9A1.5 1.5 0 0118 4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M19.5 8h4M19.5 10.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Clock icon - bottom left */}
      <circle cx="8.5" cy="22.5" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M8.5 19.5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Check/Task icon - bottom right */}
      <rect x="17" y="18" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M19 22.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
