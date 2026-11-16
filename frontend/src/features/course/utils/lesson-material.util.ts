import type { ILessonMaterial } from 'share-lib';

export interface MaterialFileConfig {
  icon: string;
  colorClass: string;
  tagText: string;
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function getMaterialFileConfig(
  fileName: string,
  mimeType?: string | null,
): MaterialFileConfig {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf' || mimeType?.includes('pdf')) {
    return {
      icon: 'lucide:file-text',
      colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      tagText: 'PDF',
    };
  }
  if (
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) ||
    mimeType?.includes('zip') ||
    mimeType?.includes('rar')
  ) {
    return {
      icon: 'lucide:archive',
      colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      tagText: ext.toUpperCase() || 'ZIP',
    };
  }
  if (['doc', 'docx'].includes(ext) || mimeType?.includes('word')) {
    return {
      icon: 'lucide:file-text',
      colorClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      tagText: 'DOCX',
    };
  }
  if (
    ['xls', 'xlsx', 'csv'].includes(ext) ||
    mimeType?.includes('excel') ||
    mimeType?.includes('spreadsheet')
  ) {
    return {
      icon: 'lucide:file-spreadsheet',
      colorClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      tagText: 'EXCEL',
    };
  }
  if (
    ['ppt', 'pptx'].includes(ext) ||
    mimeType?.includes('presentation') ||
    mimeType?.includes('powerpoint')
  ) {
    return {
      icon: 'lucide:presentation',
      colorClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      tagText: 'PPTX',
    };
  }

  return {
    icon: 'lucide:file',
    colorClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    tagText: ext.toUpperCase() || 'FILE',
  };
}

export function shouldShowMaterialIndicator(
  isVideo: boolean,
  materials?: readonly ILessonMaterial[] | null,
): boolean {
  return isVideo && Array.isArray(materials) && materials.length > 0;
}
