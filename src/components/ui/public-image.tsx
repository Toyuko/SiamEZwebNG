import { cn } from "@/lib/utils";

type PublicImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Accepted for next/image-compatible call sites; unused (native img has no srcset). */
  sizes?: string;
  priority?: boolean;
};

/**
 * Serve files from `/public` as a normal `<img>`.
 * Vercel Image Optimization returns 402 without the paid add-on, so next/image
 * `/_next/image` URLs fail even when the original file is available.
 */
export function PublicImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  style,
  priority = false,
}: PublicImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static /public assets; skip Vercel image optimizer
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
      style={style}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );
}
