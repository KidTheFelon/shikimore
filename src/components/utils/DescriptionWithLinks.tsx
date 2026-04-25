import { useEffect, useRef } from "react";
import { open as openUrl } from "@tauri-apps/plugin-shell";

interface DescriptionWithLinksProps {
  description?: string;
  descriptionHtml?: string;
  onNavigate: (type: "anime" | "manga" | "characters", id: number) => void;
}

export default function DescriptionWithLinks({
  description,
  descriptionHtml,
  onNavigate
}: DescriptionWithLinksProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        const href = link.getAttribute('href');
        if (!href) return;
        
        try {
          const url = new URL(href, window.location.origin);
          
          if (url.hostname.includes('shikimori')) {
            const pathParts = url.pathname.split('/').filter(Boolean);
            if (pathParts.length >= 2) {
              const type = pathParts[0];
              const id = parseInt(pathParts[1]);
              
              if (!isNaN(id)) {
                if (type === 'animes') {
                  onNavigate('anime', id);
                  return;
                } else if (type === 'mangas') {
                  onNavigate('manga', id);
                  return;
                } else if (type === 'characters') {
                  onNavigate('characters', id);
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
      
      const spoiler = target.closest('.b-spoiler, .b-spoiler_block, .b-spoiler_inline');
      if (!spoiler) return;

      spoiler.classList.toggle('is-expanded');
    };

    container.addEventListener('click', handleClick, false);

    return () => {
      container.removeEventListener('click', handleClick, false);
    };
  }, [description, descriptionHtml, onNavigate]);

  if (!description && !descriptionHtml) return null;

  return (
    <div
      ref={contentRef}
      dangerouslySetInnerHTML={{ __html: descriptionHtml || description || '' }}
    />
  );
}
