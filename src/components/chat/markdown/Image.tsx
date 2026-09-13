import { safeImageSrc } from "@/lib/markdown/safe-url";

export function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  const safe = safeImageSrc(src);
  if (!safe) {
    return <span className="md-image-fallback">{alt || "Image blocked"}</span>;
  }
  return (
    // User-provided remote/data URLs are not known at build time.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={safe} alt={alt || ""} className="md-image" loading="lazy" />
  );
}
