import { useRef, useEffect, useState } from "react";
import { SearchIcon, FilterIcon } from "./Icons";
import type { ContentType, SortOption } from "../types";
import styles from "./Search.module.css";

interface SearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  contentType: ContentType;
  kindFilter: string;
  onKindChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  searchHistory: string[];
  showHistory: boolean;
  onHistorySelect: (query: string) => void;
  onSearchFocus: () => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onHistoryClose?: () => void;
}

export default function Search({
  query,
  onQueryChange,
  contentType,
  kindFilter,
  onKindChange,
  sortBy,
  onSortChange,
  searchHistory,
  showHistory,
  onHistorySelect,
  onSearchFocus,
  onSearchKeyDown,
  onHistoryClose
}: SearchProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isDropdownClosing, setIsDropdownClosing] = useState(false);
  const [isHistoryClosing, setIsHistoryClosing] = useState(false);

  // Close history when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        showHistory &&
        !isHistoryClosing &&
        !target.closest(`.${styles.searchInputWrapper}`) &&
        !target.closest(`.${styles.searchHistory}`)
      ) {
        setIsHistoryClosing(true);
        setTimeout(() => {
          setIsHistoryClosing(false);
          onHistoryClose?.();
        }, 200);
      }
    };

    if (showHistory) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showHistory, isHistoryClosing, onHistoryClose]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        showFilterDropdown &&
        !isDropdownClosing &&
        !target.closest(`.${styles.filterDropdownWrapper}`) &&
        !target.closest(`.${styles.filterBtn}`)
      ) {
        setIsDropdownClosing(true);
        setTimeout(() => {
          setShowFilterDropdown(false);
          setIsDropdownClosing(false);
        }, 200);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showFilterDropdown, isDropdownClosing]);

  // Close filter dropdown on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (showFilterDropdown && !isDropdownClosing) {
        setIsDropdownClosing(true);
        setTimeout(() => {
          setShowFilterDropdown(false);
          setIsDropdownClosing(false);
        }, 200);
      }
    };

    if (showFilterDropdown) {
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [showFilterDropdown, isDropdownClosing]);

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
          <button
            className={styles.filterBtn}
            onClick={() => {
              if (showFilterDropdown) {
                setIsDropdownClosing(true);
                setTimeout(() => {
                  setShowFilterDropdown(false);
                  setIsDropdownClosing(false);
                }, 200);
              } else {
                setShowFilterDropdown(true);
              }
            }}
          >
            <FilterIcon size={18} />
          </button>
        </div>

        {showFilterDropdown && (
          <div className={styles.filterDropdownWrapper}>
            <div className={`${styles.filterDropdown} ${isDropdownClosing ? styles.closing : ""}`}>
              {contentType !== "characters" && contentType !== "people" && (
                <>
                  <div className={styles.dropdownSection}>
                    <div className={styles.dropdownHeader}>Тип</div>
                    <div className={styles.dropdownOptions}>
                      {getKindOptions().map((option) => (
                        <button
                          key={option.value}
                          className={`${styles.dropdownOption} ${kindFilter === option.value ? styles.dropdownOptionActive : ""}`}
                          onClick={() => {
                            onKindChange(option.value);
                            setIsDropdownClosing(true);
                            setTimeout(() => {
                              setShowFilterDropdown(false);
                              setIsDropdownClosing(false);
                            }, 200);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.dropdownDivider} />
                </>
              )}
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownHeader}>Сортировка</div>
                <div className={styles.dropdownOptions}>
                  {[
                    { value: "relevance", label: "Релевантность" },
                    { value: "score", label: "Рейтинг" },
                    { value: "title", label: "Название" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      className={`${styles.dropdownOption} ${sortBy === option.value ? styles.dropdownOptionActive : ""}`}
                      onClick={() => {
                        onSortChange(option.value as SortOption);
                        setIsDropdownClosing(true);
                        setTimeout(() => {
                          setShowFilterDropdown(false);
                          setIsDropdownClosing(false);
                        }, 200);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showHistory && searchHistory.length > 0 && (
          <div className={`${styles.searchHistory} ${isHistoryClosing ? styles.closing : ""}`}>
            <div className={styles.historyHeader}>Недавние поиски</div>
            {searchHistory.map((historyQuery, index) => (
              <div
                key={index}
                className={styles.historyItem}
                onClick={() => {
                  setIsHistoryClosing(true);
                  setTimeout(() => {
                    setIsHistoryClosing(false);
                    onHistorySelect(historyQuery);
                  }, 200);
                }}
              >
                <SearchIcon size={16} />
                <span>{historyQuery}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.searchFilters}>
        {(kindFilter || sortBy !== "relevance") && (
          <div className={styles.activeFilters}>
            {contentType !== "characters" && contentType !== "people" && kindFilter && (
              <button
                className={styles.activeFilter}
                onClick={() => onKindChange("")}
              >
                Тип: {getKindOptions().find(opt => opt.value === kindFilter)?.label}
                <span className={styles.filterRemove}>×</span>
              </button>
            )}
            {sortBy !== "relevance" && (
              <button
                className={styles.activeFilter}
                onClick={() => onSortChange("relevance")}
              >
                Сортировка: {sortBy === "score" ? "Рейтинг" : sortBy === "title" ? "Название" : "Релевантность"}
                <span className={styles.filterRemove}>×</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
