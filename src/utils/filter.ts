import type { ContentItem } from "../types";

export function filterByExactMatch(items: ContentItem[], query: string): ContentItem[] {
  if (!query) return items;

  const queryLower = query.toLowerCase();
  const words = queryLower.trim().split(/\s+/);
  const isSingleWord = words.length === 1;

  return items.filter(item => {
    const title = (item as any).title?.toLowerCase() || "";
    const russian = (item as any).russian?.toLowerCase() || "";

    const titles = [title, russian];

    if (isSingleWord) {
      return titles.some(t => t.includes(queryLower));
    } else {
      return titles.some(t => {
        return words.every(word => t.includes(word));
      });
    }
  });
}
