// Facebook's own public Page Plugin iframe — no SDK/app ID needed for
// displaying a public post, same "official embed, no auth" category as
// the TikTok and Instagram embeds.
export default function FacebookEmbed({ url }: { url: string }) {
  const src = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500`;
  return (
    <div className="overflow-hidden rounded-lg bg-white">
      <iframe
        src={src}
        width="100%"
        height={500}
        style={{ border: "none", overflow: "hidden" }}
        scrolling="no"
        loading="lazy"
        title="Facebook post"
      />
    </div>
  );
}
