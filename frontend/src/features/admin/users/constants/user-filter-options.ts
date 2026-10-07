import { RoleEnum, UserStatusEnum } from 'share-lib';
import type { DataTableFilterOption } from '@/components/shared/data-table';

export const ROLE_FILTER_OPTIONS: DataTableFilterOption[] = [
  {
    label: 'Quản trị viên',
    value: RoleEnum.ADMIN,
    icon: 'lucide:shield-check',
  },
  {
    label: 'Giảng viên',
    value: RoleEnum.INSTRUCTOR,
    icon: 'lucide:graduation-cap',
  },
  {
    label: 'Sinh viên',
    value: RoleEnum.STUDENT,
    icon: 'lucide:user',
  },
];

export const STATUS_FILTER_OPTIONS: DataTableFilterOption[] = [
  {
    label: 'Hoạt động',
    value: UserStatusEnum.ACTIVE,
    icon: 'lucide:check-circle-2',
  },
  {
    label: 'Chưa kích hoạt',
    value: UserStatusEnum.INACTIVE,
    icon: 'lucide:clock',
  },
  {
    label: 'Bị khóa',
    value: UserStatusEnum.BANNED,
    icon: 'lucide:ban',
  },
];
