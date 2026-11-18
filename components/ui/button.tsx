import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 min-h-[48px] px-4 py-2 cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--accent-saffron)] text-white hover:bg-[var(--accent-saffron-hover)] shadow-sm',
        secondary:
          'bg-[var(--accent-teal)] text-white hover:bg-[var(--accent-teal-hover)] shadow-sm',
        outline:
          'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--fg-primary)] hover:bg-[var(--bg-surface-muted)]',
        ghost: 'text-[var(--fg-primary)] hover:bg-[var(--bg-surface-muted)]',
        destructive: 'bg-red-700 text-white hover:bg-red-800',
      },
      size: {
        default: 'min-h-[48px] px-4 py-2.5 text-base',
        sm: 'min-h-[44px] px-3 py-2 text-sm',
        lg: 'min-h-[54px] px-6 py-3 text-lg',
        icon: 'min-h-[48px] min-w-[48px] p-2.5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
