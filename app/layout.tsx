import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import { requireBeaconUser } from "@/lib/beaconAuth";
import { canUseAdmin } from "@/lib/beaconSession";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Benchmark: Digital Campaign Manager",
  description: "Campaign hub for Labour MPs and candidates' digital activity",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Authoritative session check. proxy.ts only confirms a cookie exists; this
  // verifies it against Beacon and redirects if it is expired, revoked or
  // forged. Every page renders through this layout, so nothing is served
  // before it runs. No-ops unless BEACON_AUTH=on.
  const user = await requireBeaconUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar showAdmin={!user || canUseAdmin(user.role)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
