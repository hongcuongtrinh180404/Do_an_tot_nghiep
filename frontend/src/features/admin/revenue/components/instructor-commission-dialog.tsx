'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUpdateInstructorCommissionMutation } from '../api/revenue-admin.api';
import { formatVnd } from '../utils/revenue-format.util';

interface InstructorCommissionDialogProps {
  instructorId: string;
  instructorName: string;
  currentRate: number;
  isOpen: boolean;
  onClose: () => void;
}

export function InstructorCommissionDialog({
  instructorId,
  instructorName,
  currentRate,
  isOpen,
  onClose,
}: InstructorCommissionDialogProps): React.JSX.Element {
  const updateMutation = useUpdateInstructorCommissionMutation(instructorId);

  const [newRateStr, setNewRateStr] = React.useState<string>(String(currentRate));
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);

  React.useEffect(() => {
    setNewRateStr(String(currentRate));
    setReason('');
    setError(null);
    setShowConfirm(false);
  }, [currentRate, isOpen]);

  const parsedNewRate = parseFloat(newRateStr);
  const isValidNumber =
    !Number.isNaN(parsedNewRate) &&
    parsedNewRate >= 0 &&
    parsedNewRate <= 100 &&
    /^\d+(\.\d{1,2})?$/.test(newRateStr.trim());

  const instructorShare = isValidNumber ? Number((100 - parsedNewRate).toFixed(2)) : 0;
  const sampleAmount = 1000000;
  const samplePlatform = isValidNumber
    ? Math.round((sampleAmount * parsedNewRate) / 100)
    : 0;
  const sampleInstructor = sampleAmount - samplePlatform;

  const handleValidateAndPromptConfirm = () => {
    if (!isValidNumber) {
      setError('Vui lòng nhập tỷ lệ hợp lệ từ 0% đến 100% (tối đa 2 chữ số thập phân)');
      return;
    }
    if (parsedNewRate === currentRate) {
      setError('Tỷ lệ mới phải khác tỷ lệ hoa hồng hiện tại của giảng viên');
      return;
    }
    if (!reason.trim()) {
      setError('Lý do thay đổi hoa hồng là bắt buộc');
      return;
    }
    setError(null);
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    try {
      await updateMutation.mutateAsync({
        commissionRate: parsedNewRate,
        reason: reason.trim(),
      });
      setShowConfirm(false);
      onClose();
    } catch {
      // Handled by onError in mutation
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon icon="lucide:percent" className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Điều Chỉnh Hoa Hồng Giảng Viên
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cập nhật tỷ lệ hoa hồng nền tảng riêng cho {instructorName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {showConfirm ? (
          /* Confirmation Step */
          <div className="py-3 space-y-3 text-xs">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
                <Icon icon="lucide:alert-triangle" className="size-4" />
                <span>Xác nhận điều chỉnh hoa hồng</span>
              </div>
              <p className="text-muted-foreground">
                Bạn có chắc chắn muốn thay đổi tỷ lệ hoa hồng của giảng viên{' '}
                <strong className="text-foreground">{instructorName}</strong> từ{' '}
                <strong className="text-foreground">{currentRate}%</strong> thành{' '}
                <strong className="text-foreground">{parsedNewRate}%</strong>?
              </p>
              <div className="p-2 bg-card rounded border border-border/60 text-[11px]">
                <span className="text-muted-foreground block">Lý do điều chỉnh:</span>
                <span className="font-medium text-foreground">{reason.trim()}</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80 italic">
                * Tỷ lệ mới sẽ được áp dụng cho toàn bộ khóa học của giảng viên này đối với các đơn hàng tạo mới sau thời điểm cập nhật.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(false)}
                disabled={updateMutation.isPending}
              >
                Quay lại
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Đang cập nhật...' : 'Xác nhận lưu'}
              </Button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <div className="py-2 space-y-4 text-xs">
            {/* Instructor & Current Rate */}
            <div className="p-3 bg-muted/30 rounded-xl border border-border/50 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground block text-[11px]">Giảng viên:</span>
                <span className="font-semibold text-foreground text-sm">{instructorName}</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[11px]">Tỷ lệ hiện tại:</span>
                <span className="font-bold text-foreground text-sm">{currentRate}%</span>
              </div>
            </div>

            {/* New Rate Input */}
            <div className="space-y-1.5">
              <label htmlFor="instructor-commission-rate-input" className="font-medium text-foreground block">
                Tỷ lệ nền tảng mới (%)
              </label>
              <div className="relative">
                <Input
                  id="instructor-commission-rate-input"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={newRateStr}
                  onChange={(e) => {
                    setNewRateStr(e.target.value);
                    setError(null);
                  }}
                  className="pr-8 text-sm font-semibold"
                  placeholder="Ví dụ: 25"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  %
                </span>
              </div>
            </div>

            {/* Split Preview */}
            {isValidNumber && (
              <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-blue-600 dark:text-blue-400">
                    Mindly: <strong>{parsedNewRate}%</strong>
                  </span>
                  <span className="text-amber-600 dark:text-amber-400">
                    Giảng viên: <strong>{instructorShare}%</strong>
                  </span>
                </div>

                <div className="pt-2 border-t border-primary/10 space-y-0.5 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground block">
                    Ví dụ phân chia với khóa học 1.000.000đ:
                  </span>
                  <div className="flex justify-between">
                    <span>Mindly nhận:</span>
                    <strong className="text-blue-600 dark:text-blue-400">
                      {formatVnd(samplePlatform)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Giảng viên nhận:</span>
                    <strong className="text-amber-600 dark:text-amber-400">
                      {formatVnd(sampleInstructor)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Reason Field */}
            <div className="space-y-1.5">
              <label htmlFor="instructor-commission-reason-input" className="font-medium text-foreground block">
                Lý do thay đổi <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="instructor-commission-reason-input"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
                placeholder="Nhập lý do điều chỉnh tỷ lệ hoa hồng (bắt buộc)..."
                className="text-xs min-h-[70px] resize-none"
              />
            </div>

            {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleValidateAndPromptConfirm}
                disabled={!isValidNumber || parsedNewRate === currentRate || !reason.trim()}
              >
                Tiếp tục
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

