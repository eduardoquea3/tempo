import { SlidersHorizontal } from "lucide-react";
import { t } from "@/lib/i18n";
import { getModeLabel } from "./pomodoroPreview";
import { SettingsSheet } from "./SettingsSheet";
import { TimerActions } from "./TimerActions";
import { TimerFooter } from "./TimerFooter";
import { TimerModes } from "./TimerModes";
import { TimerStage } from "./TimerStage";
import { usePomodoroWidget } from "./usePomodoroWidget";

export function PomodoroWidget() {
	const {
		pomodoro,
		state,
		settingsMounted,
		handleSettingsOverlayClick,
		progressOffset,
	} = usePomodoroWidget();

	return (
		<main className="grid h-full w-full place-items-stretch">
			<section
				className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[26px] border border-border bg-linear-to-b from-card to-background shadow-[inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-[14px]"
				data-mode={state.mode}
				data-status={state.status}
			>
				<header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card/50 px-4.5 pb-3.5 pt-4">
					<div className="flex min-w-0 items-center gap-2.5">
						<span
							className="relative grid size-4.5 shrink-0 place-items-start rounded-md bg-app-icon shadow-[0_0_0_1px_color-mix(in_oklch,var(--app-icon)_32%,transparent)]"
							aria-hidden="true"
						>
							<span className="mt-0.5 ml-0.5 size-2 rounded-[3px] bg-app-icon-detail" />
						</span>
						<div className="grid min-w-0 gap-0.5">
							<div className="text-[15px] font-semibold leading-[1.1] tracking-[-.02em]">
								{t("app.name")}
							</div>
							<div className="text-xs tracking-[.02em] text-muted-foreground">
								{t("timer.session", {
									mode: getModeLabel(state.mode),
									minutes: Math.round(state.durationSeconds / 60),
								})}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-border bg-secondary text-secondary-foreground transition hover:-translate-y-px hover:bg-accent hover:text-accent-foreground"
							type="button"
							aria-label={t("timer.settings.open")}
							aria-expanded={state.settingsOpen}
							onClick={pomodoro.toggleSettings}
						>
							<SlidersHorizontal
								className="size-4 shrink-0"
								strokeWidth={1.85}
							/>
						</button>
					</div>
				</header>

				<div className="relative flex h-0 min-h-0 flex-1 overflow-hidden px-4.5">
					<div className="flex min-h-full w-full flex-col gap-2 pb-0 pt-5">
						<TimerModes
							activeMode={state.mode}
							onSelect={pomodoro.selectMode}
						/>

						<TimerStage
							mode={state.mode}
							remainingSeconds={state.remainingSeconds}
							progressOffset={progressOffset}
							activeSession={state.session}
							totalSessions={state.sessionsBeforeLongBreak}
						>
							<div className="grid gap-2 py-5">
								<TimerActions
									row="primary"
									status={state.status}
									onToggleStatus={pomodoro.toggleStatus}
									onReset={pomodoro.reset}
									onSkip={pomodoro.skip}
									onStop={pomodoro.stop}
								/>
								<TimerActions
									row="secondary"
									status={state.status}
									onToggleStatus={pomodoro.toggleStatus}
									onReset={pomodoro.reset}
									onSkip={pomodoro.skip}
									onStop={pomodoro.stop}
								/>
							</div>
						</TimerStage>
					</div>
				</div>

				<TimerFooter mode={state.mode} status={state.status} />

				<SettingsSheet
					controller={pomodoro}
					settingsMounted={settingsMounted}
					onOverlayMouseDown={handleSettingsOverlayClick}
				/>
			</section>
		</main>
	);
}
