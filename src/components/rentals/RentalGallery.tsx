import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RentalGalleryProps {
  images: string[];
  title: string;
}

export const RentalGallery = ({ images, title }: RentalGalleryProps) => {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const total = images.length;

  const prev = useCallback(() => setActive((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setActive((i) => (i + 1) % total), [total]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen, prev, next]);

  if (total === 0) return null;

  return (
    <>
      {/* Hlavní galerie */}
      <div className="mb-8">
        {/* Desktop: velká fotka vlevo + 2x2 mřížka vpravo */}
        <div className="hidden md:grid grid-cols-2 gap-2 aspect-[2/1]">
          {/* Velká fotka vlevo */}
          <div className="relative group overflow-hidden bg-muted">
            <img
              src={images[0]}
              alt={`${title} - foto 1`}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => { setActive(0); setLightboxOpen(true); }}
            />
          </div>

          {/* Pravá mřížka 2x2 */}
          <div className="grid grid-cols-2 grid-rows-2 gap-2">
            {[1, 2, 3, 4].map((idx) => {
              const img = images[idx];
              const isLast = idx === 4;
              const hasMore = total > 5;
              return (
                <div key={idx} className="relative overflow-hidden bg-muted">
                  {img ? (
                    <img
                      src={img}
                      alt={`${title} - foto ${idx + 1}`}
                      className="w-full h-full object-cover cursor-zoom-in"
                      onClick={() => { setActive(idx); setLightboxOpen(true); }}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  {isLast && img && (
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-2 bg-background text-foreground text-[11px] tracking-[0.18em] uppercase font-medium border border-border hover:bg-foreground hover:text-background transition"
                    >
                      <Grid3x3 className="h-3.5 w-3.5" />
                      View all ({total})
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: jedna fotka + miniatury */}
        <div className="md:hidden space-y-2">
          <div className="relative group overflow-hidden bg-muted aspect-[4/3]">
            <img
              src={images[active]}
              alt={`${title} - foto ${active + 1}`}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
            />
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Předchozí foto"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-background/80 hover:bg-background text-foreground shadow-md backdrop-blur-sm transition"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Další foto"
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-background/80 hover:bg-background text-foreground shadow-md backdrop-blur-sm transition"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-2 bg-background text-foreground text-[11px] tracking-[0.18em] uppercase font-medium border border-border"
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              {active + 1} / {total}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm font-medium">
              {active + 1} / {total}
            </span>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Zavřít"
              className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Obrázek */}
          <div
            className="flex-1 flex items-center justify-center px-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {total > 1 && (
              <button
                type="button"
                onClick={prev}
                aria-label="Předchozí foto"
                className="absolute left-4 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
            )}
            <img
              src={images[active]}
              alt={`${title} - foto ${active + 1}`}
              className="max-h-[80vh] max-w-full object-contain"
            />
            {total > 1 && (
              <button
                type="button"
                onClick={next}
                aria-label="Další foto"
                className="absolute right-4 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            )}
          </div>

          {/* Miniatury v lightboxu */}
          {total > 1 && (
            <div
              className="px-4 py-3 overflow-x-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-2 justify-center min-w-min">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    className={cn(
                      "flex-shrink-0 h-14 w-20 rounded overflow-hidden transition border-2",
                      active === i ? "border-white" : "border-transparent opacity-50 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
