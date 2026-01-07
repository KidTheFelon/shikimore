import React from 'react';
import { AnimeIcon, MangaIcon, SettingsIcon } from './icons';
import { ContentType } from '../App';

interface FloatingTabsProps {
  contentType: ContentType;
  selectedItem: any;
  handleContentTypeChange: (type: ContentType) => void;
  setShowSettings: (show: boolean) => void;
}

export const FloatingTabs: React.FC<FloatingTabsProps> = ({
  contentType,
  selectedItem,
  handleContentTypeChange,
  setShowSettings,
}) => {
  return (
    <div className="floating-tabs-container">
      <div className="floating-tabs-glass liquid-glass">
        {!selectedItem && (
          <>
            <button
              className={`floating-tab ${contentType === "anime" ? "active" : ""}`}
              onClick={() => handleContentTypeChange("anime")}
              type="button"
              title="Аниме"
            >
              <AnimeIcon />
              <span className="tab-label">Аниме</span>
            </button>
            <button
              className={`floating-tab ${contentType === "manga" ? "active" : ""}`}
              onClick={() => handleContentTypeChange("manga")}
              type="button"
              title="Манга"
            >
              <MangaIcon />
              <span className="tab-label">Манга</span>
            </button>
          </>
        )}
        <button
          className="floating-tab"
          onClick={() => setShowSettings(true)}
          type="button"
          title="Настройки"
        >
          <SettingsIcon />
          <span className="tab-label">Настройки</span>
        </button>
      </div>
    </div>
  );
};
