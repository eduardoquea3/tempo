import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
	getModeLabel,
	type PomodoroMode,
	type PomodoroStatus,
} from "./pomodoroPreview";

export function TimerFooter({
	mode,
	status,
}: {
	mode: PomodoroMode;
	status: PomodoroStatus;
}) {
	return (
		<footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4.5 pb-4.5 pt-3.5 text-xs text-muted-foreground">
			<div className="inline-flex items-center gap-2">
				<span
					className={cn(
						"size-2 rounded-full bg-primary shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_12%,transparent)]",
						status === "running" && "animate-[pulse_1.8s_ease-in-out_infinite]",
					)}
					aria-hidden="true"
				/>
				<span>
					{status === "running"
						? t("timer.status.running", { mode: getModeLabel(mode) })
						: status === "paused"
							? t("timer.status.paused")
							: status === "completed"
								? t("timer.status.completed")
								: t("timer.status.idle")}
				</span>
			</div>

			<div className="inline-flex items-center gap-2">
				<span className="rounded-lg border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs tracking-[.02em] text-foreground">
					{t("timer.shortcut.space")}
				</span>
				<span>{t("timer.shortcut.play")}</span>
			</div>
		</footer>
	);
}
