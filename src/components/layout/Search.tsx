import { useRef, useEffect, useState } from "react";
import { SearchIcon, FilterIcon } from "../ui/Icons";
import type { ContentType, SortOption } from "../../types";
import styles from "./Search.module.css";

interface SearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  contentType: ContentType;
  kindFilter: string;
  onKindChange: (value: string) => void;
  genreFilter: string[];
  onGenreChange: (value: string) => void;
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
  genreFilter,
  onGenreChange,
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
  const historyCloseTimerRef = useRef<number | null>(null);
  const filterCloseTimerRef = useRef<number | null>(null);
  const filterScrollCloseTimerRef = useRef<number | null>(null);

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
        if (historyCloseTimerRef.current) {
          clearTimeout(historyCloseTimerRef.current);
        }
        historyCloseTimerRef.current = window.setTimeout(() => {
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
        if (filterCloseTimerRef.current) {
          clearTimeout(filterCloseTimerRef.current);
        }
        filterCloseTimerRef.current = window.setTimeout(() => {
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
        if (filterScrollCloseTimerRef.current) {
          clearTimeout(filterScrollCloseTimerRef.current);
        }
        filterScrollCloseTimerRef.current = window.setTimeout(() => {
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

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (historyCloseTimerRef.current) {
        clearTimeout(historyCloseTimerRef.current);
      }
      if (filterCloseTimerRef.current) {
        clearTimeout(filterCloseTimerRef.current);
      }
      if (filterScrollCloseTimerRef.current) {
        clearTimeout(filterScrollCloseTimerRef.current);
      }
    };
  }, []);

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

  const getGenreOptions = () => {
    if (contentType === "anime") {
      return [
        { value: "", label: "Все жанры" },
        { value: "1", label: "Экшен" },
        { value: "2", label: "Приключения" },
        { value: "4", label: "Комедия" },
        { value: "8", label: "Драма" },
        { value: "10", label: "Фэнтези" },
        { value: "14", label: "Ужасы" },
        { value: "7", label: "Мистика" },
        { value: "22", label: "Романтика" },
        { value: "24", label: "Sci-Fi" },
        { value: "36", label: "Повседневность" },
        { value: "30", label: "Спорт" },
        { value: "37", label: "Сверхъестественное" },
        { value: "41", label: "Триллер" },
        { value: "11", label: "Игры" },
        { value: "40", label: "Психологическое" },
        { value: "6", label: "Демоны" },
        { value: "9", label: "Этти" },
        { value: "12", label: "Хентай" },
        { value: "13", label: "Исторический" },
        { value: "16", label: "Магия" },
        { value: "19", label: "Музыка" },
        { value: "18", label: "Меха" },
        { value: "20", label: "Пародия" },
        { value: "21", label: "Самураи" },
        { value: "23", label: "Школа" },
        { value: "27", label: "Сёнен" },
        { value: "32", label: "Вампиры" },
        { value: "33", label: "Яой" },
        { value: "34", label: "Юри" },
        { value: "35", label: "Гарем" },
        { value: "31", label: "Супер сила" },
        { value: "38", label: "Военное" },
        { value: "15", label: "Детское" },
        { value: "3", label: "Машины" },
        { value: "17", label: "Боевые искусства" },
        { value: "5", label: "Безумие" },
        { value: "29", label: "Космос" },
        { value: "26", label: "Сёдзё-ай" },
        { value: "43", label: "Дзёсей" },
        { value: "28", label: "Сёнен-ай" },
        { value: "25", label: "Сёдзё" },
        { value: "42", label: "Сэйнэн" },
        { value: "39", label: "Полиция" },
        { value: "543", label: "Гурман" },
        { value: "541", label: "Работа" },
        { value: "539", label: "Эротика" },
      ];
    } else if (contentType === "manga") {
      return [
        { value: "", label: "Все жанры" },
        { value: "56", label: "Экшен" },
        { value: "68", label: "Приключения" },
        { value: "49", label: "Комедия" },
        { value: "50", label: "Драма" },
        { value: "57", label: "Фэнтези" },
        { value: "80", label: "Ужасы" },
        { value: "46", label: "Мистика" },
        { value: "62", label: "Романтика" },
        { value: "53", label: "Sci-Fi" },
        { value: "54", label: "Повседневность" },
        { value: "76", label: "Спорт" },
        { value: "48", label: "Сверхъестественное" },
        { value: "81", label: "Триллер" },
        { value: "79", label: "Игры" },
        { value: "67", label: "Психологическое" },
        { value: "72", label: "Демоны" },
        { value: "51", label: "Этти" },
        { value: "59", label: "Хентай" },
        { value: "69", label: "Исторический" },
        { value: "58", label: "Магия" },
        { value: "78", label: "Музыка" },
        { value: "83", label: "Меха" },
        { value: "86", label: "Пародия" },
        { value: "88", label: "Самураи" },
        { value: "60", label: "Школа" },
        { value: "47", label: "Сёнен" },
        { value: "64", label: "Вампиры" },
        { value: "65", label: "Яой" },
        { value: "75", label: "Юри" },
        { value: "71", label: "Гарем" },
        { value: "82", label: "Супер сила" },
        { value: "70", label: "Военное" },
        { value: "77", label: "Детское" },
        { value: "84", label: "Машины" },
        { value: "66", label: "Боевые искусства" },
        { value: "90", label: "Безумие" },
        { value: "85", label: "Космос" },
        { value: "73", label: "Сёдзё-ай" },
        { value: "87", label: "Дзёсей" },
        { value: "55", label: "Сёнен-ай" },
        { value: "63", label: "Сёдзё" },
        { value: "52", label: "Сэйнэн" },
        { value: "89", label: "Полиция" },
        { value: "544", label: "Гурман" },
        { value: "542", label: "Работа" },
        { value: "540", label: "Эротика" },
        { value: "61", label: "Додзинси" },
        { value: "74", label: "Смена пола" },
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
                if (filterCloseTimerRef.current) {
                  clearTimeout(filterCloseTimerRef.current);
                }
                filterCloseTimerRef.current = window.setTimeout(() => {
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
                    <div className={`${styles.dropdownOptions} ${styles.kindOptions}`}>
                      {getKindOptions().map((option) => (
                        <button
                          key={option.value}
                          className={`${styles.dropdownOption} ${kindFilter === option.value ? styles.dropdownOptionActive : ""}`}
                          onClick={() => {
                            onKindChange(option.value);
                            setIsDropdownClosing(true);
                            if (filterCloseTimerRef.current) {
                              clearTimeout(filterCloseTimerRef.current);
                            }
                            filterCloseTimerRef.current = window.setTimeout(() => {
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
                  <div className={styles.dropdownSection}>
                    <div className={styles.dropdownHeader}>Сортировка</div>
                    <div className={styles.dropdownOptions}>
                      {[
                        { value: "relevance", label: "Релевантность" },
                        { value: "score", label: "Рейтинг" },
                        { value: "title", label: "Название" },
                        { value: "popularity", label: "Популярность" },
                        { value: "aired_on", label: "Дата выхода" },
                        { value: "episodes", label: "Эпизоды" },
                        { value: "status", label: "Статус" },
                        { value: "id", label: "ID" },
                        { value: "created_at", label: "Дата создания" },
                        { value: "updated_at", label: "Дата обновления" },
                        { value: "random", label: "Случайно" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          className={`${styles.dropdownOption} ${sortBy === option.value ? styles.dropdownOptionActive : ""}`}
                          onClick={() => {
                            onSortChange(option.value as SortOption);
                            setIsDropdownClosing(true);
                            if (filterCloseTimerRef.current) {
                              clearTimeout(filterCloseTimerRef.current);
                            }
                            filterCloseTimerRef.current = window.setTimeout(() => {
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
                  <div className={styles.dropdownSection}>
                    <div className={styles.dropdownHeader}>Жанр</div>
                    <div className={`${styles.dropdownOptions} ${styles.genreOptions}`}>
                      {getGenreOptions().map((option) => (
                        <button
                          key={option.value}
                          className={`${styles.dropdownOption} ${genreFilter.includes(option.value) ? styles.dropdownOptionActive : ""}`}
                          onClick={() => {
                            onGenreChange(option.value);
                            setIsDropdownClosing(true);
                            if (filterCloseTimerRef.current) {
                              clearTimeout(filterCloseTimerRef.current);
                            }
                            filterCloseTimerRef.current = window.setTimeout(() => {
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
                </>
              )}
              {contentType === "characters" || contentType === "people" ? (
                <div className={styles.dropdownSection}>
                  <div className={styles.dropdownHeader}>Сортировка</div>
                  <div className={styles.dropdownOptions}>
                    {[
                      { value: "relevance", label: "Релевантность" },
                      { value: "score", label: "Рейтинг" },
                      { value: "title", label: "Название" },
                      { value: "id", label: "ID" },
                      { value: "created_at", label: "Дата создания" },
                      { value: "updated_at", label: "Дата обновления" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        className={`${styles.dropdownOption} ${sortBy === option.value ? styles.dropdownOptionActive : ""}`}
                        onClick={() => {
                          onSortChange(option.value as SortOption);
                          setIsDropdownClosing(true);
                          if (filterCloseTimerRef.current) {
                            clearTimeout(filterCloseTimerRef.current);
                          }
                          filterCloseTimerRef.current = window.setTimeout(() => {
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
              ) : null}
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
                onMouseDown={() => {
                  onHistorySelect(historyQuery);
                  setIsHistoryClosing(true);
                  if (historyCloseTimerRef.current) {
                    clearTimeout(historyCloseTimerRef.current);
                  }
                  historyCloseTimerRef.current = window.setTimeout(() => {
                    setIsHistoryClosing(false);
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
        {(kindFilter || genreFilter || sortBy !== "relevance") && (
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
            {contentType !== "characters" && contentType !== "people" && genreFilter.length > 0 && genreFilter.map(g => (
              <button
                key={g}
                className={styles.activeFilter}
                onClick={() => onGenreChange(g)}
              >
                Жанр: {getGenreOptions().find(opt => opt.value === g)?.label}
                <span className={styles.filterRemove}>×</span>
              </button>
            ))}
            {sortBy !== "relevance" && (
              <button
                className={styles.activeFilter}
                onClick={() => onSortChange("relevance")}
              >
                Сортировка: {
                  sortBy === "score" ? "Рейтинг" :
                  sortBy === "title" ? "Название" :
                  sortBy === "popularity" ? "Популярность" :
                  sortBy === "aired_on" ? "Дата выхода" :
                  sortBy === "episodes" ? "Эпизоды" :
                  sortBy === "status" ? "Статус" :
                  sortBy === "id" ? "ID" :
                  sortBy === "created_at" ? "Дата создания" :
                  sortBy === "updated_at" ? "Дата обновления" :
                  sortBy === "random" ? "Случайно" :
                  "Релевантность"
                }
                <span className={styles.filterRemove}>×</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
