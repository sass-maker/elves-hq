import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-stone-900 text-stone-50",
        secondary: "border-stone-700 bg-stone-900 text-stone-300",
        green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
        red: "border-red-500/30 bg-red-500/10 text-red-200",
        blue: "border-sky-500/30 bg-sky-500/10 text-sky-200",
        outline: "border-stone-700 bg-stone-950 text-stone-300"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
