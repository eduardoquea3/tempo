import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { z } from "zod";

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

export const durationMinutesSchema = z.number().int().min(1).max(180);
const durationSecondsSchema = z.number().int().min(60).max(180 * 60);
const persistedSettingsSchema = z.object({
  durations: z.object({
    focus: durationSecondsSchema,
    shortBreak: durationSecondsSchema,
    longBreak: durationSecondsSchema,
  }).partial().optional(),
  soundEnabled: z.boolean().optional(),
  autoAdvance: z.boolean().optional(),
}).partial();

const settingsStorageKey = "tempo-pomodoro-settings";

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
  const safe = Math.max(0, Math.ceil(totalSeconds));
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

function readPersistedSettings() {
  try {
    const stored = window.localStorage.getItem(settingsStorageKey);
    if (!stored) return null;

    const result = persistedSettingsSchema.safeParse(JSON.parse(stored));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function playWebCompletionSound(audioContext: AudioContext | null) {
  if (!audioContext) return;

  const play = () => {
    try {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.24, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.28);
    } catch {
      // Audio may be unavailable in restricted webviews; the timer must keep working.
    }
  };

  if (audioContext.state === "suspended") {
    void audioContext.resume().then(play).catch(() => undefined);
    return;
  }

  try {
    play();
  } catch {
    // Audio may be unavailable in restricted webviews; the timer must keep working.
  }
}

async function playCompletionSound(audioContext: AudioContext | null) {
  try {
    await invoke("play_completion_sound");
  } catch {
    playWebCompletionSound(audioContext);
  }
}

async function sendCompletionNotification(mode: PomodoroMode) {
  try {
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      permissionGranted = await requestPermission() === "granted";
    }

    if (permissionGranted) {
      await sendNotification({
        title: "Tempo",
        body: `${getModeLabel(mode)} terminó.`,
      });
    }
  } catch {
    // Notifications may be unavailable or denied by the operating system.
  }
}

export function usePomodoroPreview() {
  const [state, setState] = useState<PomodoroPreviewState>(() => {
    const persisted = readPersistedSettings();
    const durations = { ...defaultDurations, ...persisted?.durations };

    return {
      mode: "focus",
      status: "idle",
      remainingSeconds: durations.focus,
      durationSeconds: durations.focus,
      session: 2,
      sessionsBeforeLongBreak: 4,
      soundEnabled: persisted?.soundEnabled ?? true,
      autoAdvance: persisted?.autoAdvance ?? true,
      settingsOpen: false,
      durations,
    };
  });
  const previousCompletionState = useRef({ status: state.status, mode: state.mode });
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTickAtRef = useRef<number | null>(null);

  const prepareAudioContext = () => {
    try {
      if (!audioContextRef.current && typeof window.AudioContext !== "undefined") {
        audioContextRef.current = new window.AudioContext();
      }

      const audioContext = audioContextRef.current;
      if (audioContext?.state === "suspended") void audioContext.resume().catch(() => undefined);
      return audioContext;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    return () => {
      const audioContext = audioContextRef.current;
      if (audioContext && audioContext.state !== "closed") void audioContext.close();
    };
  }, []);

  const progress = useMemo(() => getProgress(state), [state]);

  useEffect(() => {
    try {
      window.localStorage.setItem(settingsStorageKey, JSON.stringify({
        durations: state.durations,
        soundEnabled: state.soundEnabled,
        autoAdvance: state.autoAdvance,
      }));
    } catch {
      // Settings still work for the current session when storage is unavailable.
    }
  }, [state.autoAdvance, state.durations, state.soundEnabled]);

  useEffect(() => {
    if (state.status !== "running") {
      lastTickAtRef.current = null;
      return;
    }

    lastTickAtRef.current = performance.now();

    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const elapsedSeconds = Math.max(0, (now - (lastTickAtRef.current ?? now)) / 1000);
      lastTickAtRef.current = now;

      setState((current) => {
        if (current.status !== "running") return current;
        if (current.remainingSeconds > elapsedSeconds) {
          return { ...current, remainingSeconds: current.remainingSeconds - elapsedSeconds };
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
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [state.status]);

  useEffect(() => {
    const previous = previousCompletionState.current;
    const completed = previous.status === "running"
      && (state.status === "completed" || previous.mode !== state.mode);

    if (completed) {
      const completedMode = state.status === "completed" ? state.mode : previous.mode;
      if (state.soundEnabled) void playCompletionSound(prepareAudioContext());
      void sendCompletionNotification(completedMode);
    }
    previousCompletionState.current = { status: state.status, mode: state.mode };
  }, [state.mode, state.soundEnabled, state.status]);

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
    if (state.status !== "running" && state.soundEnabled) prepareAudioContext();

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
    setState((current) => {
      const nextMode = getNextMode(current.mode, current.session, current.sessionsBeforeLongBreak);
      return {
        ...current,
        mode: nextMode,
        session: current.mode === "focus" ? current.session + 1 : current.session,
        status: "idle",
        durationSeconds: current.durations[nextMode],
        remainingSeconds: current.durations[nextMode],
      };
    });
  };

  const updateDuration = (mode: PomodoroMode, minutes: number) => {
    const parsedMinutes = durationMinutesSchema.safeParse(minutes);
    if (!parsedMinutes.success) return;

    const nextDuration = parsedMinutes.data * 60;

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
    if (!state.soundEnabled) prepareAudioContext();
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
