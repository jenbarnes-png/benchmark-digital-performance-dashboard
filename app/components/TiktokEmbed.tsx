"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    tiktokEmbed?: { lib: { render: (root?: HTMLElement) => void } };
  }
}

// TikTok's own oEmbed widget (the same one news sites use) — no API key,
// no scraping, just rendering a public video via TikTok's documented
// embed script. Shared across every embed on the page so it's only
// loaded once.
let scriptPromise: Promise<void> | null = null;
function loadTiktokEmbedScript(): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.tiktok.com/embed.js"]');
      if (existing) {
        if (window.tiktokEmbed) resolve();
        else existing.addEventListener("load", () => resolve());
        return;
      }
      const script = document.createElement("script");
      script.src = "https://www.tiktok.com/embed.js";
      script.async = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export default function TiktokEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadTiktokEmbedScript().then(() => {
      // The script only auto-scans the DOM on its own load — later-
      // mounted embeds (e.g. navigating between pages) need an explicit
      // re-scan, which TikTok's script exposes for exactly this case.
      if (!cancelled) window.tiktokEmbed?.lib.render(containerRef.current ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const videoId = url.match(/\/video\/(\d+)/)?.[1];

  return (
    <div ref={containerRef} className="overflow-hidden rounded-lg">
      <blockquote
        className="tiktok-embed"
        cite={url}
        data-video-id={videoId}
        style={{ maxWidth: "100%", minWidth: "260px", margin: 0 }}
      >
        <section />
      </blockquote>
    </div>
  );
}
