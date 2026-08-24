"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

// Instagram's own oEmbed widget — same pattern as TiktokEmbed.tsx.
let scriptPromise: Promise<void> | null = null;
function loadInstagramEmbedScript(): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.instagram.com/embed.js"]');
      if (existing) {
        if (window.instgrm) resolve();
        else existing.addEventListener("load", () => resolve());
        return;
      }
      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export default function InstagramEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadInstagramEmbedScript().then(() => {
      // Instagram's script only auto-scans on its own load — later-
      // mounted embeds need an explicit re-scan.
      if (!cancelled) window.instgrm?.Embeds.process();
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div ref={containerRef} className="overflow-hidden rounded-lg [&_iframe]:!min-w-0">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{ margin: 0, maxWidth: "100%", minWidth: "260px" }}
      />
    </div>
  );
}
