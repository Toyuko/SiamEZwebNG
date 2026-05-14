/** Extract YouTube video ID from common watch, Shorts, embed, and youtu.be URLs. */
export function youtubeVideoIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? id.split("?")[0] : null;
    }

    if (!host.includes("youtube.com")) return null;

    const fromQuery = u.searchParams.get("v");
    if (fromQuery) return fromQuery;

    const parts = u.pathname.split("/").filter(Boolean);
    const shortsI = parts.indexOf("shorts");
    if (shortsI !== -1 && parts[shortsI + 1]) {
      return parts[shortsI + 1].split("?")[0] || null;
    }
    const embedI = parts.indexOf("embed");
    if (embedI !== -1 && parts[embedI + 1]) {
      return parts[embedI + 1].split("?")[0] || null;
    }
    const liveI = parts.indexOf("live");
    if (liveI !== -1 && parts[liveI + 1]) {
      return parts[liveI + 1].split("?")[0] || null;
    }
  } catch {
    return null;
  }
  return null;
}

export function youtubeThumbnailUrl(videoId: string, quality: "hq" | "mq" = "mq"): string {
  const name = quality === "hq" ? "hqdefault" : "mqdefault";
  return `https://img.youtube.com/vi/${videoId}/${name}.jpg`;
}

export function youtubeEmbedUrl(videoId: string, autoplay: boolean): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    ...(autoplay ? { autoplay: "1" } : {}),
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}
