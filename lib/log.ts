// Plain, timestamped log lines for scripts, e.g. "2026-10-15 10:19:02 INFO  crete-sync  Reading Facebook posts".
// When a script runs on GitHub, these lines appear in the run's log (Actions tab); locally they print to the terminal.
// Never pass a key, password or token to these functions.
function stamp() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
export const log = {
  info: (operation: string, message: string) => console.log(`${stamp()} INFO  ${operation.padEnd(12)} ${message}`),
  warn: (operation: string, message: string) => console.warn(`${stamp()} WARN  ${operation.padEnd(12)} ${message}`),
  error: (operation: string, message: string) => console.error(`${stamp()} ERROR ${operation.padEnd(12)} ${message}`),
};
