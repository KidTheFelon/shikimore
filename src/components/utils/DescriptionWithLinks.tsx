import { useEffect, useRef, useState } from "react";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import CharacterPreviewPopup from "../ui/CharacterPreviewPopup";
import AnimePreviewPopup from "../ui/AnimePreviewPopup";
import { useCharacterPreview } from "../../hooks/useCharacterPreview";
import { useAnimePreview } from "../../hooks/useAnimePreview";

interface DescriptionWithLinksProps {
  description?: string;
  descriptionHtml?: string;
  onNavigate: (type: "anime" | "manga" | "characters", id: number) => void;
}

export default function DescriptionWithLinks({
  description,
  descriptionHtml,
  onNavigate,
}: DescriptionWithLinksProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const {
    previewData: characterData,
    loading: characterLoading,
    fetchCharacterPreview,
    clearPreview: clearCharacterPreview,
    cleanup: cleanupCharacter,
  } = useCharacterPreview();
  const {
    previewData: animeData,
    loading: animeLoading,
    fetchAnimePreview,
    clearPreview: clearAnimePreview,
    cleanup: cleanupAnime,
  } = useAnimePreview();
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState<
    "character" | "anime" | "manga" | null
  >(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const handleMouseEnterPopup = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleMouseLeavePopup = () => {
    setShowPopup(false);
    setPopupType(null);
    clearCharacterPreview();
    clearAnimePreview();
  };

  useEffect(() => {
    return () => {
      cleanupCharacter();
      cleanupAnime();
    };
  }, [cleanupCharacter, cleanupAnime]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleMouseOver = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;

      try {
        const url = new URL(href, window.location.origin);

        if (url.hostname.includes("shikimori")) {
          const pathParts = url.pathname.split("/").filter(Boolean);
          if (pathParts.length >= 2) {
            const type = pathParts[0];
            const slug = pathParts[1];
            // Extract ID from slug (e.g., "z121-fullmetal-alchemist" -> 121, "11-edward-elric" -> 11)
            const idMatch = slug.match(/\d+/);
            const id = idMatch ? parseInt(idMatch[0]) : NaN;
            if (!isNaN(id)) {
              const rect = (link as HTMLElement).getBoundingClientRect();

              // Calculate position with boundary checks
              const popupWidth = 320;
              const popupHeight = 400; // approximate
              const windowWidth = window.innerWidth;
              const windowHeight = window.innerHeight;

              let x = rect.right + 10;
              let y = rect.top;

              // Adjust if popup would go off screen right
              if (x + popupWidth > windowWidth) {
                x = rect.left - popupWidth - 10;
              }

              // Adjust if popup would go off screen bottom
              if (y + popupHeight > windowHeight) {
                y = windowHeight - popupHeight - 20;
              }

              // Ensure minimum y
              if (y < 10) {
                y = 10;
              }

              setPopupPosition({ x, y });
              setShowPopup(true);

              if (type === "characters") {
                setPopupType("character");
                fetchCharacterPreview(id);
              } else if (type === "animes") {
                setPopupType("anime");
                fetchAnimePreview(id, "anime");
              } else if (type === "mangas") {
                setPopupType("manga");
                fetchAnimePreview(id, "manga");
              }
            }
          }
        }
      } catch (err) {
        // Ignore invalid URLs
      }
    };

    const handleMouseOut = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = window.setTimeout(() => {
          setShowPopup(false);
          setPopupType(null);
          clearCharacterPreview();
          clearAnimePreview();
        }, 100);
      }
    };

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link) {
        e.preventDefault();
        e.stopPropagation();
        const href = link.getAttribute("href");
        if (!href) return;

        try {
          const url = new URL(href, window.location.origin);

          if (url.hostname.includes("shikimori")) {
            const pathParts = url.pathname.split("/").filter(Boolean);
            if (pathParts.length >= 2) {
              const type = pathParts[0];
              const slug = pathParts[1];
              // Extract ID from slug (e.g., "z121-fullmetal-alchemist" -> 121)
              const idMatch = slug.match(/\d+/);
              const id = idMatch ? parseInt(idMatch[0]) : NaN;

              if (!isNaN(id)) {
                if (type === "animes") {
                  onNavigate("anime", id);
                  return;
                } else if (type === "mangas") {
                  onNavigate("manga", id);
                  return;
                } else if (type === "characters") {
                  onNavigate("characters", id);
                  return;
                }
              }
            }
          }

          openUrl(href);
        } catch (err) {
          openUrl(href);
        }
        return;
      }

      const spoiler = target.closest(
        ".b-spoiler, .b-spoiler_block, .b-spoiler_inline",
      );
      if (!spoiler) return;

      spoiler.classList.toggle("is-expanded");
    };

    container.addEventListener("click", handleClick, false);
    container.addEventListener("mouseover", handleMouseOver, true);
    container.addEventListener("mouseout", handleMouseOut, true);

    return () => {
      container.removeEventListener("click", handleClick, false);
      container.removeEventListener("mouseover", handleMouseOver, true);
      container.removeEventListener("mouseout", handleMouseOut, true);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [
    description,
    descriptionHtml,
    onNavigate,
    fetchCharacterPreview,
    fetchAnimePreview,
    clearCharacterPreview,
    clearAnimePreview,
  ]);

  if (!description && !descriptionHtml) return null;

  return (
    <>
      <div
        ref={contentRef}
        dangerouslySetInnerHTML={{
          __html: descriptionHtml || description || "",
        }}
      />
      {popupType === "character" && (
        <CharacterPreviewPopup
          character={characterData}
          loading={characterLoading}
          position={popupPosition}
          visible={showPopup}
          onMouseEnter={handleMouseEnterPopup}
          onMouseLeave={handleMouseLeavePopup}
        />
      )}
      {(popupType === "anime" || popupType === "manga") && (
        <AnimePreviewPopup
          data={animeData}
          loading={animeLoading}
          position={popupPosition}
          visible={showPopup}
          onMouseEnter={handleMouseEnterPopup}
          onMouseLeave={handleMouseLeavePopup}
        />
      )}
    </>
  );
}
