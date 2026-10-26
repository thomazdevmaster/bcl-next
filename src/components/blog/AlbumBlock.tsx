"use client";

import { useEffect, useRef, useState } from "react";

import { EntityDialog } from "@/components/shared/EntityDialog";
import type { AlbumImage, AlbumLayout, MediaSize } from "@/domains/media/types";

const GALLERY_SPAN: Record<MediaSize, string> = {
  small: "col-span-1",
  medium: "col-span-1 sm:col-span-2",
  large: "col-span-2 sm:col-span-3",
};

interface AlbumBlockProps {
  images: AlbumImage[];
  layout: AlbumLayout;
  caption: string;
}

export function AlbumBlock({ images, layout, caption }: AlbumBlockProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const photos = images.filter((image) => image.src);
  const photoCount = photos.length;

  useEffect(() => {
    if (layout !== "carousel" || photoCount < 2 || galleryOpen || paused)
      return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setIndex((value) => (value + 1) % photoCount);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [layout, photoCount, galleryOpen, paused]);

  if (photos.length === 0) return null;
  const current = photos[Math.min(index, photos.length - 1)];

  const showPrevious = () => {
    setDirection(-1);
    setIndex((value) => (value - 1 + photos.length) % photos.length);
  };
  const showNext = () => {
    setDirection(1);
    setIndex((value) => (value + 1) % photos.length);
  };

  return (
    <figure className="m-0">
      {layout === "gallery" ? (
        <GalleryGrid photos={photos} />
      ) : layout === "carousel" ? (
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={(event) => {
            if (
              event.currentTarget.contains(event.relatedTarget as Node | null)
            )
              return;
            if (event.currentTarget.contains(document.activeElement)) return;
            setPaused(false);
          }}
          onFocus={() => setPaused(true)}
          onBlur={(event) => {
            if (
              event.currentTarget.contains(event.relatedTarget as Node | null)
            )
              return;
            setPaused(false);
          }}
        >
          <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-[var(--shadow-soft)]">
            <div className="relative aspect-video">
              <CarouselTrack
                photos={photos}
                index={Math.min(index, photos.length - 1)}
                direction={direction}
                onSwipe={showNext}
                onSwipeBack={showPrevious}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 to-transparent" />
              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="absolute top-1/2 left-3 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
                    aria-label="Foto anterior"
                    onClick={showPrevious}
                  >
                    <span className="material-icons" aria-hidden>
                      chevron_left
                    </span>
                  </button>
                  <button
                    type="button"
                    className="absolute top-1/2 right-3 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
                    aria-label="Próxima foto"
                    onClick={showNext}
                  >
                    <span className="material-icons" aria-hidden>
                      chevron_right
                    </span>
                  </button>
                </>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-2 px-3 pb-3">
                <p className="m-0 text-sm font-medium text-white">
                  {Math.min(index, photos.length - 1) + 1} / {photos.length}
                </p>
                {photos.length > 1 && photos.length <= 8 ? (
                  <div
                    className="flex items-center"
                    role="tablist"
                    aria-label="Fotos do carrossel"
                  >
                    {photos.map((image, photoIndex) => (
                      <button
                        key={`${image.src}-${photoIndex}`}
                        type="button"
                        role="tab"
                        aria-selected={photoIndex === index}
                        className="inline-flex h-11 w-8 items-center justify-center"
                        aria-label={image.alt || `Foto ${photoIndex + 1}`}
                        onClick={() => {
                          setDirection(0);
                          setIndex(photoIndex);
                        }}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${photoIndex === index ? "bg-white" : "bg-white/45"}`}
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--card-secondary)] px-4 text-sm font-medium text-[var(--foreground)]"
            onClick={() => setGalleryOpen(true)}
          >
            <span className="material-icons text-xl" aria-hidden>
              photo_library
            </span>
            Ver imagens
          </button>
        </div>
      ) : (
        <div>
          <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-black">
            <img
              src={current.src}
              alt={current.alt}
              className="mx-auto block h-auto max-h-[28rem] w-auto max-w-full"
            />
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute top-1/2 left-2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label="Foto anterior"
                  onClick={showPrevious}
                >
                  <span className="material-icons" aria-hidden>
                    chevron_left
                  </span>
                </button>
                <button
                  type="button"
                  className="absolute top-1/2 right-2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label="Próxima foto"
                  onClick={showNext}
                >
                  <span className="material-icons" aria-hidden>
                    chevron_right
                  </span>
                </button>
              </>
            ) : null}
          </div>
          {photos.length > 1 ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {photos.map((image, photoIndex) => (
                <button
                  key={`${image.src}-${photoIndex}`}
                  type="button"
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${photoIndex === index ? "border-[var(--primary)]" : "border-transparent"}`}
                  aria-label={image.alt || `Foto ${photoIndex + 1}`}
                  onClick={() => setIndex(photoIndex)}
                >
                  <img
                    src={image.src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {caption ? (
        <figcaption className="mt-2 text-sm text-[var(--muted)]">
          {caption}
        </figcaption>
      ) : null}
      {galleryOpen ? (
        <GalleryDialog
          photos={photos}
          caption={caption}
          onClose={() => setGalleryOpen(false)}
        />
      ) : null}
    </figure>
  );
}

function CarouselTrack({
  photos,
  index,
  direction,
  onSwipe,
  onSwipeBack,
}: {
  photos: AlbumImage[];
  index: number;
  direction: -1 | 0 | 1;
  onSwipe: () => void;
  onSwipeBack: () => void;
}) {
  const count = photos.length;
  const slides = count > 1 ? [photos[count - 1], ...photos, photos[0]] : photos;
  const [offset, setOffset] = useState(count > 1 ? 1 : 0);
  const [sliding, setSliding] = useState(true);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (count <= 1) {
      setOffset(0);
      return;
    }
    setSliding(true);
    setOffset((current) => {
      if (direction === 1 && index === 0) return count + 1;
      if (direction === -1 && index === count - 1) return 0;
      return index + 1;
    });
  }, [index, direction, count]);

  useEffect(() => {
    if (sliding) return;
    const frame = requestAnimationFrame(() => setSliding(true));
    return () => cancelAnimationFrame(frame);
  }, [sliding]);

  const settleClone = () => {
    if (offset === 0) {
      setSliding(false);
      setOffset(count);
    } else if (offset === count + 1) {
      setSliding(false);
      setOffset(1);
    }
  };

  return (
    <div
      className="h-full overflow-hidden"
      onPointerDown={(event) => {
        if (
          event.button !== 0 ||
          (event.target as HTMLElement).closest("button")
        )
          return;
        drag.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        if (!drag.current || count <= 1) return;
        const deltaX = event.clientX - drag.current.x;
        const deltaY = event.clientY - drag.current.y;
        drag.current = null;
        if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY))
          return;
        if (deltaX < 0) onSwipe();
        else onSwipeBack();
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <div
        className={`flex h-full ${sliding ? "transition-transform duration-500 ease-out motion-reduce:transition-none" : ""}`}
        style={{ transform: `translateX(-${offset * 100}%)` }}
        onTransitionEnd={(event) => {
          if (
            event.target !== event.currentTarget ||
            event.propertyName !== "transform"
          )
            return;
          settleClone();
        }}
      >
        {slides.map((image, slideIndex) => (
          <img
            key={`${image.src}-${slideIndex}`}
            src={image.src}
            alt={image.alt}
            className="h-full min-w-full shrink-0 basis-full object-cover"
          />
        ))}
      </div>
    </div>
  );
}

function GalleryGrid({ photos }: { photos: AlbumImage[] }) {
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((image, photoIndex) => (
        <img
          key={`${image.src}-${photoIndex}`}
          src={image.src}
          alt={image.alt}
          className={`${GALLERY_SPAN[image.size] ?? GALLERY_SPAN.medium} ${image.size === "large" ? "h-52 sm:h-64" : image.size === "small" ? "h-32 sm:h-40" : "h-40 sm:h-52"} w-full rounded-xl object-cover`}
        />
      ))}
    </div>
  );
}

function GalleryDialog({
  photos,
  caption,
  onClose,
}: {
  photos: AlbumImage[];
  caption: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <EntityDialog
      open
      title={caption.trim() || "Galeria de fotos"}
      size="xl"
      placement="bottom"
      onClose={onClose}
    >
      <div className="overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <GalleryGrid photos={photos} />
      </div>
    </EntityDialog>
  );
}
