import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export const TitleBar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`header ${scrolled ? "header-scrolled" : ""}`} data-tauri-drag-region>
      <div className="header-content" data-tauri-drag-region>
        <div className="header-text" data-tauri-drag-region>
          <h1 data-tauri-drag-region>SHIKIMORE</h1>
        </div>
      </div>
      
      <div className="window-controls">
        <button className="window-control-btn" onClick={() => appWindow.minimize()} title="Свернуть" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button className="window-control-btn" onClick={() => appWindow.toggleMaximize()} title="Развернуть" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
          </svg>
        </button>
        <button className="window-control-btn window-control-close" onClick={() => appWindow.close()} title="Закрыть" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </header>
  );
};
