import { getCurrentWindow } from "@tauri-apps/api/window";
import { WindowMinimizeIcon, WindowMaximizeIcon, WindowCloseIcon } from "./Icons";
import styles from "./Header.module.css";

interface HeaderProps {
  isScrolled: boolean;
  hasSelectedItem: boolean;
  onBackToList: () => void;
}

export default function Header({ isScrolled, hasSelectedItem, onBackToList }: HeaderProps) {
  const appWindow = getCurrentWindow();

  return (
    <header className={`${styles.header} ${(isScrolled || hasSelectedItem) ? styles.headerScrolled : ""}`} data-tauri-drag-region>
      <div className={styles.headerContent}>
        <div className={styles.headerText} onClick={onBackToList}>
          <h1 className={styles.title}>Shikimore</h1>
          {!isScrolled && !hasSelectedItem && (
            <p className={styles.subtitle}>
              Press <kbd>Ctrl+K</kbd> for quick search
            </p>
          )}
        </div>
      </div>
      <div className={styles.windowControls}>
        <button
          className={styles.windowControlBtn}
          onClick={(e) => {
            e.stopPropagation();
            appWindow.minimize().catch(console.error);
          }}
          title="Minimize"
          aria-label="Minimize"
        >
          <WindowMinimizeIcon />
        </button>
        <button
          className={styles.windowControlBtn}
          onClick={(e) => {
            e.stopPropagation();
            appWindow.toggleMaximize().catch(console.error);
          }}
          title="Maximize"
          aria-label="Maximize"
        >
          <WindowMaximizeIcon />
        </button>
        <button
          className={`${styles.windowControlBtn} ${styles.windowControlClose}`}
          onClick={(e) => {
            e.stopPropagation();
            appWindow.close().catch(console.error);
          }}
          title="Close"
          aria-label="Close"
        >
          <WindowCloseIcon />
        </button>
      </div>
    </header>
  );
}
