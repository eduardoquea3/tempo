import {
	Pause,
	Play,
	RotateCcw,
	SkipForward,
	SlidersHorizontal,
} from "lucide-react";
import { motion } from "motion/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatClock, getModeLabel, getModeSubtitle } from "./pomodoroPreview";
import { SettingsSheet } from "./SettingsSheet";
import { usePomodoroWidget } from "./usePomodoroWidget";

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

				<ScrollArea className="relative h-0 min-h-0 flex-1 overflow-hidden px-4.5">
					<div className="grid min-h-full gap-4 py-5">
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
										state.mode === mode && "bg-accent text-accent-foreground",
									)}
									type="button"
									aria-pressed={state.mode === mode}
									onClick={() => pomodoro.selectMode(mode)}
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

						<section
							className="grid place-items-center py-1"
							aria-label={t("timer.label")}
						>
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
										{getModeLabel(state.mode)}
									</div>
									<div
										className="font-mono text-[clamp(46px,7vw,64px)] leading-[.92] tracking-tighter tabular-nums"
										aria-live="polite"
									>
										{formatClock(state.remainingSeconds)}
									</div>
									<div className="mx-auto max-w-[22ch] text-[13px] text-muted-foreground">
										{getModeSubtitle(state.mode)}
									</div>
								</div>
							</motion.div>
						</section>

						<div className="grid gap-2.5">
							<SessionDots
								activeIndex={state.session - 1}
								total={state.sessionsBeforeLongBreak}
							/>
						</div>

						<div className="mt-auto grid grid-cols-2 gap-2">
							<button
								className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand text-xs font-semibold tracking-[.01em] text-primary-foreground shadow-[0_10px_22px_color-mix(in_oklch,var(--brand)_20%,transparent)] transition hover:-translate-y-px hover:bg-primary"
								type="button"
								onClick={pomodoro.toggleStatus}
							>
								{state.status === "running" ? (
									<Pause className="size-4 shrink-0" strokeWidth={1.85} />
								) : (
									<Play className="size-4 shrink-0" strokeWidth={1.85} />
								)}
								<span>
									{state.status === "running"
										? t("timer.action.pause")
										: state.status === "paused"
											? t("timer.action.resume")
											: t("timer.action.start")}
								</span>
							</button>

							<button
								className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-secondary text-xs font-semibold tracking-[.01em] text-secondary-foreground transition hover:-translate-y-px hover:border-ring hover:bg-accent"
								type="button"
								onClick={pomodoro.reset}
							>
								<RotateCcw className="size-4 shrink-0" strokeWidth={1.85} />
								<span>{t("timer.action.reset")}</span>
							</button>

							<button
								className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-secondary text-xs font-semibold tracking-[.01em] text-secondary-foreground transition hover:-translate-y-px hover:border-ring hover:bg-accent"
								type="button"
								onClick={pomodoro.skip}
							>
								<SkipForward className="size-4 shrink-0" strokeWidth={1.85} />
								<span>{t("timer.action.skip")}</span>
							</button>

							<button
								className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-destructive/35 bg-destructive/10 text-xs font-semibold tracking-[.01em] text-destructive transition hover:-translate-y-px hover:border-destructive/55 hover:bg-destructive/15 hover:text-destructive-foreground"
								type="button"
								onClick={pomodoro.stop}
							>
								<span
									className="size-2.5 rounded-[3px] bg-current"
									aria-hidden="true"
								/>
								<span>{t("timer.action.stop")}</span>
							</button>
						</div>
					</div>
				</ScrollArea>

				<footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4.5 pb-4.5 pt-3.5 text-xs text-muted-foreground">
					<div className="inline-flex items-center gap-2">
						<span
							className={cn(
								"size-2 rounded-full bg-primary shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_12%,transparent)]",
								state.status === "running" &&
									"animate-[pulse_1.8s_ease-in-out_infinite]",
							)}
							aria-hidden="true"
						/>
						<span>
							{state.status === "running"
								? t("timer.status.running", { mode: getModeLabel(state.mode) })
								: state.status === "paused"
									? t("timer.status.paused")
									: state.status === "completed"
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

				<SettingsSheet
					controller={pomodoro}
					settingsMounted={settingsMounted}
					onOverlayMouseDown={handleSettingsOverlayClick}
				/>
			</section>
		</main>
	);
}
