import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getModeLabel, getModeSubtitle, formatClock, type PomodoroMode, usePomodoroPreview } from "./pomodoroPreview";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14" />
      <circle cx="9" cy="7" r="2" />
      <path d="M5 12h14" />
      <circle cx="15" cy="12" r="2" />
      <path d="M5 17h14" />
      <circle cx="11" cy="17" r="2" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6.5v11l9-5.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 6.5h3v11h-3z" />
      <path d="M12.5 6.5h3v11h-3z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v6h-6" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5v14l8-7z" />
      <path d="M16 5v14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5a4 4 0 0 0-4 4v2.2c0 .7-.2 1.4-.6 2L6 15h12l-1.4-1.8c-.4-.6-.6-1.3-.6-2V9a4 4 0 0 0-4-4z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

function BellOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5a4 4 0 0 0-4 4v2.2c0 .7-.2 1.4-.6 2L6 15h12l-1.4-1.8c-.4-.6-.6-1.3-.6-2V9a4 4 0 0 0-4-4z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
      <path d="M5 5l14 14" />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h8a4 4 0 0 1 4 4v1" />
      <path d="M17 8l2 4-4-1" />
      <path d="M17 17H9a4 4 0 0 1-4-4v-1" />
      <path d="M7 16l-2-4 4 1" />
    </svg>
  );
}

function LoopOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h8a4 4 0 0 1 4 4v1" />
      <path d="M17 8l2 4-4-1" />
      <path d="M17 17H9a4 4 0 0 1-4-4v-1" />
      <path d="M7 16l-2-4 4 1" />
      <path d="M5 5l14 14" />
    </svg>
  );
}

function ModeIcon({ mode }: { mode: PomodoroMode }) {
  return (
    <span className="mode-chip__icon" aria-hidden="true">
      {mode === "focus" ? "◉" : mode === "shortBreak" ? "◌" : "◎"}
    </span>
  );
}

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
    <div className="setting-row">
      <div className="setting-row__copy">
        <div className="setting-row__title">{label}</div>
        <div className="setting-row__hint">{hint}</div>
      </div>
      <button className="toggle" type="button" aria-pressed={pressed} onClick={onClick}>
        <span className="toggle__icon">{pressed ? icon : offIcon}</span>
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
  return (
    <label className="duration-field">
      <span>{label}</span>
      <span className="duration-field__input">
        <input
          type="number"
          min="1"
          max="180"
          value={value}
          aria-label={`${label} en minutos`}
          onChange={(event) => onChange(mode, Number(event.target.value))}
        />
        <span>min</span>
      </span>
    </label>
  );
}

function SessionDots({ activeIndex, total }: { activeIndex: number; total: number }) {
  return (
    <div className="session-strip" aria-label="Sesiones actuales">
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={index < activeIndex ? "session-strip__dot is-filled" : "session-strip__dot"}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function PomodoroWidget() {
  const pomodoro = usePomodoroPreview();
  const { state } = pomodoro;
  const widgetStyle = { ["--progress" as never]: `${pomodoro.progress}%` } as CSSProperties;
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
      if (event.code !== "Space" || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
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
    <main className="stage">
      <section
        className="widget"
        data-mode={state.mode}
        data-status={state.status}
        style={widgetStyle}
      >
        <header className="widget__topbar">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true" />
            <div className="brand__text">
              <div className="brand__title">Pomodoro</div>
              <div className="brand__meta">{getModeLabel(state.mode)} session · {Math.round(state.durationSeconds / 60)} min</div>
            </div>
          </div>

          <div className="toolbar">
             <button
               className="icon-btn"
               type="button"
               aria-label="Abrir opciones"
               aria-expanded={state.settingsOpen}
               onClick={pomodoro.toggleSettings}
             >
              <MenuIcon />
            </button>
          </div>
        </header>

        <ScrollArea className="widget__main">
          <div className="widget__main-content">
          <div className="mode-bar" role="tablist" aria-label="Modos de temporizador">
            {(["focus", "shortBreak", "longBreak"] as const).map((mode) => (
              <button
                key={mode}
                className="mode-chip"
                type="button"
                aria-pressed={state.mode === mode}
                onClick={() => pomodoro.selectMode(mode)}
              >
                <ModeIcon mode={mode} />
                {mode === "focus" ? "Focus" : mode === "shortBreak" ? "Short break" : "Long break"}
              </button>
            ))}
          </div>

          <section className="timer-dial" aria-label="Temporizador">
            <div className="timer-dial__ring">
              <div className="timer-dial__core">
                <div className="timer-dial__label">{getModeLabel(state.mode)}</div>
                <div className="timer-dial__time" aria-live="polite">
                  {formatClock(state.remainingSeconds)}
                </div>
                <div className="timer-dial__subtitle">{getModeSubtitle(state.mode)}</div>
              </div>
            </div>
          </section>

          <div className="session-stack">
            <div className="session-stack__meta">
              <span>Sesión {state.session}</span>
              <span>Long break en {state.sessionsBeforeLongBreak}</span>
            </div>
            <SessionDots activeIndex={state.session - 1} total={state.sessionsBeforeLongBreak} />
          </div>

          <div className="control-bar">
            <button className="action action--primary" type="button" onClick={pomodoro.toggleStatus}>
              {state.status === "running" ? <PauseIcon /> : <PlayIcon />}
              <span>{state.status === "running" ? "Pause" : state.status === "paused" ? "Resume" : "Start"}</span>
            </button>

            <button className="action" type="button" onClick={pomodoro.reset}>
              <ResetIcon />
              <span>Reset</span>
            </button>

            <button className="action" type="button" onClick={pomodoro.skip}>
              <SkipIcon />
              <span>Skip</span>
            </button>

            <button className="action action--danger" type="button" onClick={pomodoro.stop}>
              <span className="action__stop" aria-hidden="true" />
              <span>Stop</span>
            </button>
          </div>

           </div>
         </ScrollArea>

        <footer className="widget__footer">
          <div className="status-pill">
            <span className={state.status === "running" ? "status-pill__dot is-live" : "status-pill__dot"} aria-hidden="true" />
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

          <div className="shortcut">
            <span className="kbd">Space</span>
            <span>Play</span>
         </div>
       </footer>

        {settingsMounted && (
          <div
            className={state.settingsOpen ? "settings-overlay" : "settings-overlay is-closing"}
            role="presentation"
            onMouseDown={handleSettingsOverlayClick}
          >
            <section
              className={state.settingsOpen ? "settings-sheet" : "settings-sheet is-closing"}
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-title"
            >
              <div className="settings-sheet__handle" aria-hidden="true" />
              <header className="settings-sheet__header">
                <div>
                  <div className="settings-sheet__eyebrow">Timer setup</div>
                  <h2 id="settings-title">Opciones básicas</h2>
                </div>
                <button className="icon-btn" type="button" aria-label="Cerrar opciones" onClick={pomodoro.toggleSettings}>
                  <CloseIcon />
                </button>
              </header>

               <div className="settings-sheet__body">
                 <div className="duration-section">
                   <div className="settings-section__title">Duración por modo</div>
                   <DurationField mode="focus" label="Focus" value={pomodoro.durationsInMinutes.focus} onChange={pomodoro.updateDuration} />
                   <DurationField mode="shortBreak" label="Short break" value={pomodoro.durationsInMinutes.shortBreak} onChange={pomodoro.updateDuration} />
                   <DurationField mode="longBreak" label="Long break" value={pomodoro.durationsInMinutes.longBreak} onChange={pomodoro.updateDuration} />
                 </div>

                 <TogglePill
                  label="Sound on finish"
                  hint="Un beep suave al completar el ciclo."
                  icon={<BellIcon />}
                  offIcon={<BellOffIcon />}
                  pressed={state.soundEnabled}
                  onClick={pomodoro.toggleSound}
                />

                <TogglePill
                  label="Auto next"
                  hint="Pasa al siguiente modo sin abrir otra ventana."
                  icon={<LoopIcon />}
                  offIcon={<LoopOffIcon />}
                  pressed={state.autoAdvance}
                  onClick={pomodoro.toggleAutoAdvance}
                />
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
