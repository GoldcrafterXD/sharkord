import { FullScreenImage } from '@/components/fullscreen-image/content';
import { Skeleton } from '@sharkord/ui';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OverrideLayout } from './layout';
import { LinkOverride } from './link';

const MAX_CONCURRENT_IMAGE_LOADS = 4;
const imageLoadQueue: Array<() => void> = [];
let activeImageLoads = 0;

const acquireImageSlot = () =>
  new Promise<() => void>((resolve) => {
    const release = () => {
      activeImageLoads = Math.max(0, activeImageLoads - 1);
      const next = imageLoadQueue.shift();
      if (next) next();
    };

    const grant = () => {
      activeImageLoads += 1;
      resolve(release);
    };

    if (activeImageLoads < MAX_CONCURRENT_IMAGE_LOADS) {
      grant();
    } else {
      imageLoadQueue.push(grant);
    }
  });

type TImageOverrideProps = {
  src: string;
  alt?: string;
  title?: string;
};

const ImageOverride = memo(({ src, alt }: TImageOverrideProps) => {
  const MAX_HEIGHT = '18.75rem'; // tailwind max-h-75
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasSlot, setHasSlot] = useState(false);
  const [releaseSlot, setReleaseSlot] = useState<(() => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const onLoad = useCallback(
    async (event: React.SyntheticEvent<HTMLImageElement>) => {
      try {
        // decode to avoid layout jank once the image is ready
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        event.currentTarget.decode?.();
      } catch {
        // ignore decode failures
      }

      setLoading(false);
      // @ts-expect-error - green what is your problem green what is your problem me say alone ramp
      event.target.style.opacity = 1;

      if (releaseSlot) {
        releaseSlot();
        setReleaseSlot(null);
      }
    },
    [releaseSlot]
  );

  const onError = useCallback(() => {
    setError(true);
    if (releaseSlot) {
      releaseSlot();
      setReleaseSlot(null);
    }
  }, [releaseSlot]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      {
        // Start loading before the image is on screen to reduce reflow
        rootMargin: '5000px'
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isVisible && !hasSlot && !releaseSlot) {
      void acquireImageSlot().then((release) => {
        if (cancelled) {
          release();
          return;
        }

        setReleaseSlot(() => release);
        setHasSlot(true);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [hasSlot, isVisible, releaseSlot]);

  useEffect(() => {
    return () => {
      if (releaseSlot) {
        releaseSlot();
      }
    };
  }, [releaseSlot]);

  const canRenderImage = useMemo(
    () => isVisible && hasSlot && !error,
    [error, hasSlot, isVisible]
  );

  useEffect(() => {
    if (!canRenderImage || aspectRatio) return;

    let cancelled = false;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (cancelled) return;
      const ratio =
        img.naturalWidth && img.naturalHeight
          ? img.naturalWidth / img.naturalHeight
          : 1;
      setAspectRatio(ratio);
    };

    return () => {
      cancelled = true;
    };
  }, [aspectRatio, canRenderImage, src]);

  if (error) return null;

  return (
    <OverrideLayout>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: '100%',
          aspectRatio: aspectRatio ?? 1,
          maxHeight: MAX_HEIGHT
        }}
      >
        {!canRenderImage ? (
          <Skeleton className="w-full h-full max-h-75" />
        ) : (
          <FullScreenImage
            src={src}
            alt={alt}
            onLoad={onLoad}
            onError={onError}
            className="max-w-full max-h-75 object-contain object-left w-fit"
            style={{
              opacity: loading ? 0 : 1,
              aspectRatio: aspectRatio ?? 1,
              maxHeight: MAX_HEIGHT
            }}
            crossOrigin="anonymous"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        )}
      </div>

      {canRenderImage && !loading && (
        <LinkOverride link={src} label="Open in new tab" />
      )}
    </OverrideLayout>
  );
});

export { ImageOverride };
