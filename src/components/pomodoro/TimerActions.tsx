import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import type { PomodoroStatus } from "./pomodoroPreview";

export function TimerActions({
	status,
	onToggleStatus,
	onReset,
	onSkip,
	onStop,
}: {
	status: PomodoroStatus;
	onToggleStatus: () => void;
	onReset: () => void;
	onSkip: () => void;
	onStop: () => void;
}) {
	return (
		<div className="mt-auto grid grid-cols-2 gap-2">
			<Button type="button" onClick={onToggleStatus}>
				{status === "running" ? (
					<Pause className="size-4 shrink-0" strokeWidth={1.85} />
				) : (
					<Play className="size-4 shrink-0" strokeWidth={1.85} />
				)}
				<span>
					{status === "running"
						? t("timer.action.pause")
						: status === "paused"
							? t("timer.action.resume")
							: t("timer.action.start")}
				</span>
			</Button>

			<Button variant="secondary" type="button" onClick={onReset}>
				<RotateCcw className="size-4 shrink-0" strokeWidth={1.85} />
				<span>{t("timer.action.reset")}</span>
			</Button>

			<Button variant="secondary" type="button" onClick={onSkip}>
				<SkipForward className="size-4 shrink-0" strokeWidth={1.85} />
				<span>{t("timer.action.skip")}</span>
			</Button>

			<Button variant="destructive" type="button" onClick={onStop}>
				<span
					className="size-2.5 rounded-[3px] bg-current"
					aria-hidden="true"
				/>
				<span>{t("timer.action.stop")}</span>
			</Button>
		</div>
	);
}
