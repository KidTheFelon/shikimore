import { useState, useRef, useEffect } from "react";
import { getCachedImageUrl } from "../../utils/imageCache";
import styles from "./ImageWithSkeleton.module.css";

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  loading?: "lazy" | "eager";
  useCache?: boolean;
}

const ImageWithSkeleton = ({
  src,
  alt,
  className = "",
  onLoad,
  onError,
  loading = "lazy",
  useCache = true,
}: ImageWithSkeletonProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (useCache && src) {
      getCachedImageUrl(src).then((cachedUrl) => {
        setCurrentSrc(cachedUrl);
      });
    } else {
      setCurrentSrc(src);
    }
  }, [src, useCache]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    setIsLoaded(true);
    onError?.(e);
  };

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {!isLoaded && <div className={styles.skeleton} />}
      {hasError ? (
        <div className={styles.errorPlaceholder}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          className={`${styles.image} ${isLoaded ? styles.loaded : ""}`}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading}
        />
      )}
    </div>
  );
};

export default ImageWithSkeleton;
