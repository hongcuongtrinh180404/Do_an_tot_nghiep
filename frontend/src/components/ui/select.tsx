'use client';

import * as React from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

function Select<Value = string>({
  children,
  ...props
}: SelectPrimitive.Root.Props<Value>): React.JSX.Element {
  return (
    <SelectPrimitive.Root data-slot="select" {...props}>
      {children}
    </SelectPrimitive.Root>
  );
}

function SelectGroup({
  className,
  ...props
}: SelectPrimitive.Group.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn('p-1', className)}
      {...props}
    />
  );
}

function SelectValue({
  className,
  placeholder,
  ...props
}: SelectPrimitive.Value.Props & { placeholder?: string }): React.JSX.Element {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      placeholder={placeholder}
      className={cn('truncate', className)}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'group flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-xs sm:text-sm text-foreground shadow-2xs transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive select-none cursor-pointer whitespace-nowrap',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        data-slot="select-icon"
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 data-popup-open:rotate-180"
      >
        <Icon icon="lucide:chevron-down" className="size-4" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  ...props
}: SelectPrimitive.Popup.Props & {
  align?: SelectPrimitive.Positioner.Props['align'];
  side?: SelectPrimitive.Positioner.Props['side'];
  sideOffset?: SelectPrimitive.Positioner.Props['sideOffset'];
}): React.JSX.Element {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            'z-50 min-w-32 max-h-72 overflow-y-auto rounded-xl border border-border/70 bg-popover p-1 text-popover-foreground shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            className,
          )}
          {...props}
        >
          <SelectPrimitive.List className="space-y-0.5">
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-2.5 pr-8 text-xs sm:text-sm text-foreground outline-none transition-colors hover:bg-muted focus:bg-muted focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="truncate">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex size-3.5 items-center justify-center text-primary">
        <Icon icon="lucide:check" className="size-3.5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('-mx-1 my-1 h-px bg-border/60', className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectSeparator,
};
