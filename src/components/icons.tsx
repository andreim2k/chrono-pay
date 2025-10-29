
import type { SVGProps } from "react";

export function ChronoPayLogo(props: SVGProps<SVGSVGElement>) {
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
      <path d="M12 2a10 10 0 1 0 10 10A10.1 10.1 0 0 0 12 2zm-1.5 5a1.5 1.5 0 0 1 3 0m-3 9v-6m3 6v-6" />
      <path d="M15 15.5a1.5 1.5 0 0 1-3 0" />
      <path d="M10.5 8.5a1.5 1.5 0 0 1 3 0" />
      <path d="m9.5 12.5 5-5" />
    </svg>
  );
}
