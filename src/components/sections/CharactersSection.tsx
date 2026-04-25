import ImageWithSkeleton from "../ui/ImageWithSkeleton";
import HorizontalScroll from "../ui/HorizontalScroll";
import { getMarqueeParams } from "../../utils/marquee";
import { translateRole } from "../../utils/badgeTexts";
import type { CharacterRole } from "../../types";
import { useAccentColor } from "../../hooks/useAccentColor";
import styles from "./CharactersSection.module.css";

interface CharactersSectionProps {
  characterRoles: CharacterRole[];
  onNavigate: (type: "anime" | "manga" | "characters", id: number) => void;
}

export default function CharactersSection({ characterRoles, onNavigate }: CharactersSectionProps) {
  const { handleImageLoad, getColor } = useAccentColor();
  
  if (!characterRoles || characterRoles.length === 0) {
    return null;
  }

  return (
    <div className={styles.detailSection}>
      <h3 className={styles.detailSectionTitle}>Роли</h3>
      <HorizontalScroll className={styles.detailCharacters}>
        {characterRoles.slice(0, 30).map((role) => {
          const accentColor = role.character.id ? getColor(role.character.id) : 'transparent';
          
          return (
          <div 
            key={role.id} 
            className={`${styles.characterCard} ${styles.clickable}`}
            onClick={() => onNavigate("characters", role.character.id)}
            title={`${role.character.russian || role.character.name}`}
            style={{
              '--accent-color': accentColor,
            } as React.CSSProperties & { '--accent-color'?: string }}
          >
            <div className={styles.characterPosterWrapper}>
              {role.character.poster_url ? (
                <ImageWithSkeleton
                  src={role.character.poster_url}
                  alt={role.character.russian || role.character.name}
                  className={styles.characterPoster}
                  useCache={true}
                  onLoad={role.character.id ? (e) => handleImageLoad(e, role.character.id) : undefined}
                />
              ) : (
                <div className={styles.characterPosterPlaceholder}>Фото</div>
              )}
              {(() => {
                const allRoles = role.roles_ru && role.roles_ru.length > 0 
                  ? role.roles_ru.map(translateRole)
                  : (role.roles_en ? (role.roles_en as string[]).map(translateRole) : []);
                
                if (allRoles.length === 0) return null;
                const roleText = allRoles[0];
                const badgeParams = getMarqueeParams(roleText, 140, 11);

                return (
                  <div className={`roleBadge ${styles.roleBadge}`} title={allRoles.join(", ")}>
                    <div className={`roleMarqueeContainer ${badgeParams.isLong ? 'hasMarquee' : ''}`}>
                      <div className={`roleMarqueeInner ${badgeParams.isLong ? 'isMarquee' : ''}`} style={badgeParams.style}>
                        <div className={styles.roleText}>{roleText}</div>
                        {badgeParams.isLong && <div className={styles.roleText}>&nbsp;</div>}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className={styles.characterInfo}>
              {(() => {
                const name = role.character.russian || role.character.name;
                const nameParams = getMarqueeParams(name, 140, 8);
                
                return (
                  <div className={`characterNameContainer ${nameParams.isLong ? 'hasMarquee' : ''}`}>
                    <div className={`characterMarqueeInner ${nameParams.isLong ? 'isMarquee' : ''}`} style={nameParams.style}>
                      <div className={styles.characterName}>{name}</div>
                      {nameParams.isLong && <div className={styles.characterName}>&nbsp;</div>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          );
        })}
      </HorizontalScroll>
    </div>
  );
}
