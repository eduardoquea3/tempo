import {
	Pause,
	Play,
	RotateCcw,
	SkipForward,
	SlidersHorizontal,
} from "lucide-react";
import { motion } from "motion/react";
import {
	type CSSProperties,
	type MouseEvent,
	useEffect,
	useState,
} from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	formatClock,
	getModeLabel,
	getModeSubtitle,
	usePomodoroPreview,
} from "./pomodoroPreview";
import { SettingsSheet } from "./SettingsSheet";

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
			aria-label="Sesiones actuales"
		>
			{Array.from({ length: total }).map((_, index) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: session markers have stable positions
					key={index}
					className={`h-2.5 w-2.5 rounded-full border ${index < activeIndex ? "border-[#ff8c4a]/40 bg-[#ff8c4a] shadow-[0_0_0_4px_rgba(255,140,74,.12)]" : "border-white/[.16] bg-white/[.03]"}`}
					aria-hidden="true"
				/>
			))}
		</fieldset>
	);
}

export function PomodoroWidget() {
	const pomodoro = usePomodoroPreview();
	const { state } = pomodoro;
	const widgetStyle = {
		["--progress" as never]: `${pomodoro.progress}%`,
	} as CSSProperties;
	const [settingsMounted, setSettingsMounted] = useState(false);

	useEffect(() => {
		if (state.settingsOpen) {
			setSettingsMounted(true);
			return;
		}

		const timeoutId = window.setTimeout(() => setSettingsMounted(false), 220);
		return () => window.clearTimeout(timeoutId);
	}, [state.settingsOpen]);

	useEffect(() => {
		if (!state.settingsOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") pomodoro.toggleSettings();
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [pomodoro, state.settingsOpen]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement;
			if (
				event.code !== "Space" ||
				["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
			)
				return;
			if (target.closest("button, a")) return;
			event.preventDefault();
			pomodoro.toggleStatus();
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [pomodoro]);

	const handleSettingsOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
		if (event.target === event.currentTarget) pomodoro.toggleSettings();
	};

	return (
		<main className="grid h-full w-full place-items-stretch">
			<section
				className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[26px] border border-white/[.08] bg-linear-to-b from-[#241f1b] to-[#1d1a17] shadow-[0_26px_60px_rgba(0,0,0,.44),inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-[14px]"
				data-mode={state.mode}
				data-status={state.status}
				style={widgetStyle}
			>
				<header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[.07] bg-white/[.01] px-[18px] pb-3.5 pt-4">
					<div className="flex min-w-0 items-center gap-2.5">
						<span
							className="h-[18px] w-[18px] shrink-0 rounded-md bg-linear-to-br from-[#ff8c4a] to-[#ff6f2f] shadow-[0_0_0_1px_rgba(255,140,74,.32)]"
							aria-hidden="true"
						/>
						<div className="grid min-w-0 gap-0.5">
							<div className="text-[15px] font-semibold leading-[1.1] tracking-[-.02em]">
								Pomodoro
							</div>
							<div className="text-xs tracking-[.02em] text-[#a79c8f]">
								{getModeLabel(state.mode)} session ·{" "}
								{Math.round(state.durationSeconds / 60)} min
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-white/[.14] bg-white/[.03] text-[#c7bcaf] transition hover:-translate-y-px hover:bg-white/[.05] hover:text-[#f5efe6]"
							type="button"
							aria-label="Abrir opciones"
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

				<ScrollArea className="relative h-0 min-h-0 flex-1 overflow-hidden px-[18px]">
					<div className="grid min-h-full gap-4 py-5">
						<div
							className="grid grid-cols-3 gap-2"
							role="tablist"
							aria-label="Modos de temporizador"
						>
							{(["focus", "shortBreak", "longBreak"] as const).map((mode) => (
								<button
									key={mode}
									className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[.14] bg-white/[.02] text-[13px] font-medium tracking-[.01em] text-[#a79c8f] transition hover:-translate-y-px hover:bg-white/[.05] hover:text-[#f5efe6] ${state.mode === mode ? "bg-white/[.05] text-[#f5efe6]" : ""}`}
									type="button"
									aria-pressed={state.mode === mode}
									onClick={() => pomodoro.selectMode(mode)}
								>
									<span
										className="text-[11px] leading-none text-[#ff8c4a]"
										aria-hidden="true"
									>
										{mode === "focus" ? "◉" : mode === "shortBreak" ? "◌" : "◎"}
									</span>
									{mode === "focus"
										? "Focus"
										: mode === "shortBreak"
											? "Short break"
											: "Long break"}
								</button>
							))}
						</div>

						<section
							className="grid place-items-center py-1"
							aria-label="Temporizador"
						>
							<motion.div
								className="relative grid aspect-square w-[248px] place-items-center rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(20,18,16,.97)_0_61%,transparent_61.5%),conic-gradient(from_270deg,#ff8c4a_0_var(--progress),rgba(255,255,255,.07)_var(--progress)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,.06),0_20px_34px_rgba(0,0,0,.26)] max-[520px]:w-[218px]"
								style={
									{
										["--progress" as never]: `${pomodoro.progress}%`,
									} as CSSProperties
								}
								animate={
									{ "--progress": `${pomodoro.progress}%` } as Record<
										string,
										string
									>
								}
								transition={{ duration: 0.12, ease: "linear" }}
							>
								<span className="pointer-events-none absolute inset-[22px] rounded-full border border-white/[.05]" />
								<div className="z-[1] grid gap-2.5 text-center">
									<div className="text-xs uppercase tracking-[.06em] text-[#a79c8f]">
										{getModeLabel(state.mode)}
									</div>
									<div
										className="font-mono text-[clamp(46px,7vw,64px)] leading-[.92] tracking-[-.05em] tabular-nums"
										aria-live="polite"
									>
										{formatClock(state.remainingSeconds)}
									</div>
									<div className="mx-auto max-w-[22ch] text-[13px] text-[#c7bcaf]">
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
								className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#ff8c4a] text-[13px] font-semibold tracking-[.01em] text-[#1b120d] shadow-[0_10px_22px_rgba(255,140,74,.2)] transition hover:-translate-y-px hover:bg-[#ff9a61]"
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
										? "Pause"
										: state.status === "paused"
											? "Resume"
											: "Start"}
								</span>
							</button>

							<button
								className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[.08] bg-white/[.02] text-[13px] font-semibold tracking-[.01em] transition hover:-translate-y-px hover:border-white/[.14] hover:bg-white/[.05]"
								type="button"
								onClick={pomodoro.reset}
							>
								<RotateCcw className="size-4 shrink-0" strokeWidth={1.85} />
								<span>Reset</span>
							</button>

							<button
								className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[.08] bg-white/[.02] text-[13px] font-semibold tracking-[.01em] transition hover:-translate-y-px hover:border-white/[.14] hover:bg-white/[.05]"
								type="button"
								onClick={pomodoro.skip}
							>
								<SkipForward className="size-4 shrink-0" strokeWidth={1.85} />
								<span>Skip</span>
							</button>

							<button
								className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[.08] bg-white/[.02] text-[13px] font-semibold tracking-[.01em] text-[#f0b0b0] transition hover:-translate-y-px hover:border-[#e46d6d]/35 hover:bg-[#e46d6d]/[.08] hover:text-[#ffd5d5]"
								type="button"
								onClick={pomodoro.stop}
							>
								<span
									className="size-2.5 rounded-[3px] bg-current"
									aria-hidden="true"
								/>
								<span>Stop</span>
							</button>
						</div>
					</div>
				</ScrollArea>

				<footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[.07] px-[18px] pb-[18px] pt-3.5 text-xs text-[#a79c8f]">
					<div className="inline-flex items-center gap-2">
						<span
							className={`size-2 rounded-full bg-[#68c28d] shadow-[0_0_0_4px_rgba(104,194,141,.12)] ${state.status === "running" ? "animate-[pulse_1.8s_ease-in-out_infinite]" : ""}`}
							aria-hidden="true"
						/>
						<span>
							{state.status === "running"
								? `Running · ${getModeLabel(state.mode)}`
								: state.status === "paused"
									? "Paused"
									: state.status === "completed"
										? "Cycle completed"
										: "Listo para empezar"}
						</span>
					</div>

					<div className="inline-flex items-center gap-2">
						<span className="rounded-lg border border-white/[.08] bg-white/[.03] px-2 py-[3px] font-mono text-[11px] tracking-[.02em] text-[#f5efe6]">
							Space
						</span>
						<span>Play</span>
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
