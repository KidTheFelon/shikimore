import type { ContentItem } from "../types";
import styles from "./ContentBadges.module.css";
import {
  getItemType,
  getItemScore,
  getItemKind,
  getAnimeEpisodes,
  getAnimeEpisodesAired,
  getItemStatus
} from "../utils/contentHelpers";
import { getKindText } from "../utils/badgeTexts";

interface ContentBadgesProps {
  item: ContentItem;
}

export default function ContentBadges({ item }: ContentBadgesProps) {
  const itemType = getItemType(item);
  const score = getItemScore(item);
  const kind = getKindText(getItemKind(item));
  const kindRaw = getItemKind(item);
  const episodes = getAnimeEpisodes(item);
  const episodesAired = getAnimeEpisodesAired(item);
  const status = getItemStatus(item);

  // Don't show badges for characters and people
  if (itemType === "characters" || itemType === "people") {
    return null;
  }

  // Calculate aired episodes: for released anime, aired = total; for ongoing, use actual aired if available
  const displayedAired = status === "released" ? episodes : episodesAired;

  // Check if episodes are completed and should show green badge
  const isCompleted = displayedAired && displayedAired === episodes && 
    (kindRaw === 'tv' || kindRaw === 'ona' || (episodes && episodes >= 2));

  // Show episodes badge for anime types (tv, ona, ova, etc) even if episodes is null
  const shouldShowEpisodes = itemType === "anime" && (episodes || kindRaw === 'tv' || kindRaw === 'ona' || kindRaw === 'ova');

  return (
    <>
      {/* Score badge */}
      {score && (
        <div className={`${styles.contentCardScore} ${score >= 9 ? styles.highScore : ''}`}>
          {score}
        </div>
      )}

      {/* Kind badge */}
      {kind && (
        <div className={styles.contentCardKind}>
          {kind}
        </div>
      )}

      {/* Episodes badge - show for anime types even if episodes is null */}
      {shouldShowEpisodes && (
        <div className={`${styles.contentCardEpisodes} ${isCompleted ? styles.completed : ''}`}>
          {episodes
            ? (displayedAired ? `${displayedAired}/${episodes}` : `?/${episodes}`)
            : '?'
          }
        </div>
      )}
    </>
  );
}
