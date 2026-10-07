// Pure session lookup shared by proxy.ts and lib/beaconAuth.ts. Kept free of
// next/headers so the proxy can import it too.
export const SESSION_COOKIE = "beacon_session";

const BEACON_API_URL =
  process.env.BEACON_API_URL ?? "https://api.project-beacon.co.uk";

export type BeaconUser = {
  email: string;
  name: string | null;
  role: "client" | "staff" | "admin";
};

/** Admin / Data Entry is for Beacon staff and admins only, not clients. */
export function canUseAdmin(role: BeaconUser["role"]): boolean {
  return role === "staff" || role === "admin";
}

/**
 * Ask Beacon whether a session token is valid. Not cached: the answer is
 * per-user and can change the moment someone is deactivated. Fails closed.
 */
export async function fetchBeaconUser(token: string): Promise<BeaconUser | null> {
  try {
    const res = await fetch(`${BEACON_API_URL}/api/auth/me`, {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { signedIn?: boolean; user?: BeaconUser };
    return data.signedIn && data.user ? data.user : null;
  } catch {
    return null;
  }
}
