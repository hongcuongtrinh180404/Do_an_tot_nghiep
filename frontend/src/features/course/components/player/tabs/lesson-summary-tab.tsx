'use client';

import React, { useState, useMemo } from 'react';
import type { ILessonSummaryData, ILessonSummaryKeyPoint } from 'share-lib';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useLessonSummaryQuery,
  useGenerateSummaryMutation,
  useUpdateSummaryMutation,
} from '@/features/course/api/transcript-analysis.api';
import { TimestampPickerInput } from '../timestamp-picker-input';

interface LessonSummaryTabProps {
  lessonId: string;
  isInstructor?: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (timestamp: number) => void;
}

function formatTime(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '00:00';
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}


export function LessonSummaryTab({
  lessonId,
  isInstructor = false,
  currentTime = 0,
  duration = 0,
  onSeek,
}: LessonSummaryTabProps): React.JSX.Element {
  const { data: summaryDoc, isLoading } = useLessonSummaryQuery(lessonId);
  const { mutate: generateSummary, isPending: isGenerating } = useGenerateSummaryMutation(lessonId);
  const { mutate: updateSummary, isPending: isUpdating } = useUpdateSummaryMutation(lessonId);

  // Dữ liệu tóm tắt chính thức (fallback về draftSummary nếu có từ trước)
  const currentSummaryData: ILessonSummaryData | null = useMemo(() => {
    if (!summaryDoc) return null;
    return summaryDoc.summary || summaryDoc.draftSummary || null;
  }, [summaryDoc]);

  // State chỉnh sửa phần Tổng quan (Overview)
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [overviewTitle, setOverviewTitle] = useState('');
  const [overviewContent, setOverviewContent] = useState('');

  // State chỉnh sửa các ý chính (Key Points)
  // -1 nếu không sửa, >= 0 là index của ý chính đang được sửa
  const [editingKeyPointIdx, setEditingKeyPointIdx] = useState<number | null>(null);
  const [isNewKeyPoint, setIsNewKeyPoint] = useState(false);
  const [keyPointTitle, setKeyPointTitle] = useState('');
  const [keyPointContent, setKeyPointContent] = useState('');
  const [keyPointSeconds, setKeyPointSeconds] = useState<number>(0);
  const [keyPointTimeError, setKeyPointTimeError] = useState<string | null>(null);

  // --- Handlers: Tổng quan ---
  const handleStartEditOverview = () => {
    if (!currentSummaryData) return;
    setOverviewTitle(currentSummaryData.title || '');
    setOverviewContent(currentSummaryData.overview || '');
    setIsEditingOverview(true);
  };

  const handleCancelEditOverview = () => {
    setIsEditingOverview(false);
  };

  const handleSaveOverview = () => {
    if (!currentSummaryData) return;
    const trimmedTitle = overviewTitle.trim();
    const trimmedOverview = overviewContent.trim();

    if (!trimmedTitle) {
      toast.error('Tiêu đề tóm tắt không được để trống');
      return;
    }
    if (!trimmedOverview) {
      toast.error('Đoạn văn tổng quan không được để trống');
      return;
    }

    updateSummary(
      {
        title: trimmedTitle,
        overview: trimmedOverview,
        keyPoints: currentSummaryData.keyPoints,
      },
      {
        onSuccess: () => {
          setIsEditingOverview(false);
        },
      },
    );
  };

  // --- Handlers: Ý chính ---
  const handleStartEditKeyPoint = (index: number) => {
    if (!currentSummaryData || !currentSummaryData.keyPoints[index]) return;
    const point = currentSummaryData.keyPoints[index];
    setKeyPointTitle(point.title || '');
    setKeyPointContent(point.content || '');
    setKeyPointSeconds(point.timestamp ?? 0);
    setKeyPointTimeError(null);
    setEditingKeyPointIdx(index);
    setIsNewKeyPoint(false);
  };

  const handleAddKeyPoint = () => {
    if (!currentSummaryData) return;
    // Khởi tạo ý mới với mốc thời gian mặc định 00:00 theo Socratic Gate
    const newIdx = currentSummaryData.keyPoints.length;
    setKeyPointTitle('');
    setKeyPointContent('');
    setKeyPointSeconds(0);
    setKeyPointTimeError(null);
    setEditingKeyPointIdx(newIdx);
    setIsNewKeyPoint(true);
  };

  const handleCancelEditKeyPoint = () => {
    setEditingKeyPointIdx(null);
    setIsNewKeyPoint(false);
    setKeyPointTimeError(null);
  };

  const handleSaveKeyPoint = () => {
    if (!currentSummaryData || editingKeyPointIdx === null) return;
    const trimmedTitle = keyPointTitle.trim();
    const trimmedContent = keyPointContent.trim();

    if (!trimmedTitle) {
      toast.error('Tiêu đề ý chính không được để trống');
      return;
    }
    if (!trimmedContent) {
      toast.error('Nội dung ý chính không được để trống');
      return;
    }

    // Kiểm tra ràng buộc thời lượng video theo quyết định Socratic Gate
    if (duration && duration > 0 && keyPointSeconds > duration) {
      const maxFormatted = formatTime(duration);
      setKeyPointTimeError(
        `Mốc thời gian (${formatTime(keyPointSeconds)}) vượt quá độ dài video (${maxFormatted})`,
      );
      toast.error(`Mốc thời gian không được vượt quá độ dài video (${maxFormatted})`);
      return;
    }

    setKeyPointTimeError(null);

    const updatedKeyPoint: ILessonSummaryKeyPoint = {
      title: trimmedTitle,
      content: trimmedContent,
      timestamp: keyPointSeconds,
    };

    let newKeyPoints: ILessonSummaryKeyPoint[];
    if (isNewKeyPoint) {
      newKeyPoints = [...currentSummaryData.keyPoints, updatedKeyPoint];
    } else {
      newKeyPoints = currentSummaryData.keyPoints.map((item, idx) =>
        idx === editingKeyPointIdx ? updatedKeyPoint : item,
      );
    }

    updateSummary(
      {
        title: currentSummaryData.title,
        overview: currentSummaryData.overview,
        keyPoints: newKeyPoints,
      },
      {
        onSuccess: () => {
          setEditingKeyPointIdx(null);
          setIsNewKeyPoint(false);
          setKeyPointTimeError(null);
        },
      },
    );
  };

  const handleDeleteKeyPoint = (index: number) => {
    if (!currentSummaryData) return;
    if (currentSummaryData.keyPoints.length <= 1) {
      toast.error('Bản tóm tắt cần giữ lại ít nhất 1 ý chính');
      return;
    }

    const newKeyPoints = currentSummaryData.keyPoints.filter((_, idx) => idx !== index);
    updateSummary(
      {
        title: currentSummaryData.title,
        overview: currentSummaryData.overview,
        keyPoints: newKeyPoints,
      },
      {
        onSuccess: () => {
          if (editingKeyPointIdx === index) {
            setEditingKeyPointIdx(null);
          }
          toast.success('Đã xóa ý chính khỏi bản tóm tắt');
        },
      },
    );
  };

  const handleCreateManualSummary = () => {
    updateSummary({
      title: 'Tóm tắt bài học',
      overview: 'Tổng quan nội dung chính bài học...',
      keyPoints: [
        {
          title: 'Ý chính mở đầu',
          content: 'Nội dung cốt lõi của phần này...',
          timestamp: 0,
        },
      ],
    });
  };

  return (
    <div className="w-full flex flex-col space-y-4 p-4 sm:p-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Icon icon="lucide:file-text" className="size-5 text-sky-500" />
            <span>Tóm tắt nội dung bài học (Summary)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tổng quan nội dung và các điểm cốt lõi then chốt được trích xuất từ video bài giảng.
          </p>
        </div>

        {isInstructor && (
          <Button
            size="sm"
            onClick={() => generateSummary({ saveAsDraft: false })}
            disabled={isGenerating || isUpdating}
            className="h-8 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
          >
            {isGenerating ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                Đang tóm tắt bài học AI...
              </>
            ) : (
              <>
                <Icon icon="lucide:sparkles" className="size-3.5 mr-1.5" />
                {currentSummaryData ? 'Tóm tắt lại bằng AI' : 'Tạo tóm tắt bằng AI'}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Summary Content Display */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Icon icon="lucide:loader-2" className="size-8 text-sky-500 animate-spin" />
          <p className="text-xs text-muted-foreground">Đang tải bản tóm tắt bài học...</p>
        </div>
      ) : currentSummaryData ? (
        <div className="w-full max-w-4xl mx-auto space-y-6 py-2">
          {/* 1. Title & Overview Card */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs transition-all space-y-3">
            {isEditingOverview ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    Chỉnh sửa thông tin tổng quan
                  </span>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Tiêu đề tóm tắt:
                  </label>
                  <Input
                    value={overviewTitle}
                    onChange={(e) => setOverviewTitle(e.target.value)}
                    placeholder="Nhập tiêu đề tóm tắt bài học..."
                    className="text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Đoạn văn tổng quan:
                  </label>
                  <Textarea
                    value={overviewContent}
                    onChange={(e) => setOverviewContent(e.target.value)}
                    placeholder="Nhập đoạn văn tổng quan nội dung..."
                    rows={3}
                    className="text-xs sm:text-sm leading-relaxed"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEditOverview}
                    disabled={isUpdating}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveOverview}
                    disabled={isUpdating}
                    className="h-8 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
                  >
                    {isUpdating ? (
                      <>
                        <Icon icon="lucide:loader-2" className="size-3 mr-1 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Icon icon="lucide:check" className="size-3 mr-1" />
                        Lưu thay đổi
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium text-[11px] border border-sky-500/20">
                      Tổng quan
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-foreground">
                      {currentSummaryData.title}
                    </h4>
                  </div>
                  {isInstructor && (
                    <button
                      type="button"
                      onClick={handleStartEditOverview}
                      title="Chỉnh sửa tổng quan"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                    >
                      <Icon icon="lucide:pencil" className="size-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {currentSummaryData.overview}
                </p>
              </div>
            )}
          </div>

          {/* 2. Key Points Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Icon icon="lucide:layers" className="size-3.5 text-sky-500" />
                <span>Các ý chính then chốt (Key Points)</span>
              </h5>

              {isInstructor && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddKeyPoint}
                  disabled={editingKeyPointIdx !== null || isUpdating}
                  className="h-7 text-xs font-medium border-dashed border-sky-500/50 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 cursor-pointer"
                >
                  <Icon icon="lucide:plus" className="size-3.5 mr-1" />
                  <span>Thêm ý chính</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {currentSummaryData.keyPoints.map((point, idx) => {
                const isEditingThis = editingKeyPointIdx === idx;
                const hasTimestamp = point.timestamp !== undefined && point.timestamp !== null;
                const isNearCurrentTime =
                  hasTimestamp && Math.abs(currentTime - point.timestamp!) < 5;

                if (isEditingThis) {
                  return (
                    <div
                      key={`edit-point-${idx}`}
                      className="p-4 rounded-xl border border-sky-500 ring-2 ring-sky-500/20 bg-card shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                          Chỉnh sửa ý chính #{idx + 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Tiêu đề ý chính:
                          </label>
                          <Input
                            value={keyPointTitle}
                            onChange={(e) => setKeyPointTitle(e.target.value)}
                            placeholder="Nhập tiêu đề ý chính..."
                            className="text-xs sm:text-sm font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Mốc thời gian (mm:ss):
                          </label>
                          <TimestampPickerInput
                            valueSeconds={keyPointSeconds}
                            onChange={(s) => {
                              setKeyPointSeconds(s);
                              if (duration && duration > 0 && s <= duration) {
                                setKeyPointTimeError(null);
                              }
                            }}
                            maxDuration={duration}
                            currentTime={currentTime}
                            hasError={Boolean(keyPointTimeError)}
                          />
                          {keyPointTimeError && (
                            <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                              <Icon icon="lucide:alert-circle" className="size-3 shrink-0" />
                              <span>{keyPointTimeError}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Nội dung diễn giải chi tiết:
                        </label>
                        <Textarea
                          value={keyPointContent}
                          onChange={(e) => setKeyPointContent(e.target.value)}
                          placeholder="Nhập nội dung diễn giải cho ý chính này..."
                          rows={3}
                          className="text-xs sm:text-sm leading-relaxed"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEditKeyPoint}
                          disabled={isUpdating}
                          className="h-8 text-xs cursor-pointer"
                        >
                          Hủy
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveKeyPoint}
                          disabled={isUpdating}
                          className="h-8 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
                        >
                          {isUpdating ? (
                            <>
                              <Icon icon="lucide:loader-2" className="size-3 mr-1 animate-spin" />
                              Đang lưu...
                            </>
                          ) : (
                            <>
                              <Icon icon="lucide:check" className="size-3 mr-1" />
                              Lưu ý này
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`point-${idx}`}
                    className={`p-4 rounded-xl border transition-all bg-card ${
                      isNearCurrentTime
                        ? 'border-sky-500 shadow-md ring-2 ring-sky-500/20'
                        : 'border-border/80 hover:border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="size-5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h6 className="text-xs sm:text-sm font-semibold text-foreground">
                          {point.title}
                        </h6>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {hasTimestamp && (
                          <button
                            type="button"
                            onClick={() => onSeek?.(point.timestamp!)}
                            title={`Tua video tới ${formatTime(point.timestamp!)}`}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-muted/60 hover:bg-sky-500 hover:text-white border border-border text-muted-foreground transition-all cursor-pointer shadow-2xs"
                          >
                            <Icon icon="lucide:play" className="size-2.5" />
                            <span>{formatTime(point.timestamp!)}</span>
                          </button>
                        )}

                        {isInstructor && (
                          <div className="flex items-center gap-1 pl-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditKeyPoint(idx)}
                              title="Chỉnh sửa ý chính"
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                            >
                              <Icon icon="lucide:pencil" className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKeyPoint(idx)}
                              title="Xóa ý chính"
                              className="p-1 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Icon icon="lucide:trash-2" className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-7">
                      {point.content}
                    </p>
                  </div>
                );
              })}

              {/* Form thêm mới một ý chính (khi bấm dấu +) */}
              {isNewKeyPoint && editingKeyPointIdx === currentSummaryData.keyPoints.length && (
                <div className="p-4 rounded-xl border border-dashed border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                      <Icon icon="lucide:plus" className="size-3.5" />
                      <span>Thêm ý chính mới #{currentSummaryData.keyPoints.length + 1}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Tiêu đề ý chính:
                      </label>
                      <Input
                        value={keyPointTitle}
                        onChange={(e) => setKeyPointTitle(e.target.value)}
                        placeholder="Nhập tiêu đề ý chính..."
                        className="text-xs sm:text-sm font-semibold"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Mốc thời gian (mm:ss):
                      </label>
                      <TimestampPickerInput
                        valueSeconds={keyPointSeconds}
                        onChange={(s) => {
                          setKeyPointSeconds(s);
                          if (duration && duration > 0 && s <= duration) {
                            setKeyPointTimeError(null);
                          }
                        }}
                        maxDuration={duration}
                        currentTime={currentTime}
                        hasError={Boolean(keyPointTimeError)}
                      />
                      {keyPointTimeError && (
                        <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                          <Icon icon="lucide:alert-circle" className="size-3 shrink-0" />
                          <span>{keyPointTimeError}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Nội dung diễn giải chi tiết:
                    </label>
                    <Textarea
                      value={keyPointContent}
                      onChange={(e) => setKeyPointContent(e.target.value)}
                      placeholder="Nhập nội dung diễn giải cho ý chính này..."
                      rows={3}
                      className="text-xs sm:text-sm leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditKeyPoint}
                      disabled={isUpdating}
                      className="h-8 text-xs cursor-pointer"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveKeyPoint}
                      disabled={isUpdating}
                      className="h-8 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
                    >
                      {isUpdating ? (
                        <>
                          <Icon icon="lucide:loader-2" className="size-3 mr-1 animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Icon icon="lucide:check" className="size-3 mr-1" />
                          Thêm ý này
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center space-y-3 max-w-md mx-auto">
          <div className="size-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-muted-foreground">
            <Icon icon="lucide:file-text" className="size-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Chưa có bản tóm tắt cho bài học</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {isInstructor
                ? 'Nhấn nút "Tạo tóm tắt bằng AI" để tự động sinh bản tóm tắt tổng quan và các ý chính cốt lõi.'
                : 'Giảng viên chưa cập nhật bản tóm tắt cho bài học này.'}
            </p>
          </div>
          {isInstructor && (
            <div className="pt-2 flex items-center justify-center gap-3">
              <Button
                size="sm"
                onClick={() => generateSummary({ saveAsDraft: false })}
                disabled={isGenerating || isUpdating}
                className="text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
              >
                <Icon icon="lucide:sparkles" className="size-3.5 mr-1.5" />
                Tóm tắt bằng AI
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateManualSummary}
                disabled={isGenerating || isUpdating}
                className="text-xs font-medium cursor-pointer"
              >
                <Icon icon="lucide:pencil" className="size-3.5 mr-1.5" />
                Soạn thủ công
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
