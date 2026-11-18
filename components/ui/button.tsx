import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 min-h-[48px] px-4 py-2 cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-[#D45015] to-[#E56A24] text-white shadow-sm hover:shadow-md hover:brightness-105',
        secondary:
          'bg-gradient-to-r from-[#0D5C63] to-[#13747C] text-white shadow-sm hover:shadow-md hover:brightness-105 dark:from-[#0F766E] dark:to-[#14B8A6] dark:text-[#041B19]',
        outline:
          'border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--fg-primary)] hover:bg-[var(--bg-surface-muted)] hover:border-[var(--accent-teal)]/50',
        ghost: 'text-[var(--fg-primary)] hover:bg-[var(--bg-surface-muted)]',
        destructive: 'bg-red-700 text-white hover:bg-red-800 shadow-xs',
      },
      size: {
        default: 'min-h-[48px] px-4 py-2.5 text-base',
        sm: 'min-h-[42px] px-3.5 py-2 text-sm',
        lg: 'min-h-[54px] px-6 py-3 text-base sm:text-lg',
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
