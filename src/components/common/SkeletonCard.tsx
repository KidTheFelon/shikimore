import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="anime-item">
    <div className="skeleton skeleton-poster" />
    <div className="anime-content">
      <div className="skeleton skeleton-text short" />
      <div className="skeleton skeleton-text medium" />
      <div className="skeleton-meta">
        <div className="skeleton skeleton-badge" />
        <div className="skeleton skeleton-badge" />
      </div>
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text short" />
    </div>
  </div>
);
