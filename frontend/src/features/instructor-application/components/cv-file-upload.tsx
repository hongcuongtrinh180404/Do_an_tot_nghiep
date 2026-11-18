'use client';

import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import {
  ALLOWED_CV_EXTENSIONS,
  ALLOWED_CV_MIME_TYPES,
  MAX_CV_FILE_SIZE_BYTES,
} from '../instructor-application';
import styles from './become-instructor.module.css';

interface CvFileUploadProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function CvFileUpload({
  file,
  onFileSelect,
  error: externalError,
  disabled = false,
}: CvFileUploadProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const displayError = externalError || internalError;

  function validateAndSetFile(candidate: File): boolean {
    setInternalError(null);

    // Validate extension & mime
    const fileName = candidate.name.toLowerCase();
    const hasValidExt = ALLOWED_CV_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    const hasValidMime = candidate.type ? ALLOWED_CV_MIME_TYPES.includes(candidate.type) : true;

    if (!hasValidExt && !hasValidMime) {
      setInternalError('Định dạng tệp không hợp lệ. Vui lòng chỉ tải lên tài liệu PDF, DOC hoặc DOCX.');
      return false;
    }

    if (candidate.size > MAX_CV_FILE_SIZE_BYTES) {
      setInternalError('Kích thước tệp vượt quá 10MB. Vui lòng tối ưu hóa hoặc chọn tệp nhỏ hơn.');
      return false;
    }

    onFileSelect(candidate);
    return true;
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>): void {
    const selected = e.target.files?.[0];
    if (selected) {
      validateAndSetFile(selected);
    }
    // Reset input value so re-selecting same file triggers change
    e.target.value = '';
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isDragging) setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }

  function handleRemove(): void {
    if (disabled) return;
    setInternalError(null);
    onFileSelect(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div className={styles.cvUploadWrapper}>
      <input
        ref={inputRef}
        type="file"
        id="instructor-cv-input"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className={styles.visuallyHidden}
        onChange={handleInputChange}
        disabled={disabled}
        aria-describedby="cv-upload-hints"
      />

      {!file ? (
        <div
          className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''} ${
            displayError ? styles.dropzoneError : ''
          }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Tải lên tệp tài liệu CV hoặc sơ yếu lý lịch"
        >
          <div className={styles.dropzoneContent}>
            <div className={styles.dropzoneIconWrapper}>
              <Icon icon="lucide:file-up" className={styles.dropzoneIcon} />
            </div>
            <div className={styles.dropzoneText}>
              <span className={styles.dropzoneTitle}>
                Nhấp để tải lên hoặc kéo thả tệp CV vào đây
              </span>
              <span id="cv-upload-hints" className={styles.dropzoneSubtitle}>
                Chỉ chấp nhận tài liệu PDF, DOC, DOCX · Tối đa 10MB
              </span>
            </div>
            <button
              type="button"
              className={styles.browseButton}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <Icon icon="lucide:paperclip" />
              Chọn tệp từ thiết bị
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.fileCard}>
          <div className={styles.fileCardIcon}>
            <Icon icon="lucide:file-text" />
          </div>
          <div className={styles.fileCardDetails}>
            <span className={styles.fileCardName} title={file.name}>
              {file.name}
            </span>
            <div className={styles.fileCardMeta}>
              <span>{formatFileSize(file.size)}</span>
              <span className={styles.fileCardBadge}>
                <Icon icon="lucide:check-circle-2" /> Đã sẵn sàng tải lên
              </span>
            </div>
          </div>
          <div className={styles.fileCardActions}>
            <button
              type="button"
              className={styles.fileActionBtn}
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              title="Chọn tệp tài liệu khác"
            >
              Đổi tệp
            </button>
            <button
              type="button"
              className={`${styles.fileActionBtn} ${styles.fileRemoveBtn}`}
              onClick={handleRemove}
              disabled={disabled}
              title="Gỡ tệp này"
              aria-label={`Gỡ tệp ${file.name}`}
            >
              <Icon icon="lucide:trash-2" />
            </button>
          </div>
        </div>
      )}

      {displayError && (
        <p className={styles.fieldError} role="alert">
          <Icon icon="lucide:alert-circle" /> {displayError}
        </p>
      )}
    </div>
  );
}
