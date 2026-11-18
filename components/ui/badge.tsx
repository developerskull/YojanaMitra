import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-[var(--bg-surface-muted)] text-[var(--fg-primary)]',
        eligible: 'bg-[var(--status-eligible-bg)] text-[var(--status-eligible-fg)]',
        likely: 'bg-[var(--status-likely-bg)] text-[var(--status-likely-fg)]',
        ineligible: 'bg-[var(--status-ineligible-bg)] text-[var(--status-ineligible-fg)]',
        teal: 'bg-[var(--accent-teal-soft)] text-[var(--accent-teal)]',
        saffron: 'bg-[var(--accent-saffron-soft)] text-[var(--accent-saffron)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
