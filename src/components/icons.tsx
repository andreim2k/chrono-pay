
import type { SVGProps } from "react";

export function WorkPayLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" stroke="url(#logoGradient)" />
      <path d="M16 8a4 4 0 0 1-4 4h-1a4 4 0 1 0 0 8" stroke="url(#logoGradient)" />
      <path d="m9 12 2 2 4-4" stroke="url(#logoGradient)" />
    </svg>
  );
}
