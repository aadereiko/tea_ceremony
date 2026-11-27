import type { ReactNode } from 'react'

// Drawn on a 32×32 grid. Plain paths are outlines; className "f" adds the soft duotone fill and
// "s" is a small solid detail (eyes, noses, bubbles). Colour always comes from currentColor.
export const ILLUSTRATIONS: Record<string, ReactNode> = {
  lantern: (
    <>
      <path d="M16 3v4" />
      <rect className="f" x="8" y="7" width="16" height="18" rx="8" />
      <path d="M12 7h8M12 25h8M16 7v18M10.5 12h11M10.5 20h11" />
      <path d="M14 25v3h4v-3" />
    </>
  ),
  house: (
    <>
      <path className="f" d="M8 13v13h16V13l-8-6.5z" />
      <path d="M5 15 16 6l11 9" />
      <path d="M13 26v-7h6v7" />
    </>
  ),
  mountain: (
    <>
      <path className="f" d="M3 26 12 11l5 8 3-4 9 11z" />
      <path d="M9.4 15.4 12 18l2.4-2.6" />
      <circle className="s" cx="24" cy="7" r="2.2" />
    </>
  ),
  moon: (
    <>
      <path className="f" d="M21 5a11 11 0 1 0 6.5 16.5A9 9 0 0 1 21 5z" />
      <path d="M8 4.5v4M6 6.5h4M26 10v2.5M24.75 11.25h2.5" />
    </>
  ),
  autumn: (
    <>
      <path className="f" d="M6 26C6 14 14 6 26 6c0 12-8 20-20 20z" />
      <path d="M6 26 19 13M12 20h5M15 17v-5" />
    </>
  ),
  snowflake: (
    <>
      <path d="M16 4v24M5.6 10l20.8 12M5.6 22l20.8-12" />
      <path d="M13 6.5l3 3 3-3M13 25.5l3-3 3 3M6 14.5l4 .5-1.5 3.8M26 17.5l-4-.5 1.5-3.8" />
      <circle className="f" cx="16" cy="16" r="3" />
    </>
  ),
  gift: (
    <>
      <path className="f" d="M7 18h18v8H7z" />
      <rect x="5" y="12" width="22" height="6" rx="1.5" />
      <path d="M16 12v14" />
      <path d="M16 12c-2-5-8-6-8-2 0 2 4 2 8 2zM16 12c2-5 8-6 8-2 0 2-4 2-8 2z" />
    </>
  ),
  torii: (
    <>
      <path className="f" d="M4 7.5c8 2 16 2 24 0l-1 3.5c-7 1.4-15 1.4-22 0z" />
      <path d="M6 15h20M9 11v16M23 11v16M16 11v4" />
    </>
  ),

  mystery: (
    <>
      <circle className="f" cx="16" cy="16" r="11" />
      <path d="M12.5 12.5a3.5 3.5 0 1 1 5.2 3.1c-1.1.6-1.7 1.3-1.7 2.4v.8" />
      <circle className="s" cx="16" cy="22.6" r="1.4" />
    </>
  ),

  fox: (
    <>
      <path className="f" d="M5 7l6.5 4.5h9L27 7l-2 11c-1 5-5 8-9 8s-8-3-9-8z" />
      <path d="M7 17.5l5.5 3.5M25 17.5 19.5 21" />
      <circle className="s" cx="12" cy="16.5" r="1.4" />
      <circle className="s" cx="20" cy="16.5" r="1.4" />
      <path className="s" d="M14.5 22h3L16 24z" />
    </>
  ),
  cat: (
    <>
      <path className="f" d="M7 6l4.5 5.5h9L25 6v12a9 9 0 0 1-18 0z" />
      <circle className="s" cx="12.5" cy="16.5" r="1.4" />
      <circle className="s" cx="19.5" cy="16.5" r="1.4" />
      <path className="s" d="M14.8 20h2.4L16 21.4z" />
      <path d="M3 19h5M3.5 22.5l4.5-1.5M29 19h-5M28.5 22.5 24 21" />
    </>
  ),
  dog: (
    <>
      <rect className="f" x="8" y="7" width="16" height="19" rx="8" />
      <path d="M8.5 10.5c-4 0-5.5 7-3.5 9 2 1.5 3.5-1.5 3.5-4M23.5 10.5c4 0 5.5 7 3.5 9-2 1.5-3.5-1.5-3.5-4" />
      <circle className="s" cx="13" cy="15.5" r="1.4" />
      <circle className="s" cx="19" cy="15.5" r="1.4" />
      <ellipse className="s" cx="16" cy="20.5" rx="2" ry="1.4" />
      <path d="M16 22v2" />
    </>
  ),
  bear: (
    <>
      <circle className="f" cx="9" cy="9" r="3.5" />
      <circle className="f" cx="23" cy="9" r="3.5" />
      <circle className="f" cx="16" cy="18" r="10" />
      <ellipse cx="16" cy="21.5" rx="4" ry="3" />
      <circle className="s" cx="12" cy="16" r="1.4" />
      <circle className="s" cx="20" cy="16" r="1.4" />
      <circle className="s" cx="16" cy="20.5" r="1.2" />
    </>
  ),
  panda: (
    <>
      <circle className="s" cx="8.5" cy="9" r="3.2" />
      <circle className="s" cx="23.5" cy="9" r="3.2" />
      <circle className="f" cx="16" cy="18" r="10" />
      <ellipse className="s" cx="11.5" cy="17" rx="2.5" ry="3.4" transform="rotate(25 11.5 17)" />
      <ellipse className="s" cx="20.5" cy="17" rx="2.5" ry="3.4" transform="rotate(-25 20.5 17)" />
      <circle className="s" cx="16" cy="21.5" r="1.2" />
    </>
  ),
  rabbit: (
    <>
      <path className="f" d="M12.5 13C10.5 7 10.5 3 12.75 3S15.5 8 14.75 13zM19.5 13c2-6 2-10-.25-10S16.5 8 17.25 13z" />
      <ellipse className="f" cx="16" cy="20" rx="9" ry="8" />
      <circle className="s" cx="12.5" cy="18.5" r="1.4" />
      <circle className="s" cx="19.5" cy="18.5" r="1.4" />
      <path d="M16 22v1.5M14 24.5c1 .8 3 .8 4 0" />
    </>
  ),
  owl: (
    <>
      <path className="f" d="M7 7l3.5 3.5a10 10 0 0 1 11 0L25 7v13a9 9 0 0 1-18 0z" />
      <circle cx="12" cy="16" r="3.5" />
      <circle cx="20" cy="16" r="3.5" />
      <circle className="s" cx="12" cy="16" r="1.4" />
      <circle className="s" cx="20" cy="16" r="1.4" />
      <path className="s" d="M14.8 20h2.4L16 22.4z" />
    </>
  ),
  frog: (
    <>
      <circle className="f" cx="10" cy="11" r="4" />
      <circle className="f" cx="22" cy="11" r="4" />
      <path className="f" d="M4 20c0-6 5-8.5 12-8.5s12 2.5 12 8.5-5 7-12 7-12-1-12-7z" />
      <circle className="s" cx="10" cy="11" r="1.5" />
      <circle className="s" cx="22" cy="11" r="1.5" />
      <path d="M10 21c3 2.5 9 2.5 12 0" />
    </>
  ),
  penguin: (
    <>
      <path className="f" d="M16 4c-6 0-9 6-9 12.5S10 27 16 27s9-4 9-10.5S22 4 16 4z" />
      <path d="M16 13c-3 0-5 3.5-5 7S13 26 16 26s5-2.5 5-6-2-7-5-7z" />
      <path d="M7.5 14.5c-2.5 1.5-4 4.5-3.5 7.5M24.5 14.5c2.5 1.5 4 4.5 3.5 7.5M11.5 28.5h3.5M17 28.5h3.5" />
      <circle className="s" cx="13" cy="10" r="1.3" />
      <circle className="s" cx="19" cy="10" r="1.3" />
      <path className="s" d="M14.6 12.5h2.8L16 14.6z" />
    </>
  ),
  mouse: (
    <>
      <circle className="f" cx="8" cy="10" r="5" />
      <circle className="f" cx="24" cy="10" r="5" />
      <path className="f" d="M16 10c-6 0-9 5-9 10s4 7 9 7 9-2 9-7-3-10-9-10z" />
      <circle className="s" cx="12.5" cy="18" r="1.4" />
      <circle className="s" cx="19.5" cy="18" r="1.4" />
      <circle className="s" cx="16" cy="22" r="1.2" />
      <path d="M4 21.5l6-.5M28 21.5l-6-.5" />
    </>
  ),
  koala: (
    <>
      <circle className="f" cx="7" cy="12" r="5" />
      <circle className="f" cx="25" cy="12" r="5" />
      <circle className="f" cx="16" cy="18" r="9" />
      <circle className="s" cx="11.5" cy="15.5" r="1.4" />
      <circle className="s" cx="20.5" cy="15.5" r="1.4" />
      <ellipse className="s" cx="16" cy="19.5" rx="2.6" ry="3.6" />
    </>
  ),
  chick: (
    <>
      <circle className="f" cx="16" cy="18" r="9.5" />
      <path d="M15 8.5c-.5-3 1.5-4.5 3.5-3.5" />
      <circle className="s" cx="12.5" cy="16.5" r="1.4" />
      <circle className="s" cx="19.5" cy="16.5" r="1.4" />
      <path className="s" d="M13.8 19.5h4.4L16 22z" />
      <path d="M6.5 19c-2 1-2.5 3-1.5 4.5M25.5 19c2 1 2.5 3 1.5 4.5" />
    </>
  ),

  cup: (
    <>
      <path className="f" d="M5 13h18v4a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8z" />
      <path d="M23 15h2a3 3 0 0 1 0 6h-2.5M4 28h20" />
      <path d="M11 4.5c-1 2 1 3 0 5M16 4.5c-1 2 1 3 0 5" />
    </>
  ),
  teapot: (
    <>
      <path className="f" d="M8 14h14c2 0 3 3 3 6 0 4-3 6.5-10 6.5S5 24 5 20c0-3 1-6 3-6z" />
      <path d="M11 14c0-3.5 8-3.5 8 0M15 8.5v2" />
      <path d="M24.5 19 29 12.5M6.5 16c-3.5 0-4.5 5-1 6.5" />
    </>
  ),
  mug: (
    <>
      <rect className="f" x="6" y="8" width="15" height="19" rx="3" />
      <path d="M21 12h2.5a3.5 3.5 0 0 1 0 7H21" />
      <path d="M15 8v8" />
      <rect x="13.25" y="16" width="3.5" height="3.5" rx=".6" />
    </>
  ),
  boba: (
    <>
      <path className="f" d="M8 11h16l-2 16.5H10z" />
      <path d="M6.5 11h19M17 11l3-7.5h3.5" />
      <circle className="s" cx="12.5" cy="23.5" r="1.3" />
      <circle className="s" cx="16" cy="24.5" r="1.3" />
      <circle className="s" cx="19.5" cy="23.5" r="1.3" />
      <circle className="s" cx="14.5" cy="21" r="1.3" />
    </>
  ),
  gaiwan: (
    <>
      <path className="f" d="M9 11c2-3.5 12-3.5 14 0z" />
      <path d="M15 7h2" />
      <path className="f" d="M6 13.5h20c0 6-4 10-10 10S6 19.5 6 13.5z" />
      <path d="M4.5 27h23" />
    </>
  ),
  matcha: (
    <>
      <path className="f" d="M4 15h24c0 7-5 11.5-12 11.5S4 22 4 15z" />
      <path d="M7 15c2-2 4 2 6 0s4 2 6 0 4 2 6 0" />
      <path d="M12 5c-1 2 1 3 0 5M17 5c-1 2 1 3 0 5" />
    </>
  ),
  iced: (
    <>
      <path className="f" d="M7 8h15l-2 19.5H9z" />
      <path d="M11 15.5l3-1 1 3-3 1zM14.5 20.5l3-.5.5 3-3 .5z" />
      <circle cx="23" cy="8" r="4.5" />
      <path d="M23 3.5v9M18.5 8h9M15 8l3-5.5" />
    </>
  ),
  flask: (
    <>
      <rect className="f" x="10" y="9" width="12" height="19" rx="3" />
      <rect x="11.5" y="4" width="9" height="5" rx="1.2" />
      <path d="M10 15h12M10 22h12" />
    </>
  ),
}

export function Illustration({ name, size = 22 }: { name: string; size?: number }) {
  const drawing = ILLUSTRATIONS[name]
  // Rooms saved in the browser before icons were drawings still hold an emoji; show it as text.
  if (!drawing) return <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>{name}</span>
  return (
    <svg
      className="illustration"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {drawing}
    </svg>
  )
}
