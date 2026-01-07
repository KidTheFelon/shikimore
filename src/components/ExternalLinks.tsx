import React from 'react';
import { open as openUrl } from "@tauri-apps/plugin-shell";
import type { ExternalLink } from '../types';
import { ExternalLinkIcon, TwitterIcon, YoutubeIcon } from './icons';

interface ExternalLinksProps {
  links: ExternalLink[];
}

export const ExternalLinks: React.FC<ExternalLinksProps> = ({ links }) => {
  const formatExternalLink = (kind: string, url: string) => {
    const names: Record<string, { label: string; icon?: React.ReactNode }> = {
      official_site: { label: "Офиц. сайт", icon: <ExternalLinkIcon size={14} /> },
      wikipedia: { label: "Википедия" },
      anime_news_network: { label: "ANN" },
      myanimelist: { label: "MyAnimeList" },
      anime_db: { label: "AniDB" },
      world_art: { label: "World Art" },
      kinopoisk: { label: "Кинопоиск" },
      kage_project: { label: "Kage Project" },
      twitter: { label: "Twitter", icon: <TwitterIcon size={14} /> },
      kinopoisk_hd: { label: "Кинопоиск HD" },
      shikimori: { label: "Shikimori" },
      fandom: { label: "Fandom" },
      youtube: { label: "YouTube", icon: <YoutubeIcon size={14} /> },
      facebook: { label: "Facebook" },
      instagram: { label: "Instagram" },
    };

    const linkInfo = names[kind] || { label: kind };
    let faviconUrl = "";
    try {
      const domain = new URL(url).hostname;
      faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (e) {
      // ignore
    }

    return (
      <>
        <span className="link-icon">
          {linkInfo.icon ? (
            linkInfo.icon
          ) : faviconUrl ? (
            <img 
              src={faviconUrl} 
              alt="" 
              style={{ width: 14, height: 14, borderRadius: 2, display: 'block' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
        </span>
        <span className="link-label">{linkInfo.label}</span>
      </>
    );
  };

  return (
    <div className="detail-section">
      <h3 className="detail-section-title">Внешние ссылки</h3>
      <div className="detail-external-links">
        {links.map((link) => (
          <a
            key={link.id || link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link-btn"
            onClick={(e) => {
              e.preventDefault();
              openUrl(link.url);
            }}
          >
            {formatExternalLink(link.kind, link.url)}
          </a>
        ))}
      </div>
    </div>
  );
};
