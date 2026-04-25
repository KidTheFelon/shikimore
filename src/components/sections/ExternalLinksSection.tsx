import { open as openUrl } from "@tauri-apps/plugin-shell";
import { translateExternalLink } from "../../utils/badgeTexts";
import styles from "./ExternalLinksSection.module.css";

interface ExternalLink {
  id?: number;
  kind: string;
  url: string;
}

interface ExternalLinksSectionProps {
  externalLinks: ExternalLink[];
}

const formatExternalLink = (kind: string, url: string) => {
  const linkInfo = { label: translateExternalLink(kind) };
  let faviconUrl = "";
  try {
    const domain = new URL(url).hostname;
    faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch (e) {
    // ignore
  }

  return (
    <>
      <span className={styles.linkIcon}>
        {faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
            style={{ width: 14, height: 14, borderRadius: 2, display: 'block' }}
          />
        ) : null}
      </span>
      <span className={styles.linkLabel}>{linkInfo.label}</span>
    </>
  );
};

export default function ExternalLinksSection({ externalLinks }: ExternalLinksSectionProps) {
  if (!externalLinks || externalLinks.length === 0) {
    return null;
  }

  return (
    <div className={styles.detailSection}>
      <h3 className={styles.detailSectionTitle}>Внешние ссылки</h3>
      <div className={styles.detailExternalLinks}>
        {externalLinks.map((link) => (
          <a
            key={link.id || link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLinkBtn}
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
}
