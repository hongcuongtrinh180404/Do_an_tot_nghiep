'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { getPublicProfilePath } from '../utils/profile-url';

export function CopyProfileLinkButton({ username }: { username: string }): React.JSX.Element {
  const [isCopying, setIsCopying] = useState(false);

  const copyLink = async () => {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(
        new URL(getPublicProfilePath(username), window.location.origin).href,
      );
      toast.success('Đã sao chép liên kết trang cá nhân');
    } catch {
      toast.error('Không thể sao chép liên kết. Bạn có thể sao chép địa chỉ trên trình duyệt.');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={copyLink} disabled={isCopying} className="min-h-11 shadow-none">
      <Icon icon="lucide:link" className="size-4" />
      {isCopying ? 'Đang sao chép…' : 'Sao chép liên kết'}
    </Button>
  );
}
