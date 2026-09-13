import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    "aria-hidden": true as const,
    ...props,
  };
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 8h11M9 4.5 13.5 8 9 11.5" strokeLinecap="square" />
    </svg>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4.2" y="4.2" width="7.6" height="7.6" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 3.5v9M3.5 8h9" strokeLinecap="square" />
    </svg>
  );
}

export function PaperclipIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10.2 4.6 5.4 9.4a2.3 2.3 0 1 0 3.2 3.2l5.1-5.1a3.4 3.4 0 0 0-4.8-4.8L3.7 7.9" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="square" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5.5" y="5.5" width="7" height="7" />
      <path d="M3.5 10.5v-7h7" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 8.2 6.6 11.2 12.5 4.8" strokeLinecap="square" />
    </svg>
  );
}
