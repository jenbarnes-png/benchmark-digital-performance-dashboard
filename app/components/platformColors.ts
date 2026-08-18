export const PLATFORM_COLORS: Record<string, string> = {
  Facebook: "#3b82f6", // blue
  Instagram: "#ec4899", // pink
  TikTok: "#14b8a6", // teal
  YouTube: "#ef4444", // red
};

export function platformColor(name: string): string {
  return PLATFORM_COLORS[name] ?? "#9ca3af";
}
