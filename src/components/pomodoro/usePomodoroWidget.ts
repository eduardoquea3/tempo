import {
	type MouseEvent,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { getProgress, usePomodoroPreview } from "./pomodoroPreview";

export function usePomodoroWidget() {
	const pomodoro = usePomodoroPreview();
	const { state } = pomodoro;
	const timerRef = useRef({
		status: state.status,
		durationSeconds: state.durationSeconds,
	});
	timerRef.current = {
		status: state.status,
		durationSeconds: state.durationSeconds,
	};
	const backendProgress = getProgress(state);
	const progressSnapshot = useMemo(
		() => ({
			progress: backendProgress,
			durationSeconds: state.durationSeconds,
			mode: state.mode,
			session: state.session,
			status: state.status,
		}),
		[
			backendProgress,
			state.durationSeconds,
			state.mode,
			state.session,
			state.status,
		],
	);
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
	const [visualProgress, setVisualProgress] = useState(backendProgress);
	const visualProgressRef = useRef(backendProgress);
	const progressAnchor = useRef({
		value: backendProgress,
		time: performance.now(),
	});
	const previousProgressSnapshot = useRef(progressSnapshot);

	useLayoutEffect(() => {
		const previous = previousProgressSnapshot.current;
		const timerIdentityChanged =
			previous.durationSeconds !== progressSnapshot.durationSeconds ||
			previous.mode !== progressSnapshot.mode ||
			previous.session !== progressSnapshot.session;
		const resetToZero =
			previous.progress !== 0 && progressSnapshot.progress === 0;
		const idleReset =
			previous.status !== "idle" &&
			progressSnapshot.status === "idle" &&
			progressSnapshot.progress === 0;
		const completed = progressSnapshot.status === "completed";
		const shouldReset =
			timerIdentityChanged || resetToZero || idleReset || completed;

		if (shouldReset) {
			const nextProgress = completed ? 100 : progressSnapshot.progress;
			visualProgressRef.current = nextProgress;
			setVisualProgress(nextProgress);
			progressAnchor.current = {
				value: nextProgress,
				time: performance.now(),
			};
		} else if (previous.status !== progressSnapshot.status) {
			progressAnchor.current = {
				value: visualProgressRef.current,
				time: performance.now(),
			};
		}
		previousProgressSnapshot.current = progressSnapshot;
	}, [progressSnapshot]);

	useEffect(() => {
		let frameId = 0;
		let active = true;
		const updateProgress = (time: number) => {
			if (!active) return;

			if (timerRef.current.status === "running") {
				const elapsedSeconds = (time - progressAnchor.current.time) / 1000;
				const progressPerSecond =
					100 / Math.max(1, timerRef.current.durationSeconds);
				const nextProgress = Math.min(
					100,
					progressAnchor.current.value + elapsedSeconds * progressPerSecond,
				);

				if (nextProgress !== visualProgressRef.current) {
					visualProgressRef.current = nextProgress;
					setVisualProgress(nextProgress);
				}
			}

			frameId = window.requestAnimationFrame(updateProgress);
		};

		frameId = window.requestAnimationFrame(updateProgress);
		return () => {
			active = false;
			window.cancelAnimationFrame(frameId);
		};
	}, []);

	const progressOffset =
		2 * Math.PI * 44 * (1 - Math.max(0, Math.min(100, visualProgress)) / 100);

	return {
		pomodoro,
		state,
		settingsMounted,
		handleSettingsOverlayClick,
		progressOffset,
	};
}
