import { useState, useEffect } from 'react';

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    const history = localStorage.getItem("shikimore_search_history");
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch {
        // ignore
      }
    }
  }, []);

  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    setSearchHistory(prev => {
      const newHistory = [query, ...prev.filter(q => q !== query)].slice(0, 10);
      localStorage.setItem("shikimore_search_history", JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("shikimore_search_history");
  };

  return { searchHistory, setSearchHistory, addToHistory, clearHistory };
}
