/**
 * Shared between server and client code, so it lives here rather than in
 * lib/rankings.ts — importing a *value* from that module into a client
 * component pulls the Postgres driver into the browser bundle and the build
 * fails on "Can't resolve 'fs'". (A type-only import is fine; it is erased.)
 */

/** The ?period= value that selects the all-time view. */
export const ALL_TIME = "all";
