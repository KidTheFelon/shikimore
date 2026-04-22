import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { handleApiError } from "../utils/api";
import { logger } from "../utils/logger";
import type { ContentType, AnimeDetail, MangaDetail, CharacterDetail, ContentItem } from "../types";

export function useDetail() {
  const [selectedItem, setSelectedItem] = useState<{ type: ContentType; id: number } | null>(null);
  const [detailData, setDetailData] = useState<AnimeDetail | MangaDetail | CharacterDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const handleContentClick = useCallback((item: ContentItem) => {
    const isAnime = "episodes" in item;
    const isManga = ("volumes" in item || "chapters" in item) && !isAnime;
    const isCharacter = "name" in item && !isAnime && !isManga && (("is_anime" in item) || ("is_manga" in item) || ("is_ranobe" in item));
    
    if (isAnime || isManga || isCharacter) {
      const type = isAnime ? "anime" : isManga ? "manga" : "characters";
      
      if (isAnime) {
        const basicDetail: AnimeDetail = {
          id: item.id,
          title: (item as any).title,
          url: (item as any).url,
          poster_url: (item as any).poster_url,
          description: (item as any).description,
          score: (item as any).score,
          kind: (item as any).kind,
          status: (item as any).status,
        } as AnimeDetail;
        setDetailData(basicDetail);
      } else if (isManga) {
        const basicDetail: MangaDetail = {
          id: item.id,
          title: (item as any).title,
          url: (item as any).url,
          poster_url: (item as any).poster_url,
          description: (item as any).description,
          score: (item as any).score,
          kind: (item as any).kind,
          status: (item as any).status,
        } as MangaDetail;
        setDetailData(basicDetail);
      } else {
        const basicDetail: CharacterDetail = {
          id: item.id,
          name: (item as any).name,
          russian: (item as any).russian,
          url: (item as any).url,
          poster_url: (item as any).poster_url,
          description: (item as any).description,
          synonyms: [],
          character_roles: [],
        } as CharacterDetail;
        setDetailData(basicDetail);
      }
      
      setSelectedItem({ type, id: item.id });
    }
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedItem(null);
    setDetailData(null);
    setDetailError(null);
  }, []);

  useEffect(() => {
    if (selectedItem) {
      setLoadingDetail(true);
      setDetailError(null);
      
      const fetchDetails = async () => {
        try {
          await logger.debug(`[Frontend] Fetching details for ${selectedItem.type} id=${selectedItem.id}`);
          let detail;
          if (selectedItem.type === "anime") {
            detail = await invoke<AnimeDetail>("get_anime_by_id", { id: selectedItem.id });
          } else if (selectedItem.type === "manga") {
            detail = await invoke<MangaDetail>("get_manga_by_id", { id: selectedItem.id });
          } else if (selectedItem.type === "characters") {
            detail = await invoke<CharacterDetail>("get_character_details", { id: selectedItem.id });
          }
          setDetailData(detail || null);
          await logger.debug(`[Frontend] Successfully fetched details for ${selectedItem.type} id=${selectedItem.id}`);
        } catch (err) {
          const errorMessage = handleApiError(err);
          await logger.error(`[Frontend] Error fetching details for ${selectedItem.type} id=${selectedItem.id}: ${errorMessage}`);
          setDetailError(errorMessage);
        } finally {
          setLoadingDetail(false);
        }
      };
      
      fetchDetails();
    }
  }, [selectedItem]);

  return {
    selectedItem,
    detailData,
    loadingDetail,
    detailError,
    handleContentClick,
    handleBackToList,
    setSelectedItem,
    setDetailData,
  };
}
