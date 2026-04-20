import { useRef, useEffect } from "react";
import { SearchIcon } from "./Icons";
import type { ContentType, SortOption } from "../types";
import styles from "./Search.module.css";

interface SearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  contentType: ContentType;
  onContentTypeChange: (type: ContentType) => void;
  kindFilter: string;
  onKindChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  searchHistory: string[];
  showHistory: boolean;
  onHistorySelect: (query: string) => void;
  onSearchFocus: () => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function Search({
  query,
  onQueryChange,
  contentType,
  onContentTypeChange,
  kindFilter,
  onKindChange,
  sortBy,
  onSortChange,
  searchHistory,
  showHistory,
  onHistorySelect,
  onSearchFocus,
  onSearchKeyDown
}: SearchProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close history when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        showHistory &&
        !target.closest(`.${styles.searchInputWrapper}`) &&
        !target.closest(`.${styles.searchHistory}`)
      ) {
        // This will be handled by parent component
      }
    };

    if (showHistory) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showHistory]);

  const getKindOptions = () => {
    if (contentType === "anime") {
      return [
        { value: "", label: "Все типы" },
        { value: "tv", label: "ТВ" },
        { value: "movie", label: "Фильм" },
        { value: "ova", label: "OVA" },
        { value: "ona", label: "ONA" },
        { value: "special", label: "Спешл" },
        { value: "music", label: "Музыка" },
        { value: "tv_13", label: "ТВ-13" },
        { value: "tv_24", label: "ТВ-24" },
        { value: "tv_48", label: "ТВ-48" },
      ];
    } else if (contentType === "manga") {
      return [
        { value: "", label: "Все типы" },
        { value: "manga", label: "Манга" },
        { value: "manhwa", label: "Манхва" },
        { value: "manhua", label: "Маньхуа" },
        { value: "novel", label: "Ранобэ" },
        { value: "one_shot", label: "Ваншот" },
        { value: "doujin", label: "Додзинси" },
      ];
    }
    return [];
  };

  return (
    <div className={styles.searchSection}>
      <div className={styles.contentTypeTabs}>
        <button
          className={`${styles.tabBtn} ${contentType === "anime" ? styles.active : ""}`}
          onClick={() => onContentTypeChange("anime")}
        >
          Аниме
        </button>
        <button
          className={`${styles.tabBtn} ${contentType === "manga" ? styles.active : ""}`}
          onClick={() => onContentTypeChange("manga")}
        >
          Манга
        </button>
        <button
          className={`${styles.tabBtn} ${contentType === "characters" ? styles.active : ""}`}
          onClick={() => onContentTypeChange("characters")}
        >
          Персонажи
        </button>
        <button
          className={`${styles.tabBtn} ${contentType === "people" ? styles.active : ""}`}
          onClick={() => onContentTypeChange("people")}
        >
          Люди
        </button>
      </div>

      <div className={styles.searchInputWrapper}>
        <div className={styles.searchInputContainer}>
          <SearchIcon size={18} />
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder={`Поиск ${contentType === "anime" ? "аниме" : contentType === "manga" ? "манги" : contentType === "characters" ? "персонажей" : "людей"}...`}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={onSearchFocus}
            onKeyDown={onSearchKeyDown}
          />
        </div>
        
        {showHistory && searchHistory.length > 0 && (
          <div className={styles.searchHistory}>
            <div className={styles.historyHeader}>Недавние поиски</div>
            {searchHistory.map((historyQuery, index) => (
              <div
                key={index}
                className={styles.historyItem}
                onClick={() => onHistorySelect(historyQuery)}
              >
                <SearchIcon size={16} />
                <span>{historyQuery}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.searchFilters}>
        {contentType !== "characters" && contentType !== "people" && (
          <select
            className={styles.filterSelect}
            value={kindFilter}
            onChange={(e) => onKindChange(e.target.value)}
          >
            {getKindOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        
        <select
          className={styles.sortSelect}
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
        >
          <option value="relevance">Релевантность</option>
          <option value="score">Рейтинг</option>
          <option value="title">Название</option>
        </select>
      </div>
    </div>
  );
}
