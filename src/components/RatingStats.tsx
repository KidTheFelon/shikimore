import React from 'react';

interface ScoreStat {
  score: number;
  count: number;
}

interface RatingStatsProps {
  stats: ScoreStat[];
  onClose: () => void;
}

export const RatingStats: React.FC<RatingStatsProps> = ({ stats, onClose }) => {
  const maxCount = Math.max(...stats.map((s) => s.count));

  return (
    <div className="rating-stats-popup" onClick={(e) => e.stopPropagation()}>
      <div className="rating-stats-header">
        <h3>Статистика оценок</h3>
      </div>
      <div className="detail-stats">
        {[...stats].sort((a, b) => b.score - a.score).map((stat) => (
          <div key={stat.score} className="stat-item">
            <span className="stat-score">{stat.score}</span>
            <div className="stat-bar-wrapper">
              <div
                className="stat-bar"
                style={{
                  width: `${(stat.count / maxCount) * 100}%`,
                }}
              />
            </div>
            <span className="stat-count">{stat.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
