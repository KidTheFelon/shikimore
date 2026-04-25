import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { UserRateSimple, CreateUserRateRequest, UpdateUserRateRequest } from '../../types';
import { handleApiError } from '../../utils/api';
import { getCachedUserRate, invalidateUserRate } from '../../utils/userRateCache';
import { STATUS_OPTIONS, MANGA_STATUS_OPTIONS } from '../../utils/constants';
import StarRating from '../ui/StarRating';
import InteractiveStarRating from '../ui/InteractiveStarRating';
import ConfirmDialog from '../ui/ConfirmDialog';
import styles from './UserRateEditor.module.css';

interface UserRateEditorProps {
  targetId: number;
  targetType: 'Anime' | 'Manga';
  userId: number;
  isAnime: boolean;
  totalEpisodes?: number;
  totalChapters?: number;
  totalVolumes?: number;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
}

export default function UserRateEditor({
  targetId,
  targetType,
  userId,
  isAnime,
  totalEpisodes,
  totalChapters,
  totalVolumes,
  onUnsavedChangesChange,
}: UserRateEditorProps) {
  const [userRate, setUserRate] = useState<UserRateSimple | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showEditor, setShowEditor] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [formData, setFormData] = useState({
    score: 0,
    hoverScore: null as number | null,
    status: '',
    episodes: '',
    chapters: '',
    volumes: '',
    text: '',
  });

  const statusOptions = useMemo(() => isAnime ? STATUS_OPTIONS : MANGA_STATUS_OPTIONS, [isAnime]);

  const hasUnsavedChanges = useMemo(() => {
    if (!userRate) {
      return formData.score > 0 || formData.status || formData.episodes || formData.chapters || formData.volumes || formData.text;
    }
    return (
      formData.score !== (userRate.score ? parseFloat(userRate.score) : 0) ||
      formData.status !== (userRate.status || '') ||
      formData.episodes !== (userRate.episodes?.toString() || '') ||
      formData.chapters !== (userRate.chapters?.toString() || '') ||
      formData.volumes !== (userRate.volumes?.toString() || '') ||
      formData.text !== (userRate.text || '')
    );
  }, [formData, userRate]);

  useEffect(() => {
    onUnsavedChangesChange?.(!!hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  const displayScore = formData.hoverScore !== null ? formData.hoverScore : formData.score;

  const getScoreText = useCallback((score: number) => {
    if (score === 1) return 'Ужасно';
    if (score === 2) return 'Очень плохо';
    if (score === 3) return 'Плохо';
    if (score === 4) return 'Ниже среднего';
    if (score === 5) return 'Средне';
    if (score === 6) return 'Выше среднего';
    if (score === 7) return 'Хорошо';
    if (score === 8) return 'Очень хорошо';
    if (score === 9) return 'Отлично';
    if (score === 10) return 'Эпик вин!';
    return '';
  }, []);

  const loadUserRate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[UserRateEditor] Loading user rate for', { targetId, targetType, userId });
      const rate = await getCachedUserRate(targetId, targetType);
      console.log('[UserRateEditor] Loaded user rate:', rate);
      setUserRate(rate);
      if (rate) {
        setFormData({
          score: rate.score ? parseFloat(rate.score) : 0,
          hoverScore: null,
          status: rate.status || '',
          episodes: rate.episodes?.toString() || '',
          chapters: rate.chapters?.toString() || '',
          volumes: rate.volumes?.toString() || '',
          text: rate.text || '',
        });
      } else {
        setFormData({
          score: 0,
          hoverScore: null,
          status: '',
          episodes: '',
          chapters: '',
          volumes: '',
          text: '',
        });
      }
    } catch (err) {
      console.error('[UserRateEditor] Failed to load user rate:', err);
      setError(handleApiError(err));
      setUserRate(null);
    } finally {
      setLoading(false);
    }
  }, [targetId, targetType, userId]);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (isAnime && totalEpisodes && formData.episodes) {
      const eps = parseInt(formData.episodes, 10);
      if (isNaN(eps) || eps < 0) {
        errors.episodes = 'Эпизоды не могут быть отрицательными';
      } else if (eps > totalEpisodes) {
        errors.episodes = `Максимум ${totalEpisodes} эпизодов`;
      }
    }

    if (!isAnime && totalChapters && formData.chapters) {
      const ch = parseInt(formData.chapters, 10);
      if (isNaN(ch) || ch < 0) {
        errors.chapters = 'Главы не могут быть отрицательными';
      } else if (ch > totalChapters) {
        errors.chapters = `Максимум ${totalChapters} глав`;
      }
    }

    if (!isAnime && totalVolumes && formData.volumes) {
      const vol = parseInt(formData.volumes, 10);
      if (isNaN(vol) || vol < 0) {
        errors.volumes = 'Томы не могут быть отрицательными';
      } else if (vol > totalVolumes) {
        errors.volumes = `Максимум ${totalVolumes} томов`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, isAnime, totalEpisodes, totalChapters, totalVolumes]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);
    setValidationErrors({});
    try {
      if (userRate) {
        // Update existing rate
        const updateRequest: UpdateUserRateRequest = {
          score: formData.score > 0 ? formData.score.toString() : undefined,
          status: formData.status || undefined,
          episodes: isAnime ? (formData.episodes || undefined) : undefined,
          chapters: !isAnime ? (formData.chapters || undefined) : undefined,
          volumes: !isAnime ? (formData.volumes || undefined) : undefined,
          text: formData.text || undefined,
        };
        const updated = await invoke<UserRateSimple>('update_user_rate', {
          id: userRate.id,
          request: updateRequest,
        });
        setUserRate(updated);
        invalidateUserRate(targetId, targetType);
      } else {
        // Create new rate
        const createRequest: CreateUserRateRequest = {
          user_id: userId,
          target_id: targetId,
          target_type: targetType,
          score: formData.score > 0 ? formData.score.toString() : undefined,
          status: formData.status || undefined,
          episodes: isAnime ? (formData.episodes || undefined) : undefined,
          chapters: !isAnime ? (formData.chapters || undefined) : undefined,
          volumes: !isAnime ? (formData.volumes || undefined) : undefined,
          text: formData.text || undefined,
        };
        const created = await invoke<UserRateSimple>('create_user_rate', {
          request: createRequest,
        });
        setUserRate(created);
        invalidateUserRate(targetId, targetType);
      }
      setShowEditor(false);
    } catch (err) {
      console.error('Failed to save user rate:', err);
      setError(handleApiError(err));
    } finally {
      setSaving(false);
    }
  }, [validateForm, userRate, formData, isAnime, targetId, targetType, userId, invalidateUserRate]);

  const handleCloseEditor = useCallback(() => {
    if (hasUnsavedChanges) {
      setCloseConfirmOpen(true);
    } else {
      setShowEditor(false);
    }
  }, [hasUnsavedChanges]);

  const handleCloseConfirmed = useCallback(() => {
    setCloseConfirmOpen(false);
    setShowEditor(false);
  }, []);

  const handleCloseCancelled = useCallback(() => {
    setCloseConfirmOpen(false);
  }, []);

  const handleDelete = useCallback(async () => {
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!userRate) return;

    setSaving(true);
    setError(null);
    try {
      await invoke('delete_user_rate', { id: userRate.id });
      setUserRate(null);
      setFormData({
        score: 0,
        hoverScore: null,
        status: '',
        episodes: '',
        chapters: '',
        volumes: '',
        text: '',
      });
      invalidateUserRate(targetId, targetType);
      setShowEditor(false);
    } catch (err) {
      console.error('Failed to delete user rate:', err);
      setError(handleApiError(err));
    } finally {
      setSaving(false);
    }
  }, [userRate, targetId, targetType, invalidateUserRate]);

  const handleDeleteCancelled = useCallback(() => {
    setDeleteConfirmOpen(false);
  }, []);

  useEffect(() => {
    loadUserRate();
  }, [loadUserRate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showEditor) return;

      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (hasUnsavedChanges) {
          setCloseConfirmOpen(true);
        } else {
          setShowEditor(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showEditor, hasUnsavedChanges, handleSave]);

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleButton}
        onClick={() => setShowEditor(!showEditor)}
      >
        {userRate ? (
          <>
            <span className={styles.currentRate}>
              <StarRating score={userRate.score ? parseFloat(userRate.score) : null} size={16} />
              {' '} / {statusOptions.find(s => s.value === userRate.status)?.label || userRate.status}
            </span>
            <span className={styles.editLabel}>Изменить</span>
          </>
        ) : (
          <span className={styles.addLabel}>+ Добавить в список</span>
        )}
      </button>

      {showEditor && (
        <div className={styles.editor}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.mainFields}>
            <div className={styles.field}>
              <label>Оценка</label>
              <div className={styles.sliderRating}>
                <InteractiveStarRating
                  value={formData.score > 0 ? formData.score : null}
                  onChange={(val) => setFormData(prev => ({ ...prev, score: val }))}
                  onHover={(val) => setFormData(prev => ({ ...prev, hoverScore: val }))}
                  size={32}
                />
                <div className={styles.ratingValue}>
                  <span className={styles.currentScore}>{displayScore}</span>
                  <span className={styles.scoreText}>{getScoreText(displayScore)}</span>
                </div>
              </div>
            </div>

            {(isAnime && totalEpisodes) && (
              <div className={styles.field}>
                <div className={styles.episodesField}>
                  <label>Эпизоды</label>
                  <div className={styles.episodesInput}>
                    <input
                      type="number"
                      min="0"
                      max={totalEpisodes}
                      value={formData.episodes}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, episodes: e.target.value }));
                        setValidationErrors(prev => ({ ...prev, episodes: '' }));
                      }}
                      className={`${styles.input} ${validationErrors.episodes ? styles.inputError : ''}`}
                      placeholder="0"
                    />
                    <span className={styles.episodesTotal}>/ {totalEpisodes}</span>
                  </div>
                  {validationErrors.episodes && (
                    <div className={styles.fieldError}>{validationErrors.episodes}</div>
                  )}
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label>Статус</label>
              <div className={styles.statusChips}>
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip} ${formData.status === opt.value ? styles.chipActive : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, status: prev.status === opt.value ? '' : opt.value }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(!isAnime && totalChapters) && (
            <div className={styles.field}>
              <label>Главы</label>
              <div className={styles.episodesInput}>
                <input
                  type="number"
                  min="0"
                  max={totalChapters}
                  value={formData.chapters}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, chapters: e.target.value }));
                    setValidationErrors(prev => ({ ...prev, chapters: '' }));
                  }}
                  className={`${styles.input} ${validationErrors.chapters ? styles.inputError : ''}`}
                  placeholder="0"
                />
                <span className={styles.episodesTotal}>/ {totalChapters}</span>
              </div>
              {validationErrors.chapters && (
                <div className={styles.fieldError}>{validationErrors.chapters}</div>
              )}
            </div>
          )}

          {(!isAnime && totalVolumes) && (
            <div className={styles.field}>
              <label>Томы</label>
              <div className={styles.episodesInput}>
                <input
                  type="number"
                  min="0"
                  max={totalVolumes}
                  value={formData.volumes}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, volumes: e.target.value }));
                    setValidationErrors(prev => ({ ...prev, volumes: '' }));
                  }}
                  className={`${styles.input} ${validationErrors.volumes ? styles.inputError : ''}`}
                  placeholder="0"
                />
                <span className={styles.episodesTotal}>/ {totalVolumes}</span>
              </div>
              {validationErrors.volumes && (
                <div className={styles.fieldError}>{validationErrors.volumes}</div>
              )}
            </div>
          )}

          <button
            type="button"
            className={styles.commentToggle}
            onClick={() => setShowComment(!showComment)}
          >
            {showComment ? '− Скрыть комментарий' : '+ Добавить комментарий'}
          </button>

          {showComment && (
            <div className={styles.field}>
              <textarea
                value={formData.text}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                className={styles.textarea}
                rows={3}
                placeholder="Ваш комментарий..."
              />
            </div>
          )}

          <div className={styles.actions}>
            {userRate && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className={styles.deleteButton}
                title="Удалить оценку"
              >
                🗑
              </button>
            )}
            <button
              type="button"
              onClick={handleCloseEditor}
              disabled={saving}
              className={styles.cancelButton}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? '...' : 'Сохранить'}{hasUnsavedChanges && !saving && ' *'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={closeConfirmOpen}
        title="Несохраненные изменения"
        message="Есть несохраненные изменения. Закрыть без сохранения?"
        confirmText="Закрыть"
        cancelText="Отмена"
        onConfirm={handleCloseConfirmed}
        onCancel={handleCloseCancelled}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Удалить оценку?"
        message="Вы уверены, что хотите удалить эту оценку?"
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDeleteConfirmed}
        onCancel={handleDeleteCancelled}
        destructive
      />
    </div>
  );
}
