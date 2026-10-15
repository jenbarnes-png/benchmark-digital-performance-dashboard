// Reads a required setting from the environment, or stops with a message that
// says what is missing, why that matters and how to fix it. Never prints the value:
// settings here are often passwords or keys.
export function requireEnv(name: string, whatItIsFor: string, whereToGetIt: string): string {
  const value = process.env[name];
  if (value) return value;
  throw new Error(
    [
      `Missing setting: ${name}`,
      `  What failed:  this needs ${name}, which is ${whatItIsFor}.`,
      `  Why:          it isn't set in this environment (the file .env.local on your computer, or Vercel / GitHub secrets online).`,
      `  How to fix:   ${whereToGetIt} Then add it to .env.local as ${name}=... (see .env.example), and re-run.`,
    ].join("\n")
  );
}

/** A number setting with a safe default, e.g. a limit that can be raised without editing code. */
export function numberEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Setting ${name} must be a positive number, but it is "${raw}". Fix it in .env.local, or remove it to use the default (${defaultValue}).`);
  }
  return n;
}
