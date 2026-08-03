import { useEffect, useMemo, useState } from "react";

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
  durations: Record<PomodoroMode, number>;
}

const defaultDurations: Record<PomodoroMode, number> = {
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

export function getNextMode(mode: PomodoroMode, session: number, sessionsBeforeLongBreak: number): PomodoroMode {
  if (mode === "focus") return session % sessionsBeforeLongBreak === 0 ? "longBreak" : "shortBreak";
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
    remainingSeconds: defaultDurations.focus,
    durationSeconds: defaultDurations.focus,
    session: 2,
    sessionsBeforeLongBreak: 4,
    soundEnabled: true,
    autoAdvance: true,
    settingsOpen: false,
    durations: defaultDurations,
  });

  const progress = useMemo(() => getProgress(state), [state]);

  useEffect(() => {
    if (state.status !== "running") return;

    const intervalId = window.setInterval(() => {
      setState((current) => {
        if (current.status !== "running") return current;
        if (current.remainingSeconds > 1) {
          return { ...current, remainingSeconds: current.remainingSeconds - 1 };
        }

        if (!current.autoAdvance) {
          return { ...current, status: "completed", remainingSeconds: 0 };
        }

        const nextMode = getNextMode(current.mode, current.session, current.sessionsBeforeLongBreak);
        const nextSession = current.mode === "focus" ? current.session + 1 : current.session;
        const nextDuration = current.durations[nextMode];

        return {
          ...current,
          mode: nextMode,
          session: nextSession,
          durationSeconds: nextDuration,
          remainingSeconds: nextDuration,
        };
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [state.status]);

  const selectMode = (mode: PomodoroMode) => {
    setState((current) => ({
      ...current,
      mode,
      status: "idle",
      durationSeconds: current.durations[mode],
      remainingSeconds: current.durations[mode],
    }));
  };

  const toggleStatus = () => {
    setState((current) => {
      if (current.status === "running") {
        return { ...current, status: "paused" };
      }

      if (current.status === "completed") {
        return {
          ...current,
          status: "running",
          remainingSeconds: current.durationSeconds,
        };
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
    setState((current) => ({
      ...current,
      mode: getNextMode(current.mode, current.session, current.sessionsBeforeLongBreak),
      status: "idle",
      durationSeconds: current.durations[getNextMode(current.mode, current.session, current.sessionsBeforeLongBreak)],
      remainingSeconds: current.durations[getNextMode(current.mode, current.session, current.sessionsBeforeLongBreak)],
    }));
  };

  const updateDuration = (mode: PomodoroMode, minutes: number) => {
    const safeMinutes = Math.max(1, Math.min(180, Math.round(minutes) || 1));
    const nextDuration = safeMinutes * 60;

    setState((current) => ({
      ...current,
      durations: { ...current.durations, [mode]: nextDuration },
      durationSeconds: current.mode === mode ? nextDuration : current.durationSeconds,
      remainingSeconds: current.mode === mode
        ? current.status === "running"
          ? Math.max(0, nextDuration - Math.max(0, current.durationSeconds - current.remainingSeconds))
          : nextDuration
        : current.remainingSeconds,
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

  const durationsInMinutes = {
    focus: Math.round(state.durations.focus / 60),
    shortBreak: Math.round(state.durations.shortBreak / 60),
    longBreak: Math.round(state.durations.longBreak / 60),
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
    updateDuration,
    durationsInMinutes,
  };
}
