import {
	Bell,
	BellOff,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock3,
	Minus,
	Palette,
	Plus,
	Repeat2,
	Slash,
	SunMedium,
	X,
} from "lucide-react";
import { type MouseEvent, type ReactNode, useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { themes, useTheme } from "../theme/ThemeProvider";
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
				<div className="text-xs text-muted-foreground">{hint}</div>
			</div>
			<button
				className={cn(
					"relative h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-[background,border-color] duration-200",
					pressed
						? "border-brand/30 bg-brand/15"
						: "border-border bg-secondary",
				)}
				type="button"
				aria-pressed={pressed}
				onClick={onClick}
			>
				<span
					className={cn(
						"pointer-events-none absolute top-0 grid h-full w-4 place-items-center text-primary-foreground transition-[left,color] duration-200",
						pressed ? "left-1.5" : "left-[26px] text-muted-foreground",
					)}
				>
					{pressed ? icon : offIcon}
				</span>
				<span
					className={cn(
						"absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-primary shadow-[0_2px_8px_rgba(0,0,0,.28)] transition-[left,background] duration-200",
						pressed ? "left-6 bg-brand" : "left-1",
					)}
				/>
			</button>
		</div>
	);
}

function DurationField({
	mode,
	label,
	value,
	step,
	onChange,
}: {
	mode: PomodoroMode;
	label: string;
	value: number;
	step: number;
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

	const handleStep = (direction: -1 | 1) => {
		const current = Number(draft);
		const base = Number.isFinite(current) ? current : value;
		const nextValue = Math.min(180, Math.max(1, base + direction * step));
		handleChange(String(nextValue));
	};

	return (
		<label className="group flex h-11 items-center justify-between gap-4 rounded-xl border border-border/70 bg-secondary/25 px-3 text-[13px] text-muted-foreground transition-colors hover:border-border hover:bg-secondary/45">
			<span className="font-medium text-foreground/80">{label}</span>
			<span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
				<span
					className={cn(
						"inline-flex h-8 items-stretch overflow-hidden rounded-lg border bg-input transition-[border-color,box-shadow] focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/15",
						isInvalid
							? "border-destructive shadow-[0_0_0_2px_color-mix(in_oklch,var(--destructive)_14%,transparent)]"
							: "border-border group-hover:border-ring/60",
					)}
				>
					<button
						className="grid w-7 cursor-pointer place-items-center text-muted-foreground transition hover:bg-secondary hover:text-foreground"
						type="button"
						aria-label={`Decrease ${label} by ${step} minutes`}
						onClick={() => handleStep(-1)}
					>
						<Minus className="size-3" strokeWidth={2} />
					</button>
					<input
						className="duration-input h-full w-10 bg-transparent px-0 text-center font-mono text-[13px] font-semibold text-foreground outline-none"
						type="number"
						min="1"
						max="180"
						value={draft}
						inputMode="numeric"
						aria-invalid={isInvalid}
						aria-label={t("settings.durationAria", { label })}
						onChange={(event) => handleChange(event.target.value)}
					/>
					<button
						className="grid w-7 cursor-pointer place-items-center text-muted-foreground transition hover:bg-secondary hover:text-foreground"
						type="button"
						aria-label={`Increase ${label} by ${step} minutes`}
						onClick={() => handleStep(1)}
					>
						<Plus className="size-3" strokeWidth={2} />
					</button>
				</span>
				<span className="w-6">{t("settings.minutes")}</span>
			</span>
		</label>
	);
}

type PomodoroController = ReturnType<typeof usePomodoroPreview>;
type SettingsTab = "time" | "appearance" | "system";

const settingsTabs = [
	{ id: "time", label: "Tiempo", icon: Clock3 },
	{ id: "appearance", label: "Apariencia", icon: Palette },
	{ id: "system", label: "Sistema", icon: SunMedium },
] as const satisfies ReadonlyArray<{
	id: SettingsTab;
	label: string;
	icon: typeof Clock3;
}>;

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
	const { theme, setTheme } = useTheme();
	const [activeTab, setActiveTab] = useState<SettingsTab>("time");
	const [themePage, setThemePage] = useState(0);
	const themesPerPage = 6;
	const themePageCount = Math.ceil(themes.length / themesPerPage);
	const visibleThemes = themes.slice(
		themePage * themesPerPage,
		(themePage + 1) * themesPerPage,
	);

	if (!settingsMounted) return null;

	return (
		/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop click is intentionally handled on the presentation layer */
		<div
			className={cn(
				"absolute inset-0 z-10 flex items-end justify-center bg-background/65 p-3 backdrop-blur-[5px] animate-[settings-overlay-in_180ms_ease_both] max-[520px]:p-2",
				!state.settingsOpen &&
					"pointer-events-none animate-[settings-overlay-out_220ms_ease_both]",
			)}
			role="presentation"
			onMouseDown={onOverlayMouseDown}
		>
			<section
				className={cn(
					"h-[60%] min-h-0 w-full max-w-[420px] rounded-[20px] border border-border bg-linear-to-b from-card to-background shadow-[0_24px_50px_rgba(0,0,0,.42),inset_0_1px_0_rgba(255,255,255,.06)] animate-[settings-sheet-in_220ms_cubic-bezier(.22,1,.36,1)_both] max-[520px]:rounded-[18px]",
					!state.settingsOpen &&
						"animate-[settings-sheet-out_220ms_cubic-bezier(.4,0,1,1)_both]",
				)}
				role="dialog"
				aria-modal="true"
				aria-labelledby="settings-title"
			>
				<div
					className="mx-auto my-2 h-1 w-[34px] rounded-full bg-muted-foreground/30"
					aria-hidden="true"
				/>
				<header className="flex items-start justify-between gap-4 border-b border-border px-4 pb-3 pt-1">
					<div>
						<div className="text-[10px] font-bold uppercase tracking-[.11em] text-brand">
							{t("settings.eyebrow")}
						</div>
						<h2
							className="mt-0.5 text-[17px] font-semibold tracking-[-.02em]"
							id="settings-title"
						>
							{t("settings.title")}
						</h2>
					</div>
					<button
						className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-border bg-secondary text-secondary-foreground transition hover:-translate-y-px hover:border-ring hover:bg-accent hover:text-accent-foreground"
						type="button"
						aria-label={t("settings.close")}
						onClick={controller.toggleSettings}
					>
						<X className="size-4 shrink-0" strokeWidth={1.85} />
					</button>
				</header>

				<div className="grid gap-3 px-4 pb-4 pt-2.5">
					<div
						className="grid grid-cols-3 rounded-lg border border-border bg-secondary p-0.5"
						role="tablist"
						aria-label="Settings sections"
					>
						{settingsTabs.map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								className={cn(
									"inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground",
									activeTab === id && "bg-background text-foreground shadow-sm",
								)}
								type="button"
								role="tab"
								id={`settings-tab-${id}`}
								aria-selected={activeTab === id}
								aria-controls={`settings-panel-${id}`}
								tabIndex={activeTab === id ? 0 : -1}
								onClick={() => setActiveTab(id)}
							>
								<Icon className="size-3.5 shrink-0" strokeWidth={1.85} />
								<span className="truncate">{label}</span>
							</button>
						))}
					</div>

					{activeTab === "time" && (
						<div
							className="grid gap-1.5"
							id="settings-panel-time"
							role="tabpanel"
							aria-labelledby="settings-tab-time"
						>
							<div className="flex items-end justify-between px-1">
								<div className="grid gap-0.5">
									<div className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
										{t("settings.duration")}
									</div>
									<div className="text-xs text-muted-foreground/70">
										Set the length of each mode.
									</div>
								</div>
								<span className="text-[10px] font-medium uppercase tracking-[.08em] text-muted-foreground/55">
									Minutes
								</span>
							</div>
							<DurationField
								mode="focus"
								label={t("timer.mode.focus")}
								value={controller.durationsInMinutes.focus}
								step={5}
								onChange={controller.updateDuration}
							/>
							<DurationField
								mode="shortBreak"
								label={t("timer.mode.shortBreak")}
								value={controller.durationsInMinutes.shortBreak}
								step={1}
								onChange={controller.updateDuration}
							/>
							<DurationField
								mode="longBreak"
								label={t("timer.mode.longBreak")}
								value={controller.durationsInMinutes.longBreak}
								step={1}
								onChange={controller.updateDuration}
							/>
						</div>
					)}

					{activeTab === "appearance" && (
						<div
							className="grid gap-3"
							id="settings-panel-appearance"
							role="tabpanel"
							aria-labelledby="settings-tab-appearance"
						>
							<div className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
								Appearance
							</div>
							<fieldset className="grid gap-1.5">
								<legend className="sr-only">Theme</legend>
								<div className="grid grid-cols-3 gap-1">
									{visibleThemes.map(({ id, label, preview }) => (
										<button
											key={id}
											className={cn(
												"group relative grid cursor-pointer gap-0.5 rounded-lg border border-border bg-card p-0.5 text-left text-[10px] text-muted-foreground transition hover:-translate-y-px hover:border-ring hover:text-foreground",
												theme === id &&
													"border-brand bg-background text-foreground shadow-sm",
											)}
											type="button"
											aria-label={`${label} theme`}
											aria-pressed={theme === id}
											onClick={() => setTheme(id)}
										>
											<span
												className="relative block h-10 overflow-hidden rounded-md border"
												style={{
													backgroundColor: preview.background,
													borderColor: preview.border,
												}}
											>
												<span
													className="absolute inset-x-0 top-0 h-2 border-b"
													style={{
														backgroundColor: preview.surface,
														borderColor: preview.border,
													}}
												/>
												<span
													className="absolute left-2 top-2 h-1 w-7 rounded-full opacity-70"
													style={{ backgroundColor: preview.foreground }}
												/>
												<span
													className="absolute right-2 top-2 h-1 w-5 rounded-full"
													style={{ backgroundColor: preview.accent }}
												/>
												<span
													className="absolute inset-x-2 bottom-1.5 h-4 rounded border"
													style={{
														backgroundColor: preview.surface,
														borderColor: preview.border,
													}}
												/>
												{theme === id && (
													<span className="absolute bottom-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-brand text-primary-foreground">
														<Check className="size-2.5" strokeWidth={3} />
													</span>
												)}
											</span>
											<span className="px-1 py-px font-medium">{label}</span>
										</button>
									))}
								</div>
								<div className="flex items-center justify-between">
									<button
										className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground transition hover:border-ring hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
										type="button"
										aria-label="Previous themes"
										disabled={themePage === 0}
										onClick={() => setThemePage((page) => page - 1)}
									>
										<ChevronLeft className="size-3.5" />
									</button>
									<span
										className="text-[10px] font-medium text-muted-foreground"
										aria-live="polite"
									>
										Page {themePage + 1} of {themePageCount}
									</span>
									<button
										className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground transition hover:border-ring hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
										type="button"
										aria-label="Next themes"
										disabled={themePage === themePageCount - 1}
										onClick={() => setThemePage((page) => page + 1)}
									>
										<ChevronRight className="size-3.5" />
									</button>
								</div>
							</fieldset>
						</div>
					)}

					{activeTab === "system" && (
						<div
							className="grid gap-1"
							id="settings-panel-system"
							role="tabpanel"
							aria-labelledby="settings-tab-system"
						>
							<div className="mb-0.5 text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
								System behavior
							</div>
							<TogglePill
								label={t("settings.sound.label")}
								hint={t("settings.sound.hint")}
								icon={<Bell className="size-4 shrink-0" strokeWidth={1.85} />}
								offIcon={
									<BellOff className="size-4 shrink-0" strokeWidth={1.85} />
								}
								pressed={state.soundEnabled}
								onClick={controller.toggleSound}
							/>
							<TogglePill
								label={t("settings.autoNext.label")}
								hint={t("settings.autoNext.hint")}
								icon={
									<Repeat2 className="size-4 shrink-0" strokeWidth={1.85} />
								}
								offIcon={
									<span className="relative block size-4">
										<Repeat2 className="size-4" strokeWidth={1.85} />
										<Slash
											className="absolute inset-0 size-4"
											strokeWidth={1.85}
										/>
									</span>
								}
								pressed={state.autoAdvance}
								onClick={controller.toggleAutoAdvance}
							/>
							<TogglePill
								label={t("settings.startOnLogin.label")}
								hint={t("settings.startOnLogin.hint")}
								icon={
									<Repeat2 className="size-4 shrink-0" strokeWidth={1.85} />
								}
								offIcon={
									<span className="relative block size-4">
										<Repeat2 className="size-4" strokeWidth={1.85} />
										<Slash
											className="absolute inset-0 size-4"
											strokeWidth={1.85}
										/>
									</span>
								}
								pressed={state.startOnLogin}
								onClick={controller.toggleAutoStart}
							/>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
