import React from 'react';
import { open as openUrl } from "@tauri-apps/plugin-shell";
import type { ContentItem, AppSettings } from '../types';
import { ExternalLinkIcon, CopyIcon } from './icons';
import { ScoreBadge } from './common/ScoreBadge';
import { MarqueeText } from './common/MarqueeText';
import { formatKind, formatStatus } from '../utils/formatters';

interface ContentCardProps {
  item: ContentItem;
  settings: AppSettings | null;
  cardColor?: string;
  onItemClick: (item: ContentItem) => void;
  onCopyLink: (e: React.MouseEvent, url: string) => void;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement, Event>, id: number) => void;
  innerRef?: (el: HTMLDivElement | null) => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  settings,
  cardColor,
  onItemClick,
  onCopyLink,
  onImageLoad,
  innerRef,
}) => {
  const prefLang = settings?.preferred_language || "russian";
  const russianTitle = "russian" in item ? item.russian : undefined;
  const originalTitle = "title" in item ? item.title : "name" in item ? item.name : "";

  const displayTitle = (prefLang === "russian"
    ? (russianTitle || originalTitle)
    : (originalTitle || russianTitle)) || "";

  const subTitle = (displayTitle === russianTitle ? originalTitle : russianTitle) || "";

  const url = "url" in item ? item.url : undefined;
  const posterUrl = "poster_url" in item ? item.poster_url : undefined;
  const score = "score" in item ? item.score : undefined;

  const episodes = "episodes" in item ? item.episodes : undefined;
  const aired = "episodes_aired" in item ? item.episodes_aired : undefined;

  return (
    <div
      ref={innerRef}
      className="anime-item"
      role="listitem"
      onClick={() => onItemClick(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onItemClick(item);
        }
      }}
      tabIndex={0}
      aria-label={`${displayTitle}, ${score ? `рейтинг ${score.toFixed(1)}` : "без рейтинга"}`}
    >
      <div className="anime-poster-wrapper">
        <ScoreBadge score={score} variant="card" />
        
        {("kind" in item) && item.kind && (
          <div className="anime-card-kind">
            {formatKind(item.kind as string)}
          </div>
        )}

        {("episodes" in item) && (typeof aired === 'number' || item.status === "ongoing") && (aired !== undefined || episodes !== undefined) && (
          <div
            className="anime-card-episodes"
            style={{ background: cardColor || 'rgba(40, 40, 60, 0.85)' }}
          >
            {typeof aired === 'number' ? `${aired} / ${episodes || "?"} эп.` : `${episodes || "?"} эп.`}
          </div>
        )}

        {posterUrl ? (
          <img
            src={posterUrl}
            alt={displayTitle}
            className="anime-poster"
            loading="lazy"
            onLoad={(e) => onImageLoad(e, item.id)}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const placeholder = target.nextElementSibling as HTMLElement;
              if (placeholder) placeholder.style.display = 'flex';
            }}
          />
        ) : null}
        <div className="anime-poster-placeholder" style={{ display: posterUrl ? 'none' : 'flex' }}>
          Нет изображения
        </div>
      </div>

      <div className="anime-content">
        <MarqueeText text={displayTitle} tag="h3" className="anime-title" />
        {subTitle && (
          <MarqueeText text={subTitle} tag="p" className="anime-russian" />
        )}

        <div className="anime-meta-simple">
          {("kind" in item || "status" in item) && (
            <span>
              {item.kind ? formatKind(item.kind) : ""}
              {item.kind && item.status ? " • " : ""}
              {item.status ? formatStatus(item.status) : ""}
              {("episodes" in item) && (episodes || typeof aired === 'number') ? (
                <>
                  {" • "}
                  {typeof aired === 'number'
                    ? `${aired} / ${episodes || "?"} эп.`
                    : `${episodes || "?"} эп.`}
                </>
              ) : null}
              {("chapters" in item) && item.chapters ? ` • ${item.chapters} гл.` : null}
            </span>
          )}
        </div>

        {url && (
          <div className="anime-actions">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="anime-link"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openUrl(url);
              }}
              title="Открыть на Shikimori"
              aria-label="Открыть на Shikimori"
            >
              Открыть на Shikimori
              <ExternalLinkIcon />
            </a>
            <button
              onClick={(e) => onCopyLink(e, url)}
              className="copy-link-btn"
              title="Копировать ссылку"
              aria-label="Копировать ссылку"
            >
              <CopyIcon />
            </button>
          </div>
        )}
        {"website" in item && item.website && (
          <div className="anime-actions">
            <a
              href={item.website}
              target="_blank"
              rel="noopener noreferrer"
              className="anime-link"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openUrl(item.website as string);
              }}
              title="Официальный сайт"
            >
              Официальный сайт
              <ExternalLinkIcon />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
