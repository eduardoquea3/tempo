import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { type PomodoroMode } from "./pomodoroPreview";
import { TimerDial } from "./TimerDial";

function SessionDots({
	activeIndex,
	total,
}: {
	activeIndex: number;
	total: number;
}) {
	return (
		<fieldset
			className="m-0 flex items-center justify-center gap-2 border-0 p-0"
			aria-label={t("timer.sessions")}
		>
			{Array.from({ length: total }).map((_, index) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: session markers have stable positions
					key={index}
					className={cn(
						"h-2.5 w-2.5 rounded-full border",
						index <= activeIndex
							? "border-brand/40 bg-brand shadow-[0_0_0_4px_color-mix(in_oklch,var(--brand)_12%,transparent)]"
							: "border-border bg-muted/40",
					)}
					aria-hidden="true"
				/>
			))}
		</fieldset>
	);
}

export function TimerStage({
	mode,
	remainingSeconds,
	progressOffset,
	activeSession,
	totalSessions,
	children,
}: {
	mode: PomodoroMode;
	remainingSeconds: number;
	progressOffset: number;
	activeSession: number;
	totalSessions: number;
	children: ReactNode;
}) {
	return (
		<section
			className="flex min-h-0 flex-1 flex-col gap-2.5 py-1"
			aria-label={t("timer.label")}
		>
			<div className="flex min-h-0 flex-1 items-center justify-center">
				<TimerDial
					mode={mode}
					remainingSeconds={remainingSeconds}
					progressOffset={progressOffset}
				/>
			</div>

			<div>
				<SessionDots activeIndex={activeSession - 1} total={totalSessions} />
			</div>

			{children}
		</section>
	);
}
