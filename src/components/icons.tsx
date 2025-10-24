import type { SVGProps } from "react";

export function ChronoSapientPayLogo(props: SVGProps<SVGSVGElement>) {
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
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 6v6l3 3" />
      <path d="M12 11.5a2.5 2.5 0 0 0-2.5 2.5c0 .18.02.36.06.53" />
      <path d="M14.5 14a2.5 2.5 0 0 0-2.44-2.5" />
      <path d="M12 9.5a2.5 2.5 0 0 1 2.5 2.5c0 .18-.02.36-.06.53" />
      <path d="M9.5 14a2.5 2.5 0 0 1 2.44-2.5" />
      <path d="M13.25 8.5c.34.13.66.3.95.5" />
      <path d="M10.75 8.5c-.34.13-.66.3-.95.5" />
    </svg>
  );
}
