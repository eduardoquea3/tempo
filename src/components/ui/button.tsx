import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-semibold tracking-[.01em] transition outline-none hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default:
					"bg-brand text-primary-foreground shadow-[0_10px_22px_color-mix(in_oklch,var(--brand)_20%,transparent)] hover:bg-primary",
				secondary:
					"border border-border bg-secondary text-secondary-foreground hover:border-ring hover:bg-accent hover:text-accent-foreground",
				destructive:
					"border border-destructive/35 bg-destructive/10 text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground",
			},
			size: {
				default: "h-11 px-4",
				icon: "size-11",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
	return (
		<button
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
