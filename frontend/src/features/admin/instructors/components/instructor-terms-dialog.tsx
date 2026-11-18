'use client';

import * as React from 'react';
import type { IInstructorTerm } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from '@/components/shared/dialog';
import {
  useInstructorTermsQuery,
  useUpdateInstructorTermsMutation,
} from '../api/admin-instructors.api';

interface InstructorTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditableTerm {
  id: string;
  title: string;
  content: string;
  isMandatory: boolean;
  order: number;
}

export function InstructorTermsDialog({
  open,
  onOpenChange,
}: InstructorTermsDialogProps): React.JSX.Element {
  const { data: initialTerms, isLoading } = useInstructorTermsQuery();
  const updateMutation = useUpdateInstructorTermsMutation();

  const [activeTab, setActiveTab] = React.useState<'edit' | 'preview'>('edit');
  const [terms, setTerms] = React.useState<EditableTerm[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Sync initial terms when dialog opens or data loads
  React.useEffect(() => {
    if (initialTerms && initialTerms.length > 0) {
      setTerms(
        initialTerms.map((t, idx) => ({
          id: t.id || `term-${idx}`,
          title: t.title,
          content: t.content,
          isMandatory: t.isMandatory !== undefined ? t.isMandatory : true,
          order: t.order || idx + 1,
        })),
      );
    }
  }, [initialTerms, open]);

  const handleAddTerm = () => {
    const newId = `new-term-${Date.now()}`;
    const newTerm: EditableTerm = {
      id: newId,
      title: 'Điều khoản mới',
      content: 'Nhập nội dung quy định, quyền lợi và cam kết tại đây...',
      isMandatory: true,
      order: terms.length + 1,
    };
    setTerms([...terms, newTerm]);
    setEditingId(newId);
  };

  const handleUpdateField = (
    id: string,
    field: keyof EditableTerm,
    value: string | boolean | number,
  ) => {
    setTerms(
      terms.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const handleDeleteTerm = (id: string) => {
    setTerms(terms.filter((t) => t.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= terms.length) return;

    const newTerms = [...terms];
    const temp = newTerms[index];
    newTerms[index] = newTerms[targetIndex];
    newTerms[targetIndex] = temp;

    // re-assign order numbers
    const updated = newTerms.map((t, idx) => ({ ...t, order: idx + 1 }));
    setTerms(updated);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        terms: terms.map((t, idx) => ({
          id: t.id.startsWith('new-term-') ? undefined : t.id,
          title: t.title.trim(),
          content: t.content.trim(),
          isMandatory: t.isMandatory,
          order: idx + 1,
        })),
      });
      onOpenChange(false);
    } catch {
      // error handled in mutation
    }
  };

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Thiết lập điều khoản giảng viên"
      description="Cấu hình quy định, chính sách bản quyền và thỏa thuận mà giảng viên phải chấp thuận khi đăng ký."
      icon="lucide:file-text"
      iconClassName="bg-primary/10 text-primary ring-primary/20"
      className="sm:max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon icon="lucide:edit-3" className="size-3.5 inline mr-1" />
              Chỉnh sửa ({terms.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon icon="lucide:eye" className="size-3.5 inline mr-1" />
              Xem trước (Preview)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
              className="text-xs h-9 cursor-pointer"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground cursor-pointer"
            >
              {updateMutation.isPending ? (
                <>
                  <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Icon icon="lucide:save" className="size-3.5" />
                  <span>Lưu thiết lập</span>
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="py-2 max-h-[65vh] overflow-y-auto pr-1 space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            <Icon icon="lucide:loader-2" className="size-5 animate-spin mx-auto mb-2" />
            Đang tải dữ liệu điều khoản...
          </div>
        ) : activeTab === 'edit' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <span className="text-xs text-muted-foreground">
                Tổng số điều khoản: <strong>{terms.length}</strong>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTerm}
                className="text-xs h-8 gap-1.5 cursor-pointer"
              >
                <Icon icon="lucide:plus" className="size-3.5" />
                <span>Thêm điều khoản mới</span>
              </Button>
            </div>

            {terms.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-border/80 text-xs text-muted-foreground">
                Chưa có điều khoản nào được thiết lập. Hãy bấm nút "Thêm điều khoản mới".
              </div>
            ) : (
              terms.map((term, index) => {
                const isEditing = editingId === term.id;
                return (
                  <div
                    key={term.id}
                    className="p-3.5 rounded-xl border border-border/60 bg-card space-y-2.5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="size-5 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        {isEditing ? (
                          <input
                            type="text"
                            value={term.title}
                            onChange={(e) =>
                              handleUpdateField(term.id, 'title', e.target.value)
                            }
                            placeholder="Tiêu đề điều khoản..."
                            className="flex-1 text-xs font-semibold px-2 py-1 rounded border border-border bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        ) : (
                          <h4 className="text-xs font-semibold text-foreground">
                            {term.title}
                          </h4>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Move buttons */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMove(index, 'up')}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                          title="Di chuyển lên"
                        >
                          <Icon icon="lucide:chevron-up" className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === terms.length - 1}
                          onClick={() => handleMove(index, 'down')}
                          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                          title="Di chuyển xuống"
                        >
                          <Icon icon="lucide:chevron-down" className="size-3.5" />
                        </button>

                        {/* Toggle edit */}
                        <button
                          type="button"
                          onClick={() =>
                            setEditingId(isEditing ? null : term.id)
                          }
                          className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                          title={isEditing ? 'Thu gọn' : 'Chỉnh sửa'}
                        >
                          <Icon
                            icon={isEditing ? 'lucide:check' : 'lucide:edit-2'}
                            className="size-3.5"
                          />
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteTerm(term.id)}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="Xóa điều khoản"
                        >
                          <Icon icon="lucide:trash-2" className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          rows={3}
                          value={term.content}
                          onChange={(e) =>
                            handleUpdateField(term.id, 'content', e.target.value)
                          }
                          placeholder="Nội dung điều khoản chi tiết..."
                          className="w-full text-xs p-2 rounded-lg border border-border bg-background resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
                        />
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={term.isMandatory}
                            onChange={(e) =>
                              handleUpdateField(
                                term.id,
                                'isMandatory',
                                e.target.checked,
                              )
                            }
                            className="rounded border-border size-3.5 accent-primary"
                          />
                          <span>Bắt buộc giảng viên phải tích chọn đồng ý</span>
                        </label>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                        {term.content}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Preview Tab */
          <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary leading-relaxed flex items-center gap-2">
              <Icon icon="lucide:info" className="size-4 shrink-0" />
              <span>
                Đây là giao diện mô phỏng các điều khoản mà ứng viên sẽ đọc và xác nhận khi điền biểu mẫu "Trở thành giảng viên" tại trang chủ.
              </span>
            </div>

            <div className="space-y-3">
              {terms.map((term, index) => (
                <div
                  key={term.id}
                  className="p-3 rounded-lg bg-card border border-border/40 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {term.title}
                    </span>
                    {term.isMandatory && (
                      <span className="text-[10px] text-rose-500 font-medium">
                        *(Bắt buộc)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground pl-6 leading-relaxed">
                    {term.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DialogLayout>
  );
}
