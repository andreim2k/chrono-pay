
import type { SVGProps } from "react";

export function WorkPayLogo(props: SVGProps<SVGSVGElement>) {
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
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" stroke="url(#logoGradient)" strokeWidth="2.5"/>
      <path d="M15 8.5a2.5 2.5 0 0 0-5 0V10m0-1.5a2.5 2.5 0 0 1 5 0V10m-5 4a2.5 2.5 0 0 0 5 0V14m0-4h-5m2.5 10V8m-5 4h10" stroke="url(#logoGradient)" strokeWidth="1.5" />
    </svg>
  );
}
