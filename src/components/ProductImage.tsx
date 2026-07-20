import { Croissant } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getProductImageUrl, isStoragePath } from "@/lib/product-image-url";

export function ProductImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(() => (src && !isStoragePath(src) ? src : null));

  useEffect(() => {
    let alive = true;
    if (!src) { setUrl(null); return; }
    if (!isStoragePath(src)) { setUrl(src); return; }
    setUrl(null);
    getProductImageUrl(src).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [src]);

  if (!url) {
    return (
      <div className={cn("grid place-items-center bg-gradient-warm/30 text-primary", className)}>
        <Croissant className="h-10 w-10 opacity-60" />
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}
