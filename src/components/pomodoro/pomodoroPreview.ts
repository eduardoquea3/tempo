import { invoke } from "@tauri-apps/api/core";
import {
	isPermissionGranted,
	requestPermission,
	sendNotification,
} from "@tauri-apps/plugin-notification";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { type TranslationKey, t } from "@/lib/i18n";
import {
	type CompletionSoundId,
	defaultCompletionSound,
	getCompletionSound,
	isCompletionSoundId,
} from "./completionSounds";

export type PomodoroMode = "focus" | "shortBreak" | "longBreak";
export type PomodoroStatus = "idle" | "running" | "paused" | "completed";

export interface PomodoroPreviewState {
	mode: PomodoroMode;
	status: PomodoroStatus;
	remainingSeconds: number;
	durationSeconds: number;
	session: number;
	sessionsBeforeLongBreak: number;
	soundEnabled: boolean;
	completionSound: CompletionSoundId;
	autoAdvance: boolean;
	startOnLogin: boolean;
	settingsOpen: boolean;
	durations: Record<PomodoroMode, number>;
	elapsedBeforeStartMs: number;
	startedAtMs: number | null;
	completedAtMs: number | null;
}

type TimerState = Omit<
	PomodoroPreviewState,
	"settingsOpen" | "remainingSeconds" | "durationSeconds"
> & {
	settingsOpen: boolean;
};

const STORAGE_KEY = "tempo-pomodoro";
const COMPLETION_GRACE_MS = 5_200;
const defaultDurations: Record<PomodoroMode, number> = {
	focus: 25 * 60,
	shortBreak: 5 * 60,
	longBreak: 15 * 60,
};

const modeLabelKeys: Record<PomodoroMode, TranslationKey> = {
	focus: "timer.mode.focus",
	shortBreak: "timer.mode.shortBreak",
	longBreak: "timer.mode.longBreak",
};
const modeSubtitleKeys: Record<PomodoroMode, TranslationKey> = {
	focus: "timer.mode.focusSubtitle",
	shortBreak: "timer.mode.shortBreakSubtitle",
	longBreak: "timer.mode.longBreakSubtitle",
};

export const durationMinutesSchema = z.number().int().min(1).max(180);

function isMode(value: unknown): value is PomodoroMode {
	return value === "focus" || value === "shortBreak" || value === "longBreak";
}

function isStatus(value: unknown): value is PomodoroStatus {
	return (
		value === "idle" ||
		value === "running" ||
		value === "paused" ||
		value === "completed"
	);
}

function positiveInteger(
	value: unknown,
	fallback: number,
	max = Number.MAX_SAFE_INTEGER,
) {
	return typeof value === "number" &&
		Number.isSafeInteger(value) &&
		value > 0 &&
		value <= max
		? value
		: fallback;
}

function nonNegativeInteger(value: unknown, fallback: number) {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
		? value
		: fallback;
}

function timestampOrNull(value: unknown) {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
		? value
		: null;
}

function defaultTimerState(): TimerState {
	return {
		mode: "focus",
		status: "idle",
		session: 1,
		elapsedBeforeStartMs: 0,
		startedAtMs: null,
		completedAtMs: null,
		durations: { ...defaultDurations },
		sessionsBeforeLongBreak: 4,
		autoAdvance: true,
		soundEnabled: true,
		completionSound: defaultCompletionSound,
		startOnLogin: false,
		settingsOpen: false,
	};
}

function parseTimerState(raw: unknown, fallback: TimerState): TimerState {
	if (!raw || typeof raw !== "object") return fallback;
	const value = raw as Record<string, unknown>;
	const durations = value.durations as Record<string, unknown> | undefined;
	return {
		...fallback,
		mode: isMode(value.mode) ? value.mode : fallback.mode,
		status: isStatus(value.status) ? value.status : fallback.status,
		session: positiveInteger(value.session, fallback.session),
		elapsedBeforeStartMs: nonNegativeInteger(value.elapsedBeforeStartMs, 0),
		startedAtMs: timestampOrNull(value.startedAtMs),
		completedAtMs: timestampOrNull(value.completedAtMs),
		durations: {
			focus: positiveInteger(
				durations?.focus,
				fallback.durations.focus,
				180 * 60,
			),
			shortBreak: positiveInteger(
				durations?.shortBreak,
				fallback.durations.shortBreak,
				180 * 60,
			),
			longBreak: positiveInteger(
				durations?.longBreak,
				fallback.durations.longBreak,
				180 * 60,
			),
		},
		sessionsBeforeLongBreak: positiveInteger(value.sessionsBeforeLongBreak, 4),
		autoAdvance:
			typeof value.autoAdvance === "boolean" ? value.autoAdvance : true,
		soundEnabled:
			typeof value.soundEnabled === "boolean" ? value.soundEnabled : true,
		completionSound: isCompletionSoundId(value.completionSound)
			? value.completionSound
			: fallback.completionSound,
		startOnLogin:
			typeof value.startOnLogin === "boolean" ? value.startOnLogin : false,
	};
}

function loadTimerState(): TimerState {
	const fallback = defaultTimerState();
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored === null
			? fallback
			: parseTimerState(JSON.parse(stored), fallback);
	} catch {
		return fallback;
	}
}

function normalizeLegacyState(raw: unknown): unknown {
	if (!raw || typeof raw !== "object") return null;
	const value = raw as Record<string, unknown>;
	const legacyState = value.state;
	const legacyConfig = value.config;
	if (
		!legacyState ||
		typeof legacyState !== "object" ||
		!legacyConfig ||
		typeof legacyConfig !== "object"
	)
		return null;
	const state = legacyState as Record<string, unknown>;
	const config = legacyConfig as Record<string, unknown>;
	const legacyDurations = config.durations;
	if (!legacyDurations || typeof legacyDurations !== "object") return null;
	const durations = legacyDurations as Record<string, unknown>;
	return {
		...state,
		durations: {
			focus: durations.focusSeconds,
			shortBreak: durations.shortBreakSeconds,
			longBreak: durations.longBreakSeconds,
		},
		sessionsBeforeLongBreak: config.sessionsBeforeLongBreak,
		autoAdvance: config.autoAdvance,
		soundEnabled: config.soundEnabled,
		startOnLogin: config.startOnLogin,
	};
}

function hasStoredTimerState() {
	try {
		return localStorage.getItem(STORAGE_KEY) !== null;
	} catch {
		return false;
	}
}

function persistTimerState(state: TimerState) {
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				mode: state.mode,
				status: state.status,
				session: state.session,
				elapsedBeforeStartMs: state.elapsedBeforeStartMs,
				startedAtMs: state.startedAtMs,
				completedAtMs: state.completedAtMs,
				durations: state.durations,
				sessionsBeforeLongBreak: state.sessionsBeforeLongBreak,
				autoAdvance: state.autoAdvance,
				soundEnabled: state.soundEnabled,
				completionSound: state.completionSound,
				startOnLogin: state.startOnLogin,
			}),
		);
	} catch {
		// Storage can be unavailable; timestamp state still keeps the timer correct.
	}
}

function durationFor(state: TimerState) {
	return state.durations[state.mode];
}

function elapsedAt(state: TimerState, now: number) {
	return (
		state.elapsedBeforeStartMs +
		(state.startedAtMs === null ? 0 : Math.max(0, now - state.startedAtMs))
	);
}

function nextMode(
	mode: PomodoroMode,
	session: number,
	beforeLong: number,
): PomodoroMode {
	if (mode !== "focus") return "focus";
	return session % Math.max(1, beforeLong) === 0 ? "longBreak" : "shortBreak";
}

function evaluate(state: TimerState, now: number): TimerState {
	const next = { ...state };
	if (next.status === "running") {
		const durationMs = durationFor(next) * 1000;
		const elapsed = elapsedAt(next, now);
		if (elapsed >= durationMs) {
			next.status = "completed";
			next.elapsedBeforeStartMs = durationMs;
			next.startedAtMs = null;
			next.completedAtMs = now - (elapsed - durationMs);
		} else {
			next.elapsedBeforeStartMs = 0;
			next.startedAtMs = now - elapsed;
		}
	}
	if (
		next.autoAdvance &&
		next.status === "completed" &&
		next.completedAtMs !== null &&
		now - next.completedAtMs >= COMPLETION_GRACE_MS
	) {
		const completedMode = next.mode;
		next.mode = nextMode(next.mode, next.session, next.sessionsBeforeLongBreak);
		if (completedMode === "longBreak") next.session = 1;
		else if (next.mode === "focus") next.session += 1;
		next.status = "running";
		next.elapsedBeforeStartMs = 0;
		next.startedAtMs = now;
		next.completedAtMs = null;
	}
	return next;
}

function displayState(state: TimerState, now: number): PomodoroPreviewState {
	const durationSeconds = durationFor(state);
	return {
		...state,
		durationSeconds,
		remainingSeconds: Math.max(
			0,
			durationSeconds - Math.floor(elapsedAt(state, now) / 1000),
		),
	};
}

export function formatClock(totalSeconds: number) {
	const safe = Math.max(0, Math.ceil(totalSeconds));
	return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}
export function getModeLabel(mode: PomodoroMode) {
	return t(modeLabelKeys[mode]);
}
export function getModeSubtitle(mode: PomodoroMode) {
	return t(modeSubtitleKeys[mode]);
}
export function getNextMode(
	mode: PomodoroMode,
	session: number,
	sessionsBeforeLongBreak: number,
) {
	return nextMode(mode, session, sessionsBeforeLongBreak);
}
export function getProgress(
	state: Pick<PomodoroPreviewState, "remainingSeconds" | "durationSeconds">,
) {
	if (state.durationSeconds <= 0) return 0;
	return Math.max(
		0,
		Math.min(
			100,
			((state.durationSeconds - state.remainingSeconds) /
				state.durationSeconds) *
				100,
		),
	);
}

async function sendCompletionNotification(mode: PomodoroMode) {
	try {
		let granted = await isPermissionGranted();
		if (!granted) granted = (await requestPermission()) === "granted";
		if (granted)
			await sendNotification({
				title: t("app.name"),
				body: t("notification.completed", { mode: getModeLabel(mode) }),
			});
	} catch {
		// Notifications may be unavailable or denied.
	}
}

export function usePomodoroPreview() {
	const [timer, setTimer] = useState<TimerState>(loadTimerState);
	const [hydrated, setHydrated] = useState(hasStoredTimerState);
	const migrationStarted = useRef(false);
	const autostartRequest = useRef(0);
	const [now, setNow] = useState(Date.now);
	const previousCompletion = useRef({ status: timer.status, mode: timer.mode });
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const audioTimeoutRef = useRef<number | null>(null);

	const commit = useCallback(
		(
			update: (current: TimerState) => TimerState,
			updateBeforeEvaluation = false,
		) => {
			setTimer((current) => {
				const timestamp = Date.now();
				const next = updateBeforeEvaluation
					? evaluate(update(current), timestamp)
					: evaluate(update(evaluate(current, timestamp)), timestamp);
				persistTimerState(next);
				return next;
			});
		},
		[],
	);

	const prepareAudio = useCallback((soundId: CompletionSoundId) => {
		if (!audioRef.current) audioRef.current = new Audio();
		audioRef.current.src = getCompletionSound(soundId).source;
		audioRef.current.load();
	}, []);

	const playCompletionSound = useCallback((soundId: CompletionSoundId) => {
		if (audioTimeoutRef.current !== null)
			window.clearTimeout(audioTimeoutRef.current);
		audioRef.current?.pause();
		const audio = new Audio(getCompletionSound(soundId).source);
		audioRef.current = audio;
		void audio.play().catch(() => undefined);
		audioTimeoutRef.current = window.setTimeout(() => {
			audio.pause();
			audio.currentTime = 0;
		}, 8_000);
	}, []);

	useEffect(() => {
		if (hydrated || migrationStarted.current) return;
		migrationStarted.current = true;
		void invoke<unknown>("load_legacy_tempo")
			.then((legacy) => {
				const fallback = defaultTimerState();
				const normalized = normalizeLegacyState(legacy);
				const next = normalized
					? parseTimerState(normalized, fallback)
					: fallback;
				setTimer(next);
				persistTimerState(next);
			})
			.catch(() => {
				const fallback = defaultTimerState();
				setTimer(fallback);
				persistTimerState(fallback);
			})
			.finally(() => {
				setNow(Date.now());
				setHydrated(true);
			});
	}, [hydrated]);

	useEffect(() => {
		if (!hydrated) return;
		const interval = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(interval);
	}, [hydrated]);

	useEffect(() => {
		if (!hydrated) return;
		setTimer((current) => {
			const next = evaluate(current, now);
			if (JSON.stringify(next) !== JSON.stringify(current))
				persistTimerState(next);
			return next;
		});
	}, [hydrated, now]);

	useEffect(() => {
		if (!hydrated) return;
		let cancelled = false;
		let retry: number | undefined;
		const reconcile = () => {
			void invoke("set_autostart", { enabled: timer.startOnLogin })
				.then(() => undefined)
				.catch(() => {
					if (!cancelled) retry = window.setTimeout(reconcile, 5_000);
				});
		};
		reconcile();
		return () => {
			cancelled = true;
			if (retry !== undefined) window.clearTimeout(retry);
		};
	}, [hydrated, timer.startOnLogin]);

	useEffect(() => {
		const previous = previousCompletion.current;
		const completedMode =
			previous.status === "running" && timer.status === "completed"
				? timer.mode
				: previous.status === "running" &&
						timer.status === "running" &&
						previous.mode !== timer.mode
					? previous.mode
					: null;
		if (completedMode !== null) {
			void invoke("tempo_show").catch(() => undefined);
			if (timer.soundEnabled) playCompletionSound(timer.completionSound);
			void sendCompletionNotification(completedMode);
		}
		previousCompletion.current = { status: timer.status, mode: timer.mode };
	}, [
		playCompletionSound,
		timer.completionSound,
		timer.mode,
		timer.soundEnabled,
		timer.status,
	]);

	useEffect(
		() => () => {
			if (audioTimeoutRef.current !== null)
				window.clearTimeout(audioTimeoutRef.current);
			audioRef.current?.pause();
		},
		[],
	);

	const state = displayState(timer, now);
	const progress = useMemo(() => getProgress(state), [state]);
	const selectMode = (mode: PomodoroMode) => {
		if (!hydrated) return;
		commit((current) => ({
			...current,
			mode,
			status: "idle",
			elapsedBeforeStartMs: 0,
			startedAtMs: null,
			completedAtMs: null,
		}));
	};
	const toggleStatus = () => {
		if (!hydrated) return;
		if (timer.status !== "running" && timer.soundEnabled)
			prepareAudio(timer.completionSound);
		commit((current) => {
			const now = Date.now();
			if (current.status === "running")
				return {
					...current,
					status: "paused",
					elapsedBeforeStartMs: elapsedAt(current, now),
					startedAtMs: null,
				};
			const reset =
				current.status === "completed"
					? {
							...current,
							elapsedBeforeStartMs: 0,
							completedAtMs: null,
							session: current.mode === "longBreak" ? 1 : current.session,
						}
					: current;
			return { ...reset, status: "running", startedAtMs: now };
		});
	};
	const reset = () => {
		if (!hydrated) return;
		commit((current) => ({
			...current,
			status: "idle",
			elapsedBeforeStartMs: 0,
			startedAtMs: null,
			completedAtMs: null,
		}));
	};
	const stop = reset;
	const skip = () => {
		if (!hydrated) return;
		commit((current) => {
			const mode = nextMode(
				current.mode,
				current.session,
				current.sessionsBeforeLongBreak,
			);
			return {
				...current,
				mode,
				session:
					current.mode === "longBreak"
						? 1
						: mode === "focus"
							? current.session + 1
							: current.session,
				status: "idle",
				elapsedBeforeStartMs: 0,
				startedAtMs: null,
				completedAtMs: null,
			};
		});
	};
	const updateDuration = (mode: PomodoroMode, minutes: number) => {
		if (!hydrated) return;
		const parsed = durationMinutesSchema.safeParse(minutes);
		if (parsed.success)
			commit(
				(current) => ({
					...current,
					durations: { ...current.durations, [mode]: parsed.data * 60 },
				}),
				true,
			);
	};
	const updateConfig = (
		next: Partial<
			Pick<
				PomodoroPreviewState,
				"soundEnabled" | "completionSound" | "autoAdvance" | "startOnLogin"
			>
		>,
	) => {
		if (!hydrated) return;
		if (next.startOnLogin !== undefined) {
			const enabled = next.startOnLogin;
			const request = ++autostartRequest.current;
			const reconcile = () => {
				void invoke("set_autostart", { enabled })
					.then(() => {
						if (request === autostartRequest.current)
							commit(
								(current) => ({ ...current, startOnLogin: enabled }),
								true,
							);
					})
					.catch(() => {
						if (request === autostartRequest.current)
							window.setTimeout(reconcile, 5_000);
					});
			};
			reconcile();
		}
		const configWithoutAutostart = { ...next };
		delete configWithoutAutostart.startOnLogin;
		if (Object.keys(configWithoutAutostart).length > 0)
			commit((current) => ({ ...current, ...configWithoutAutostart }), true);
	};
	const toggleSound = () => {
		if (!timer.soundEnabled) prepareAudio(timer.completionSound);
		updateConfig({ soundEnabled: !timer.soundEnabled });
	};
	const selectCompletionSound = (completionSound: CompletionSoundId) =>
		updateConfig({ completionSound });
	const previewCompletionSound = () =>
		playCompletionSound(timer.completionSound);
	const toggleAutoAdvance = () =>
		updateConfig({ autoAdvance: !timer.autoAdvance });
	const toggleAutoStart = () =>
		updateConfig({ startOnLogin: !timer.startOnLogin });
	const toggleSettings = () => {
		if (!hydrated) return;
		setTimer((current) => ({
			...current,
			settingsOpen: !current.settingsOpen,
		}));
	};

	return {
		state,
		progress,
		selectMode,
		toggleStatus,
		reset,
		skip,
		stop,
		toggleSettings,
		toggleSound,
		selectCompletionSound,
		previewCompletionSound,
		toggleAutoAdvance,
		toggleAutoStart,
		updateDuration,
		durationsInMinutes: {
			focus: Math.round(state.durations.focus / 60),
			shortBreak: Math.round(state.durations.shortBreak / 60),
			longBreak: Math.round(state.durations.longBreak / 60),
		},
	};
}
