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
  startOnLogin: boolean;
  settingsOpen: boolean;
  durations: Record<PomodoroMode, number>;
}

const defaultDurations: Record<PomodoroMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const durationMinutesSchema = z.number().int().min(1).max(180);
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
  const [state, setState] = useState<PomodoroPreviewState>(() => ({
    mode: "focus", status: "idle", remainingSeconds: defaultDurations.focus,
    durationSeconds: defaultDurations.focus, session: 1, sessionsBeforeLongBreak: 4,
    soundEnabled: true, autoAdvance: true, startOnLogin: false, settingsOpen: false, durations: defaultDurations,
  }));
  const previousCompletionState = useRef({ status: state.status, mode: state.mode });
  const audioContextRef = useRef<AudioContext | null>(null);

  type BackendSnapshot = { state: { mode: PomodoroMode; status: PomodoroStatus; session: number }; config: { durations: Record<string, number>; sessionsBeforeLongBreak: number; autoAdvance: boolean; soundEnabled: boolean; startOnLogin: boolean }; durationSeconds: number; remainingSeconds: number };
  const applySnapshot = (snapshot: BackendSnapshot) => setState((current) => ({
    ...current, mode: snapshot.state.mode, status: snapshot.state.status,
    session: snapshot.state.session, durationSeconds: snapshot.durationSeconds,
    remainingSeconds: snapshot.remainingSeconds, sessionsBeforeLongBreak: snapshot.config.sessionsBeforeLongBreak,
    soundEnabled: snapshot.config.soundEnabled, autoAdvance: snapshot.config.autoAdvance,
    startOnLogin: snapshot.config.startOnLogin,
    durations: { focus: snapshot.config.durations.focusSeconds, shortBreak: snapshot.config.durations.shortBreakSeconds, longBreak: snapshot.config.durations.longBreakSeconds },
  }));

  const refresh = async () => {
    try { applySnapshot(await invoke<BackendSnapshot>("tempo_status")); } catch { /* The web preview has no timer authority. */ }
  };

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

  useEffect(() => { void refresh(); const interval = window.setInterval(() => void refresh(), 250); return () => window.clearInterval(interval); }, []);

  useEffect(() => {
    const closeSettingsOnBlur = () => {
      setState((current) => current.settingsOpen
        ? { ...current, settingsOpen: false }
        : current);
    };

    window.addEventListener("blur", closeSettingsOnBlur);
    return () => window.removeEventListener("blur", closeSettingsOnBlur);
  }, []);

  useEffect(() => () => { const audioContext = audioContextRef.current; if (audioContext && audioContext.state !== "closed") void audioContext.close(); }, []);

  const progress = useMemo(() => getProgress(state), [state]);

  useEffect(() => {
    const previous = previousCompletionState.current;
    const completed = previous.status === "running" && state.status === "completed";

    if (completed) {
      const completedMode = state.status === "completed" ? state.mode : previous.mode;
      void invoke("tempo_show").catch(() => undefined);
      if (state.soundEnabled) void playCompletionSound(prepareAudioContext());
      void sendCompletionNotification(completedMode);
    }
    previousCompletionState.current = { status: state.status, mode: state.mode };
  }, [state.mode, state.soundEnabled, state.status]);

  const run = (command: string) => void invoke<BackendSnapshot>(command).then(applySnapshot).catch(() => undefined);
  const selectMode = (mode: PomodoroMode) => void invoke<BackendSnapshot>("tempo_set_mode", { mode }).then(applySnapshot).catch(() => undefined);
  const toggleStatus = () => { if (state.status !== "running" && state.soundEnabled) prepareAudioContext(); run("tempo_toggle"); };
  const reset = () => run("tempo_reset");
  const skip = () => run("tempo_skip");

  const updateDuration = (mode: PomodoroMode, minutes: number) => {
    const parsedMinutes = durationMinutesSchema.safeParse(minutes);
    if (!parsedMinutes.success) return;

    const nextDuration = parsedMinutes.data * 60;

    const durations = { ...state.durations, [mode]: nextDuration };
    const config = { durations: { focusSeconds: durations.focus, shortBreakSeconds: durations.shortBreak, longBreakSeconds: durations.longBreak }, sessionsBeforeLongBreak: state.sessionsBeforeLongBreak, autoAdvance: state.autoAdvance, soundEnabled: state.soundEnabled, startOnLogin: state.startOnLogin };
    void invoke<BackendSnapshot>("tempo_set_config", { config }).then(applySnapshot).catch(() => undefined);
  };

  const stop = () => run("tempo_stop");

  const toggleSettings = () => {
    setState((current) => ({ ...current, settingsOpen: !current.settingsOpen }));
  };

  const updateConfig = (next: Partial<Pick<PomodoroPreviewState, "soundEnabled" | "autoAdvance" | "startOnLogin">>) => {
    const config = { durations: { focusSeconds: state.durations.focus, shortBreakSeconds: state.durations.shortBreak, longBreakSeconds: state.durations.longBreak }, sessionsBeforeLongBreak: state.sessionsBeforeLongBreak, autoAdvance: next.autoAdvance ?? state.autoAdvance, soundEnabled: next.soundEnabled ?? state.soundEnabled, startOnLogin: next.startOnLogin ?? state.startOnLogin };
    void invoke<BackendSnapshot>("tempo_set_config", { config }).then(applySnapshot).catch(() => undefined);
  };
  const toggleSound = () => { if (!state.soundEnabled) prepareAudioContext(); updateConfig({ soundEnabled: !state.soundEnabled }); };
  const toggleAutoAdvance = () => updateConfig({ autoAdvance: !state.autoAdvance });
  const toggleAutoStart = () => updateConfig({ startOnLogin: !state.startOnLogin });

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
    toggleAutoStart,
    updateDuration,
    durationsInMinutes,
  };
}
