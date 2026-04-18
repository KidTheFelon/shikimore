import type { ContentItem } from "../types";
import styles from "./ContentBadges.module.css";
import {
  getItemType,
  getItemScore,
  getItemKind,
  getAnimeEpisodes,
  getAnimeEpisodesAired
} from "../utils/contentHelpers";
import { getKindText } from "../utils/badgeTexts";

interface ContentBadgesProps {
  item: ContentItem;
}

export default function ContentBadges({ item }: ContentBadgesProps) {
  const itemType = getItemType(item);
  const score = getItemScore(item);
  const kind = getKindText(getItemKind(item));
  const episodes = getAnimeEpisodes(item);
  const episodesAired = getAnimeEpisodesAired(item);

  // Don't show badges for characters and people
  if (itemType === "characters" || itemType === "people") {
    return null;
  }

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
      
      {/* Episodes badge */}
      {episodes && (
        <div className={styles.contentCardEpisodes}>
          {episodesAired || 0}/{episodes}
        </div>
      )}
    </>
  );
}
