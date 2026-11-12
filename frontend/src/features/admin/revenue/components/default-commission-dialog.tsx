'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useCommissionConfigQuery,
  useUpdateCommissionConfigMutation,
} from '../api/revenue-admin.api';
import { formatVnd } from '../utils/revenue-format.util';

interface DefaultCommissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DefaultCommissionDialog({
  isOpen,
  onClose,
}: DefaultCommissionDialogProps): React.JSX.Element {
  const { data: config, isLoading } = useCommissionConfigQuery();
  const updateMutation = useUpdateCommissionConfigMutation();

  const currentRate = config?.defaultRate ?? 30;
  const [newRateStr, setNewRateStr] = React.useState<string>(String(currentRate));
  const [reason, setReason] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);

  React.useEffect(() => {
    if (config) {
      setNewRateStr(String(config.defaultRate));
    }
  }, [config]);

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
      setError('Tỷ lệ mới phải khác tỷ lệ mặc định hiện tại');
      return;
    }
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do thay đổi cấu hình hoa hồng toàn hệ thống');
      return;
    }
    setError(null);
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    try {
      await updateMutation.mutateAsync({
        defaultRate: parsedNewRate,
        reason: reason.trim(),
      });
      setShowConfirm(false);
      onClose();
    } catch {
      // Handled by onError in mutation hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon icon="lucide:settings-2" className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Cấu Hình Hoa Hồng Mặc Định
              </DialogTitle>
              <DialogDescription className="text-xs">
                Thiết lập tỷ lệ hoa hồng áp dụng đồng loạt cho toàn bộ giảng viên & khóa học
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
            Đang tải cấu hình hoa hồng...
          </div>
        ) : showConfirm ? (
          /* Confirmation Step */
          <div className="py-3 space-y-3">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
                <Icon icon="lucide:alert-triangle" className="size-4 shrink-0" />
                <span>Cảnh báo áp dụng toàn hệ thống</span>
              </div>
              <p className="text-foreground">
                Bạn đang chuẩn bị đổi tỷ lệ mặc định từ{' '}
                <strong className="text-foreground">{currentRate}%</strong> thành{' '}
                <strong className="text-foreground">{parsedNewRate}%</strong> (Giảng viên hưởng{' '}
                <strong className="text-foreground">{instructorShare}%</strong>).
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Hành động này sẽ <strong>ghi đè tỷ lệ hoa hồng của TẤT CẢ giảng viên</strong> trong hệ thống (kể cả những giảng viên đã từng được tùy chỉnh riêng) và có hiệu lực ngay lập tức cho các giao dịch khóa học mới.
              </p>
              <div className="pt-1.5 border-t border-amber-500/20 text-[11px]">
                <span className="text-muted-foreground">Lý do: </span>
                <span className="font-medium text-foreground">{reason.trim()}</span>
              </div>
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
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {updateMutation.isPending ? 'Đang lưu...' : 'Xác nhận áp dụng toàn hệ thống'}
              </Button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <div className="py-2 space-y-4 text-xs">
            {/* Current Rate Display */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50">
              <span className="text-muted-foreground">Tỷ lệ mặc định hiện tại:</span>
              <span className="text-sm font-bold text-foreground">{currentRate}%</span>
            </div>

            {/* Input New Rate */}
            <div className="space-y-1.5">
              <label htmlFor="default-commission-rate-input" className="font-medium text-foreground block">
                Tỷ lệ nền tảng mới (%) <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  id="default-commission-rate-input"
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

            {/* Reason Input */}
            <div className="space-y-1.5">
              <label htmlFor="default-commission-reason-input" className="font-medium text-foreground block">
                Lý do thay đổi <span className="text-destructive">*</span>
              </label>
              <Input
                id="default-commission-reason-input"
                type="text"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
                className="text-xs"
                placeholder="Ví dụ: Điều chỉnh chính sách hoa hồng sàn năm 2026"
              />
            </div>

            {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}

            {/* Split Preview */}
            {isValidNumber && (
              <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 space-y-2.5">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-blue-600 dark:text-blue-400">
                    Mindly nhận: <strong>{parsedNewRate}%</strong>
                  </span>
                  <span className="text-amber-600 dark:text-amber-400">
                    Giảng viên nhận: <strong>{instructorShare}%</strong>
                  </span>
                </div>

                <div className="pt-2 border-t border-primary/10 space-y-1 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground block">
                    Ví dụ phân chia với khóa học 1.000.000đ:
                  </span>
                  <div className="flex justify-between">
                    <span>- Mindly:</span>
                    <strong className="text-blue-600 dark:text-blue-400">
                      {formatVnd(samplePlatform)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>- Giảng viên:</span>
                    <strong className="text-amber-600 dark:text-amber-400">
                      {formatVnd(sampleInstructor)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Scope Explanation & Warning */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
                <span>Áp dụng toàn bộ giảng viên & khóa học</span>
              </div>
              <p className="leading-relaxed">
                Tỷ lệ này sẽ áp dụng đồng loạt cho <strong>TẤT CẢ</strong> giảng viên hiện có (ghi đè mọi tỷ lệ hoa hồng riêng từng thiết lập trước đó). Mọi giao dịch khóa học mới sau thời điểm này sẽ được tính theo tỷ lệ mới.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleValidateAndPromptConfirm}
                disabled={!isValidNumber || parsedNewRate === currentRate}
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

