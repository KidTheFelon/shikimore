import { useState, useEffect, useCallback, useRef } from "react";
import ImageWithSkeleton from "../ui/ImageWithSkeleton";
import HorizontalScroll from "../ui/HorizontalScroll";
import VideoKindChip from "../chips/VideoKindChip";
import YouTubePlayer from "../ui/YouTubePlayer";
import WebViewPlayer from "../ui/WebViewPlayer";
import type { Video } from "../../types";
import { translateVideoKind } from "../../utils/badgeTexts";
import { VIDEO_PLACEHOLDER } from "../../utils/constants";
import { getMarqueeParams } from "../../utils/marquee";
import styles from "./VideosSection.module.css";

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getVideoSource = (url?: string) => {
  if (!url) {
    return 'Unknown';
  }

  // Add protocol if URL is protocol-relative
  const fullUrl = url.startsWith('//') ? `https:${url}` : url;

  if (fullUrl.includes('youtube.com') || fullUrl.includes('youtu.be')) return 'YouTube';
  if (fullUrl.includes('vk.com')) return 'VK';
  if (fullUrl.includes('vimeo.com')) return 'Vimeo';
  if (fullUrl.includes('dailymotion.com')) return 'Dailymotion';
  if (fullUrl.includes('twitch.tv')) return 'Twitch';
  if (fullUrl.includes('sibnet.ru')) return 'Sibnet';

  // Extract domain for unknown sources
  try {
    const domain = new URL(fullUrl).hostname.replace('www.', '').toUpperCase();
    return domain;
  } catch {
    return 'Video';
  }
};

const getVideoThumbnail = (video: Video) => {
  if (video.image_url) return video.image_url;
  
  const videoUrl = video.player_url || video.url;
  if (videoUrl) {
    const youtubeId = getYoutubeId(videoUrl);
    if (youtubeId) {
      return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
    }
  }
  
  return VIDEO_PLACEHOLDER;
};

const getVideoKindColor = (kind?: string) => {
  const colors: Record<string, { bg: string; border: string }> = {
    pv: { bg: "rgba(139, 92, 246, 0.9)", border: "rgba(139, 92, 246, 0.3)" },
    character_trailer: { bg: "rgba(59, 130, 246, 0.9)", border: "rgba(59, 130, 246, 0.3)" },
    cm: { bg: "rgba(251, 146, 60, 0.9)", border: "rgba(251, 146, 60, 0.3)" },
    op: { bg: "rgba(34, 197, 94, 0.9)", border: "rgba(34, 197, 94, 0.3)" },
    ed: { bg: "rgba(239, 68, 68, 0.9)", border: "rgba(239, 68, 68, 0.3)" },
    op_ed_clip: { bg: "rgba(168, 85, 247, 0.9)", border: "rgba(168, 85, 247, 0.3)" },
    clip: { bg: "rgba(245, 158, 11, 0.9)", border: "rgba(245, 158, 11, 0.3)" },
    other: { bg: "rgba(107, 114, 128, 0.9)", border: "rgba(107, 114, 128, 0.3)" },
    episode_preview: { bg: "rgba(236, 72, 153, 0.9)", border: "rgba(236, 72, 153, 0.3)" },
  };
  return kind ? colors[kind] || colors.other : colors.other;
};

interface VideosSectionProps {
  videos: Video[];
}

export default function VideosSection({ videos }: VideosSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const selectedVideo = selectedIndex !== null ? videos[selectedIndex] : null;

  const closeViewer = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const goToNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < videos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  }, [selectedIndex, videos.length]);

  const goToPrev = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "Escape") closeViewer();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, goToNext, goToPrev, closeViewer]);

  // Scroll carousel to selected thumbnail
  useEffect(() => {
    if (selectedIndex !== null && carouselRef.current) {
      const thumbnails = carouselRef.current.children;
      const activeThumbnail = thumbnails[selectedIndex] as HTMLElement;
      if (activeThumbnail) {
        activeThumbnail.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center"
        });
      }
    }
  }, [selectedIndex]);

  if (!videos || videos.length === 0) {
    return null;
  }

  const handleVideoClick = (index: number) => {
    setSelectedIndex(index);
  };

  const getVideoPlayerData = (video: Video) => {
    const videoUrl = video.player_url || video.url;
    if (!videoUrl) return null;
    const youtubeId = getYoutubeId(videoUrl);
    if (youtubeId) {
      return { id: youtubeId, isYoutube: true };
    } else {
      const fullUrl = videoUrl.startsWith('//') ? `https:${videoUrl}` : videoUrl;
      return { id: fullUrl, isYoutube: false };
    }
  };

  const playerData = selectedVideo ? getVideoPlayerData(selectedVideo) : null;

  // Prepare thumbnails for player
  const thumbnails = videos.map(v => ({ id: String(v.id), src: getVideoThumbnail(v) }));

  return (
    <>
      {playerData && playerData.isYoutube && (
        <YouTubePlayer
          videoId={playerData.id}
          onClose={closeViewer}
          onNext={goToNext}
          onPrev={goToPrev}
          canGoNext={selectedIndex !== null && selectedIndex < videos.length - 1}
          canGoPrev={selectedIndex !== null && selectedIndex > 0}
          thumbnails={thumbnails}
          currentIndex={selectedIndex || 0}
          onThumbnailClick={handleVideoClick}
        />
      )}
      {playerData && !playerData.isYoutube && (
        <WebViewPlayer
          url={playerData.id}
          onClose={closeViewer}
          onNext={goToNext}
          onPrev={goToPrev}
          canGoNext={selectedIndex !== null && selectedIndex < videos.length - 1}
          canGoPrev={selectedIndex !== null && selectedIndex > 0}
          thumbnails={thumbnails}
          currentIndex={selectedIndex || 0}
          onThumbnailClick={handleVideoClick}
        />
      )}
      <div className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>Видео</h3>
        <HorizontalScroll className={styles.detailVideos}>
          {videos.map((video) => (
            <div
              key={video.id}
              className={styles.videoCard}
              onClick={() => handleVideoClick(videos.indexOf(video))}
            >
            <div className={styles.videoThumbnailContainer}>
              <ImageWithSkeleton
                src={getVideoThumbnail(video)}
                alt={video.name || "Видео"}
                className={styles.videoThumbnail}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = VIDEO_PLACEHOLDER;
                }}
                useCache={true}
              />
              {video.kind && (() => {
                const colors = getVideoKindColor(video.kind);
                const label = translateVideoKind(video.kind);
                if (!label) return null;
                return (
                  <VideoKindChip
                    kind={video.kind}
                    label={label}
                    backgroundColor={colors.bg}
                    borderColor={colors.border}
                  />
                );
              })()}
              <div className={styles.videoOverlay}>
                <div className={styles.playButton}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className={styles.videoInfo}>
              {video.name && (() => {
                const nameParams = getMarqueeParams(video.name, 280, 13.6, undefined, '500');
                return (
                  <div className={`videoNameContainer ${nameParams.isLong ? 'hasMarquee' : ''}`}>
                    <div className={`${styles.videoName} videoNameMarqueeInner ${nameParams.isLong ? 'isMarquee' : ''}`} style={nameParams.style} title={video.name}>
                      {video.name}
                      {nameParams.isLong && <>&nbsp;{video.name}</>}
                    </div>
                  </div>
                );
              })()}
              <div className={styles.videoSource}>
                {getVideoSource(video.player_url || video.url)}
              </div>
            </div>
          </div>
        ))}
      </HorizontalScroll>
    </div>
    </>
  );
}
