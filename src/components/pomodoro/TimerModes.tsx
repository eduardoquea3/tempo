import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getModeLabel, type PomodoroMode } from "./pomodoroPreview";

export function TimerModes({
	activeMode,
	onSelect,
}: {
	activeMode: PomodoroMode;
	onSelect: (mode: PomodoroMode) => void;
}) {
	return (
		<div
			className="grid grid-cols-3 gap-2"
			role="tablist"
			aria-label={t("timer.modes")}
		>
			{(["focus", "shortBreak", "longBreak"] as const).map((mode) => (
				<button
					key={mode}
					className={cn(
						"inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 text-xs font-medium tracking-[.01em] text-muted-foreground transition hover:-translate-y-px hover:bg-accent hover:text-accent-foreground",
						activeMode === mode && "bg-accent text-accent-foreground",
					)}
					type="button"
					aria-pressed={activeMode === mode}
					onClick={() => onSelect(mode)}
				>
					<span
						className="text-[11px] leading-none text-brand"
						aria-hidden="true"
					>
						{mode === "focus" ? "◉" : mode === "shortBreak" ? "◌" : "◎"}
					</span>
					{getModeLabel(mode)}
				</button>
			))}
		</div>
	);
}
