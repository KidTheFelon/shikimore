
export const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg 
    style={{ 
      width: `${size}px`, 
      height: `${size}px`,
      color: 'var(--text-muted)'
    }} 
    viewBox="0 0 20 20" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 19L14.65 14.65"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ExternalLinkIcon = () => (
  <svg className="anime-link-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10 2H14V6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 10L14 2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 9V14H2V2H7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ErrorIcon = () => (
  <svg className="status-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const EmptyIcon = () => (
  <svg className="status-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.5 3.5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v1a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h1v1zM4 4.5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H4z"/>
  </svg>
);

export const WindowMinimizeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const WindowMaximizeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M2 2h8v8H2z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const WindowCloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M3 3l6 6M9 3l-6 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
