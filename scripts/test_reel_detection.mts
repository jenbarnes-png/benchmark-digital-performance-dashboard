// Checks which post types count as Reels. Run: npm run test:reels
import { isReel } from "../lib/crete";

const cases: [string, Parameters<typeof isReel>[0], string | null, boolean][] = [
  ["Facebook Reel", "facebook", "Reel", true],
  ["Facebook ordinary post", "facebook", "Post", false],
  ["Facebook video is not counted as a Reel", "facebook", "Video", false],
  ["Instagram Reel (old label)", "instagram", "Reel", true],
  ["Instagram Video (new label) counts as a Reel", "instagram", "Video", true],
  ["Instagram photo", "instagram", "Photo", false],
  ["Instagram carousel", "instagram", "Carousel", false],
  ["Missing type", "instagram", null, false],
];
let failed = 0;
for (const [name, platform, type, expected] of cases) {
  const ok = isReel(platform, type) === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
}
console.log(failed ? `\n${failed} FAILED.` : "\nAll cases passed.");
process.exitCode = failed ? 1 : 0;
