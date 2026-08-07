import { Bell, BellOff, Repeat2, Slash, X } from "lucide-react";
import { type MouseEvent, type ReactNode, useEffect, useState } from "react";
import {
	durationMinutesSchema,
	type PomodoroMode,
	usePomodoroPreview,
} from "./pomodoroPreview";

function TogglePill({
	label,
	hint,
	icon,
	offIcon,
	pressed,
	onClick,
}: {
	label: string;
	hint: string;
	icon: ReactNode;
	offIcon: ReactNode;
	pressed: boolean;
	onClick: () => void;
}) {
	return (
		<div className="flex min-h-[42px] items-center justify-between gap-3">
			<div className="grid gap-0.5">
				<div className="text-[13px] font-medium">{label}</div>
				<div className="text-xs text-[#a79c8f]">{hint}</div>
			</div>
			<button
				className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-[background,border-color] duration-200 ${pressed ? "border-[#ff8c4a]/30 bg-[#ff8c4a]/15" : "border-white/[.08] bg-white/[.04]"}`}
				type="button"
				aria-pressed={pressed}
				onClick={onClick}
			>
				<span
					className={`pointer-events-none absolute top-0 grid h-full w-4 place-items-center text-white/[.92] transition-[left,color] duration-200 ${pressed ? "left-1.5" : "left-[26px] text-[#c7bcaf]/80"}`}
				>
					{pressed ? icon : offIcon}
				</span>
				<span
					className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-linear-to-b from-[#fbf5ec] to-[#d9d1c7] shadow-[0_2px_8px_rgba(0,0,0,.28)] transition-[left,background] duration-200 ${pressed ? "left-6 bg-linear-to-b from-[#ffd7c1] to-[#ffb48b]" : "left-1"}`}
				/>
			</button>
		</div>
	);
}

function DurationField({
	mode,
	label,
	value,
	onChange,
}: {
	mode: PomodoroMode;
	label: string;
	value: number;
	onChange: (mode: PomodoroMode, minutes: number) => void;
}) {
	const [draft, setDraft] = useState(String(value));
	const [isInvalid, setIsInvalid] = useState(false);

	useEffect(() => {
		setDraft(String(value));
		setIsInvalid(false);
	}, [value]);

	const handleChange = (nextValue: string) => {
		setDraft(nextValue);
		const result = durationMinutesSchema.safeParse(Number(nextValue));
		setIsInvalid(!result.success);
		if (result.success) onChange(mode, result.data);
	};

	return (
		<label className="flex items-center justify-between gap-3 text-[13px] text-[#c7bcaf]">
			<span>{label}</span>
			<span className="inline-flex items-center gap-1 text-xs text-[#a79c8f]">
				<input
					className={`w-14 rounded-lg border bg-[#1d1a17] px-2 py-1.5 text-right font-mono text-[13px] font-semibold text-[#f5efe6] outline-offset-1 focus:outline-2 focus:outline-[#ff8c4a]/35 ${isInvalid ? "border-[#ef705d] shadow-[0_0_0_2px_rgba(239,112,93,.14)]" : "border-white/[.08]"}`}
					type="number"
					min="1"
					max="180"
					value={draft}
					inputMode="numeric"
					aria-invalid={isInvalid}
					aria-label={`${label} en minutos`}
					onChange={(event) => handleChange(event.target.value)}
				/>
				<span>min</span>
			</span>
		</label>
	);
}

type PomodoroController = ReturnType<typeof usePomodoroPreview>;

export function SettingsSheet({
	controller,
	settingsMounted,
	onOverlayMouseDown,
}: {
	controller: PomodoroController;
	settingsMounted: boolean;
	onOverlayMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
}) {
	const { state } = controller;

	if (!settingsMounted) return null;

	return (
		/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop click is intentionally handled on the presentation layer */
		<div
			className={`absolute inset-0 z-10 flex items-end justify-center bg-[#080706]/65 p-3 backdrop-blur-[5px] animate-[settings-overlay-in_180ms_ease_both] max-[520px]:p-2 ${state.settingsOpen ? "" : "pointer-events-none animate-[settings-overlay-out_220ms_ease_both]"}`}
			role="presentation"
			onMouseDown={onOverlayMouseDown}
		>
			<section
				className={`w-full max-w-[420px] rounded-[20px] border border-white/[.14] bg-linear-to-b from-[#2b2520] to-[#241f1b] shadow-[0_24px_50px_rgba(0,0,0,.42),inset_0_1px_0_rgba(255,255,255,.06)] animate-[settings-sheet-in_220ms_cubic-bezier(.22,1,.36,1)_both] max-[520px]:rounded-[18px] ${state.settingsOpen ? "" : "animate-[settings-sheet-out_220ms_cubic-bezier(.4,0,1,1)_both]"}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="settings-title"
			>
				<div
					className="mx-auto my-2 h-1 w-[34px] rounded-full bg-white/20"
					aria-hidden="true"
				/>
				<header className="flex items-start justify-between gap-4 border-b border-white/[.08] px-4 pb-3 pt-1">
					<div>
						<div className="text-[10px] font-bold uppercase tracking-[.11em] text-[#ff8c4a]">
							Timer setup
						</div>
						<h2
							className="mt-0.5 text-[17px] font-semibold tracking-[-.02em]"
							id="settings-title"
						>
							Opciones básicas
						</h2>
					</div>
					<button
						className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-white/[.08] bg-white/[.02] text-[#c7bcaf] transition hover:-translate-y-px hover:border-white/[.14] hover:bg-white/[.05] hover:text-[#f5efe6]"
						type="button"
						aria-label="Cerrar opciones"
						onClick={controller.toggleSettings}
					>
						<X className="size-4 shrink-0" strokeWidth={1.85} />
					</button>
				</header>

				<div className="grid gap-1 px-4 pb-4 pt-2.5">
					<div className="grid gap-2 border-b border-white/[.08] pb-2">
						<div className="mb-0.5 text-[11px] font-bold uppercase tracking-[.08em] text-[#c7bcaf]">
							Duración por modo
						</div>
						<DurationField
							mode="focus"
							label="Focus"
							value={controller.durationsInMinutes.focus}
							onChange={controller.updateDuration}
						/>
						<DurationField
							mode="shortBreak"
							label="Short break"
							value={controller.durationsInMinutes.shortBreak}
							onChange={controller.updateDuration}
						/>
						<DurationField
							mode="longBreak"
							label="Long break"
							value={controller.durationsInMinutes.longBreak}
							onChange={controller.updateDuration}
						/>
					</div>

					<TogglePill
						label="Sound on finish"
						hint="Un beep suave al completar el ciclo."
						icon={<Bell className="size-4 shrink-0" strokeWidth={1.85} />}
						offIcon={<BellOff className="size-4 shrink-0" strokeWidth={1.85} />}
						pressed={state.soundEnabled}
						onClick={controller.toggleSound}
					/>

					<TogglePill
						label="Auto next"
						hint="Pasa al siguiente modo sin abrir otra ventana."
						icon={<Repeat2 className="size-4 shrink-0" strokeWidth={1.85} />}
						offIcon={
							<span className="relative block size-4">
								<Repeat2 className="size-4" strokeWidth={1.85} />
								<Slash className="absolute inset-0 size-4" strokeWidth={1.85} />
							</span>
						}
						pressed={state.autoAdvance}
						onClick={controller.toggleAutoAdvance}
					/>

					<TogglePill
						label="Start with Windows"
						hint="Abre Tempo automáticamente al iniciar sesión."
						icon={<Repeat2 className="size-4 shrink-0" strokeWidth={1.85} />}
						offIcon={
							<span className="relative block size-4">
								<Repeat2 className="size-4" strokeWidth={1.85} />
								<Slash className="absolute inset-0 size-4" strokeWidth={1.85} />
							</span>
						}
						pressed={state.startOnLogin}
						onClick={controller.toggleAutoStart}
					/>
				</div>
			</section>
		</div>
	);
}
