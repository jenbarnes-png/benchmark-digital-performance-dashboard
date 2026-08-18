import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Source: Open Innovations' UK constituency hex map (MIT licensed),
// matching the current (2024 boundary review) 650 constituencies —
// verified against known per-nation seat counts (Wales 32, Scotland 57,
// Northern Ireland 18, England 543) before trusting it, since an
// older/differently-named file from the same ecosystem turned out to
// still be on the pre-2024 boundaries (Wales 40).
const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEXJSON_PATH = path.join(projectRoot, "data/hexmap/uk-constituencies-2024.hexjson");
const HEX_SIZE = 10; // circumradius, in SVG units — arbitrary but consistent

type RawHex = { n: string; q: number; r: number; region: string };
type HexJson = { layout: string; hexes: Record<string, RawHex> };

let cached: HexJson | null = null;
function loadHexJson(): HexJson {
  if (!cached) cached = JSON.parse(readFileSync(HEXJSON_PATH, "utf8"));
  return cached!;
}

export type HexPosition = { code: string; name: string; x: number; y: number };

export function getHexLayout(): { positions: HexPosition[]; hexSize: number; viewBox: string } {
  const data = loadHexJson();
  const short = HEX_SIZE * Math.cos(Math.PI / 6);

  // odd-r offset -> pixel, pointy-top hexagons (matches Open Innovations'
  // own oi.hexmap.js renderer's coordinate formula).
  const positions: HexPosition[] = Object.entries(data.hexes).map(([code, h]) => ({
    code,
    name: h.n,
    x: h.q * short * 2 + (h.r % 2 !== 0 ? short : 0),
    y: -h.r * HEX_SIZE * 1.5,
  }));

  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const pad = HEX_SIZE * 1.5;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) - minX + pad;
  const height = Math.max(...ys) - minY + pad;

  return { positions, hexSize: HEX_SIZE, viewBox: `${minX} ${minY} ${width} ${height}` };
}

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
