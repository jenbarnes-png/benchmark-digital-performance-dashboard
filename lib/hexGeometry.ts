// Pure geometry only, no file I/O — split out from lib/hexmap.ts so
// client components can use it without pulling in that file's node:fs
// read (which Turbopack can't bundle for the browser).

export type HexPosition = { code: string; name: string; x: number; y: number };

/** SVG polygon points for a pointy-top hexagon centered at (cx, cy). */
export function hexPoints(cx: number, cy: number, size: number): string {
  const short = size * Math.cos(Math.PI / 6);
  const half = size / 2;
  const vertices: [number, number][] = [
    [cx, cy - size],
    [cx + short, cy - half],
    [cx + short, cy + half],
    [cx, cy + size],
    [cx - short, cy + half],
    [cx - short, cy - half],
  ];
  return vertices.map(([x, y]) => `${x},${y}`).join(" ");
}
