import { motion } from "motion/react";
import {
	formatClock,
	getModeLabel,
	type PomodoroMode,
} from "./pomodoroPreview";

export function TimerDial({
	mode,
	remainingSeconds,
	progressOffset,
}: {
	mode: PomodoroMode;
	remainingSeconds: number;
	progressOffset: number;
}) {
	return (
		<motion.div className="relative grid aspect-square w-62 place-items-center rounded-full bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--background)_97%,transparent)_0_61%,transparent_61.5%)] shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_6%,transparent),0_20px_34px_rgba(0,0,0,.26)] max-[520px]:w-54.5">
			<svg
				className="pointer-events-none absolute inset-0 size-full -rotate-90"
				viewBox="0 0 100 100"
				aria-hidden="true"
			>
				<circle
					cx="50"
					cy="50"
					r="44"
					fill="none"
					stroke="var(--border)"
					strokeWidth="6"
				/>
				<circle
					cx="50"
					cy="50"
					r="44"
					fill="none"
					stroke="var(--brand)"
					strokeLinecap="round"
					strokeWidth="6"
					strokeDasharray="276.46"
					style={{ strokeDashoffset: progressOffset }}
				/>
			</svg>
			<span className="pointer-events-none absolute inset-5.5 rounded-full border border-border/50" />
			<div className="z-1 grid gap-2.5 text-center">
				<div className="text-xs uppercase tracking-[.06em] text-muted-foreground">
					{getModeLabel(mode)}
				</div>
				<div
					className="font-mono text-[clamp(46px,7vw,64px)] leading-[.92] tracking-tighter tabular-nums"
					aria-live="polite"
				>
					{formatClock(remainingSeconds)}
				</div>
			</div>
		</motion.div>
	);
}
