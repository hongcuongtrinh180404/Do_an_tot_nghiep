import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  MINDLY_STUDENT_ICON_PATH,
  MINDLY_STUDENT_ICON_VIEWBOX,
} from './student-icon-path';

export interface MindlyLogoProps extends React.SVGProps<SVGSVGElement> {
  /**
   * Color theme variant:
   * - 'dark-header': For dark navigation headers (e.g. #161616): red icon (#FF1018), pure white wordmark, light slate slogan.
   * - 'light-header': For light navigation headers / white background: red icon, red wordmark, deep indigo slogan.
   * - 'coral': Monochromatic brand red for icon, wordmark, and slogan.
   * - 'auto': Uses currentColor / CSS theme classes (adapts between dark and light modes).
   */
  variant?: 'dark-header' | 'light-header' | 'coral' | 'auto';

  /**
   * Predefined size presets:
   * - 'sm': h-8 (mobile header, 32px height)
   * - 'md': h-10 (standard header, 40px height)
   * - 'lg': h-12 (footer / modal header, 48px height)
   * - 'xl': h-16 (splash / hero, 64px height)
   * If omitted or custom, use `className` like `h-10 w-auto`.
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Whether to display the slogan "MAP YOUR MIND" beneath the wordmark.
   * Default: true
   */
  showSlogan?: boolean;

  /**
   * If true, renders only the thinking student icon without text.
   * Default: false
   */
  iconOnly?: boolean;
}

const sizeClasses: Record<NonNullable<MindlyLogoProps['size']>, string> = {
  sm: 'h-8 w-auto',
  md: 'h-10 w-auto',
  lg: 'h-12 w-auto',
  xl: 'h-16 w-auto',
};

/**
 * Mindly Thinking Student Icon SVG Group
 * Sourced directly from the official reference vector (refer/logo_nguoi_hoc_trace.svg)
 */
export function MindlyStudentIconPaths({
  iconColor = '#FF1018',
}: {
  iconColor?: string;
  bgColor?: string;
}): React.JSX.Element {
  return (
    <path
      d={MINDLY_STUDENT_ICON_PATH}
      fill={iconColor}
      fillRule="evenodd"
      clipRule="evenodd"
    />
  );
}

/**
 * Official Mindly Brand Logo Component
 * High-definition vector logo complying with the brand identity guidelines.
 */
export function MindlyLogo({
  variant = 'auto',
  size,
  showSlogan = true,
  iconOnly = false,
  className,
  ...props
}: MindlyLogoProps): React.JSX.Element {
  // Brand color tokens
  const brandRed = '#FF1018';
  const deepIndigo = '#4A387D'; // Slogan deep purple/indigo for light mode
  const lightSlate = '#CBD5E1'; // Slogan crisp silver for dark mode

  // Determine colors based on variant
  let iconFill = brandRed;
  let textFill = brandRed;
  let sloganFill = deepIndigo;

  if (variant === 'dark-header') {
    iconFill = brandRed;
    textFill = '#FFFFFF';
    sloganFill = lightSlate;
  } else if (variant === 'light-header') {
    iconFill = brandRed;
    textFill = brandRed;
    sloganFill = deepIndigo;
  } else if (variant === 'coral') {
    iconFill = brandRed;
    textFill = brandRed;
    sloganFill = brandRed;
  }

  // If icon-only is requested
  if (iconOnly) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={MINDLY_STUDENT_ICON_VIEWBOX}
        fill="none"
        role="img"
        aria-label="Mindly Icon"
        className={cn(
          'shrink-0 select-none transition-transform duration-200',
          size ? sizeClasses[size] : 'h-10 w-auto',
          className,
        )}
        {...props}
      >
        <MindlyStudentIconPaths
          iconColor={variant === 'auto' ? 'currentColor' : iconFill}
        />
      </svg>
    );
  }

  // ViewBox dimensions:
  // If slogan is shown: 0 0 280 84
  // If slogan is hidden: 0 0 280 68
  const viewBox = showSlogan ? '0 0 280 84' : '0 0 280 68';
  const iconScale = 0.061837; // Scales 1132px height to 70px height

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      fill="none"
      role="img"
      aria-label="Mindly - Map Your Mind"
      className={cn(
        'shrink-0 select-none transition-opacity duration-150',
        size ? sizeClasses[size] : 'h-10 w-auto',
        className,
      )}
      {...props}
    >
      <defs>
        <style>
          {`
            .mindly-brand-title {
              font-family: var(--font-heading), var(--font-roboto), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-weight: 900;
              font-size: 44px;
              letter-spacing: -0.6px;
            }
            .mindly-brand-slogan {
              font-family: var(--font-heading), var(--font-roboto), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-weight: 800;
              font-size: 8.8px;
              letter-spacing: 3.8px;
            }
          `}
        </style>
      </defs>

      {/* 1. Left Thinking Student Icon (Official Traced Vector) */}
      <g transform={`translate(6, 7) scale(${iconScale})`}>
        <MindlyStudentIconPaths
          iconColor={variant === 'auto' ? 'currentColor' : iconFill}
        />
      </g>

      {/* 2. Wordmark "Mindly" */}
      <text
        x="106"
        y="53"
        className={cn(
          'mindly-brand-title',
          variant === 'auto' && 'fill-foreground dark:fill-white',
        )}
        fill={variant !== 'auto' ? textFill : undefined}
      >
        Mindly
      </text>

      {/* 3. Slogan "MAP YOUR MIND" */}
      {showSlogan && (
        <text
          x="108"
          y="72"
          className={cn(
            'mindly-brand-slogan',
            variant === 'auto' && 'fill-[#4A387D] dark:fill-muted-foreground',
          )}
          fill={variant !== 'auto' ? sloganFill : undefined}
        >
          MAP YOUR MIND
        </text>
      )}
    </svg>
  );
}
