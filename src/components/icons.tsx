import type { SVGProps } from "react";

export function WorkPayLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="url(#logoGradient)" />
      <path d="M12 6v6l4 2" stroke="url(#logoGradient)" strokeWidth="1.5"/>
      <path d="M15.5 9.5a2.5 2.5 0 0 0-5-2.5" stroke="currentColor" opacity="0.7" />
      <path d="M8.5 14.5a2.5 2.5 0 0 0 5 2.5" stroke="currentColor" opacity="0.7" />
    </svg>
  );
}
