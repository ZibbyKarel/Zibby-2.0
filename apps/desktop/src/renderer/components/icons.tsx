import React from 'react';

type IconName =
  | 'folder' | 'git' | 'play' | 'pause' | 'plus' | 'x' | 'check'
  | 'chevron' | 'chevronDown' | 'search' | 'clock' | 'bolt' | 'warn'
  | 'github' | 'terminal' | 'diff' | 'more' | 'link' | 'command'
  | 'sun' | 'moon' | 'bell' | 'edit' | 'trash' | 'copy'
  | 'arrowRight' | 'filter' | 'sparkle' | 'paperclip' | 'file' | 'refresh';

const paths: Record<IconName, React.ReactNode> = {
  folder: <><path d="M3 6a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/></>,
  git: <><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8.5 6h7a3 3 0 0 1 3 3v0"/></>,
  play: <><path d="M7 5v14l12-7L7 5Z"/></>,
  pause: <><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  x: <><path d="M6 6l12 12M18 6L6 18"/></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7"/></>,
  chevron: <><path d="M9 6l6 6-6 6"/></>,
  chevronDown: <><path d="M6 9l6 6 6-6"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  bolt: <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z"/></>,
  warn: <><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></>,
  github: <><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.93.83.09-.65.35-1.1.63-1.35-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0C16.54 5.27 17.38 5.54 17.38 5.54c.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></>,
  terminal: <><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M7 9l3 3-3 3M13 15h4"/></>,
  diff: <><path d="M5 3v14a2 2 0 0 0 2 2h2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M19 7v10a2 2 0 0 1-2 2h-2"/><path d="M15 15l-2 2 2 2M9 5l2-2-2-2"/></>,
  more: <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
  link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
  command: <><path d="M9 6H6a3 3 0 1 0 3 3V6Zm0 0h6m0 0v3a3 3 0 1 0 3-3h-3Zm0 0v6m0 0H6a3 3 0 1 0 3 3v-3Zm0 0h6m0 0a3 3 0 1 0-3 3v-3Z"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
  moon: <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></>,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8Z"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></>,
  trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z"/></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  arrowRight: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
  filter: <><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/></>,
  sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z"/></>,
  paperclip: <><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57a4 4 0 0 1 5.66 5.66l-8.58 8.57a2 2 0 0 1-2.83-2.83l7.07-7.07"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6"/></>,
  refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M8 16H3v5"/></>,
};

type IconProps = {
  name: IconName;
  size?: number;
  stroke?: number;
};

export function Icon({ name, size = 16, stroke = 1.75 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

let _markIdCounter = 0;

export function NightCoderMark({ size = 30, accent = '#10b981' }: { size?: number; accent?: string }) {
  const id = React.useId ? React.useId() : String(_markIdCounter++);
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="NightCoder">
      <defs>
        <linearGradient id={`nc-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.95"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0.55"/>
        </linearGradient>
        <radialGradient id={`nc-glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0"/>
        </radialGradient>
        <mask id={`nc-crescent-${id}`}>
          <rect width="32" height="32" fill="black"/>
          <circle cx="16" cy="16" r="12" fill="white"/>
          <circle cx="21" cy="12" r="10" fill="black"/>
        </mask>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#nc-glow-${id})`}/>
      <rect width="32" height="32" fill={`url(#nc-${id})`} mask={`url(#nc-crescent-${id})`}/>
      <g stroke="#04140d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M11 14.5 L8.5 17 L11 19.5"/>
        <path d="M15.5 13 L13 21"/>
      </g>
      <circle cx="23" cy="22" r="1" fill={accent}/>
      <circle cx="25" cy="9" r="0.7" fill={accent} opacity="0.7"/>
    </svg>
  );
}
