import { useMemo, useState } from "react";

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
  autoAdvance: boolean;
  settingsOpen: boolean;
}

const durations: Record<PomodoroMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const modeLabels: Record<PomodoroMode, string> = {
  focus: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};

const modeSubtitles: Record<PomodoroMode, string> = {
  focus: "Bloque de trabajo corto, claro y sin fricción.",
  shortBreak: "Descanso breve para volver con ritmo.",
  longBreak: "Pausa más larga para cerrar el ciclo.",
};

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function getModeLabel(mode: PomodoroMode) {
  return modeLabels[mode];
}

export function getModeSubtitle(mode: PomodoroMode) {
  return modeSubtitles[mode];
}

export function getNextMode(mode: PomodoroMode): PomodoroMode {
  if (mode === "focus") return "shortBreak";
  if (mode === "shortBreak") return "focus";
  return "focus";
}

export function getProgress(state: Pick<PomodoroPreviewState, "remainingSeconds" | "durationSeconds">) {
  if (state.durationSeconds <= 0) return 0;
  return Math.max(0, Math.min(100, ((state.durationSeconds - state.remainingSeconds) / state.durationSeconds) * 100));
}

export function usePomodoroPreview() {
  const [state, setState] = useState<PomodoroPreviewState>({
    mode: "focus",
    status: "idle",
    remainingSeconds: durations.focus,
    durationSeconds: durations.focus,
    session: 2,
    sessionsBeforeLongBreak: 4,
    soundEnabled: true,
    autoAdvance: true,
    settingsOpen: false,
  });

  const progress = useMemo(() => getProgress(state), [state]);

  const selectMode = (mode: PomodoroMode) => {
    setState((current) => ({
      ...current,
      mode,
      status: "idle",
      durationSeconds: durations[mode],
      remainingSeconds: durations[mode],
    }));
  };

  const toggleStatus = () => {
    setState((current) => {
      if (current.status === "running") {
        return { ...current, status: "paused" };
      }

      return { ...current, status: "running" };
    });
  };

  const reset = () => {
    setState((current) => ({
      ...current,
      status: "idle",
      remainingSeconds: current.durationSeconds,
    }));
  };

  const skip = () => {
    const nextMode = getNextMode(state.mode);
    setState((current) => ({
      ...current,
      mode: nextMode,
      status: "idle",
      durationSeconds: durations[nextMode],
      remainingSeconds: durations[nextMode],
    }));
  };

  const stop = () => {
    setState((current) => ({
      ...current,
      status: "idle",
      remainingSeconds: current.durationSeconds,
    }));
  };

  const toggleSettings = () => {
    setState((current) => ({ ...current, settingsOpen: !current.settingsOpen }));
  };

  const toggleSound = () => {
    setState((current) => ({ ...current, soundEnabled: !current.soundEnabled }));
  };

  const toggleAutoAdvance = () => {
    setState((current) => ({ ...current, autoAdvance: !current.autoAdvance }));
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
    toggleAutoAdvance,
  };
}
