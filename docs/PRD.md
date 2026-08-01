# PRD — Pomodoro Desktop

**Nombre provisional:** Pomodoro  
**Tipo:** Aplicación desktop / background service / CLI  
**Plataformas:** Windows y Linux  
**Estado:** Propuesta inicial  
**Versión objetivo:** MVP v0.1

---

# 1. Resumen

Pomodoro será una aplicación de productividad multiplataforma para Windows y Linux enfocada en ofrecer un temporizador Pomodoro ligero, accesible y fácilmente integrable con el sistema operativo.

La aplicación funcionará principalmente en segundo plano y tendrá una interfaz gráfica pequeña y minimalista para controlar las sesiones.

En Windows, la aplicación se integrará con el **System Tray**, permitiendo consultar el estado y controlar el temporizador sin mantener una ventana abierta.

En Linux, además de la aplicación gráfica, se proporcionará una **CLI** que permitirá consultar y controlar el temporizador desde terminal y desde herramientas externas como:

- Quickshell
- Waybar
- AGS
- Eww
- Polybar
- scripts personalizados

Esto permitirá utilizar Pomodoro en distintos Window Managers y compositores, incluyendo:

- Hyprland
- Niri
- Sway
- i3
- bspwm
- AwesomeWM
- Qtile

La lógica del temporizador será independiente de la interfaz gráfica para que todas las interfaces compartan un único estado.

---

# 2. Objetivo del producto

Crear una aplicación Pomodoro:

- ligera;
- rápida;
- multiplataforma;
- utilizable completamente en segundo plano;
- controlable desde UI o CLI;
- fácil de integrar con barras y widgets externos;
- con una arquitectura extensible;
- que no dependa de mantener una ventana abierta.

El producto debe sentirse más como una **herramienta del sistema** que como una aplicación tradicional.

---

# 3. Principios del producto

## 3.1 Background first

El temporizador debe seguir funcionando independientemente de si la ventana gráfica está:

- abierta;
- minimizada;
- oculta;
- cerrada visualmente.

Cerrar la ventana no finalizará necesariamente la aplicación.

---

## 3.2 Una única fuente de verdad

El estado del Pomodoro no debe existir independientemente dentro de React, Quickshell, la CLI y el System Tray.

Debe existir un único estado central administrado por el core.

```text
                  Pomodoro Core
                       │
        ┌──────────────┼───────────────┐
        │              │               │
        ▼              ▼               ▼
       UI             CLI          System Tray
        │
        ▼
 Quickshell / Waybar

```

---

## 3.3 CLI first-class

La CLI no será solamente una herramienta de debugging.

Será una interfaz oficial del producto.

Debe ser posible utilizar Pomodoro completamente sin abrir la interfaz gráfica.

---

## 3.4 Linux friendly

La aplicación debe poder integrarse fácilmente dentro del ecosistema Linux sin requerir plugins específicos para cada Window Manager.

Las integraciones deben construirse principalmente mediante:

- CLI;
- JSON;
- streams de eventos;
- IPC.

---

## 3.5 Bajo consumo

Cuando esté ejecutándose en segundo plano, la aplicación debe utilizar una cantidad mínima de:

- CPU;
- memoria;
- operaciones de disco.

La UI no debe permanecer renderizando cuando está oculta.

---

# 4. Usuarios objetivo

## Usuario principal

Usuarios técnicos que utilizan su computadora durante largos periodos de concentración.

Especialmente:

- desarrolladores;
- diseñadores;
- estudiantes;
- usuarios de Linux;
- usuarios de Window Managers;
- usuarios que personalizan sus barras o desktop.

---

## Usuario secundario

Usuarios de Windows que quieren un Pomodoro sencillo que permanezca disponible desde el System Tray sin tener una aplicación ocupando espacio constantemente.

---

# 5. Funcionalidades principales

# 5.1 Temporizador Pomodoro

El sistema debe soportar tres tipos de sesión:

### Focus

Periodo dedicado al trabajo.

Valor predeterminado:

```text
25 minutos

```

### Short Break

Descanso corto.

Valor predeterminado:

```text
5 minutos

```

### Long Break

Descanso largo.

Valor predeterminado:

```text
15 minutos

```

Por defecto, después de cuatro sesiones Focus se podrá iniciar un Long Break.

Todos estos valores serán configurables.

---

# 5.2 Estados del temporizador

El temporizador podrá encontrarse en:

```text
Idle
Running
Paused
Completed

```

Y tendrá un modo:

```text
Focus
ShortBreak
LongBreak

```

Ejemplo:

```text
status: running
mode: focus
remaining: 18:42

```

---

# 5.3 Controles

El usuario podrá ejecutar:

```text
Start
Pause
Resume
Toggle
Skip
Stop
Reset

```

### Start

Inicia una sesión.

### Pause

Pausa el temporizador.

### Resume

Continúa un temporizador pausado.

### Toggle

Alterna:

```text
Running -> Paused
Paused -> Running
Idle -> Start

```

Útil especialmente para keybindings.

### Skip

Finaliza la sesión actual y continúa hacia la siguiente.

### Stop

Detiene completamente la sesión.

### Reset

Reinicia el tiempo de la sesión actual.

---

# 5.4 Ciclo Pomodoro

El sistema deberá gestionar automáticamente el ciclo:

```text
Focus
  ↓
Short Break
  ↓
Focus
  ↓
Short Break
  ↓
Focus
  ↓
Short Break
  ↓
Focus
  ↓
Long Break

```

La cantidad de sesiones antes del descanso largo será configurable.

Ejemplo:

```toml
sessions_before_long_break = 4

```

---

# 6. Aplicación gráfica

La aplicación tendrá una interfaz deliberadamente pequeña.

Tamaño aproximado inicial:

```text
300 x 220

```

Ejemplo conceptual:

```text
┌───────────────────────────┐
│                           │
│          FOCUS            │
│                           │
│          18:42            │
│                           │
│       ◀  ⏸  ▶            │
│                           │
│       ● ● ○ ○             │
│                           │
└───────────────────────────┘

```

La interfaz debe mostrar como mínimo:

- tipo de sesión;
- tiempo restante;
- estado;
- sesión actual;
- controles básicos.

---

# 7. Comportamiento de la ventana

La ventana deberá ser:

- pequeña;
- no maximizable;
- opcionalmente sin decoraciones;
- rápida de abrir;
- rápida de ocultar.

Cerrar la ventana mediante `X` deberá por defecto:

```text
Hide window

```

en lugar de:

```text
Terminate process

```

La aplicación seguirá ejecutándose en segundo plano.

Existirá una acción explícita:

```text
Quit

```

para finalizar completamente el proceso.

---

# 8. System Tray

En Windows, Pomodoro debe aparecer dentro del área de System Tray.

Ejemplo:

```text
🍅 Pomodoro

18:42 — Focus
────────────────
Pause
Skip
────────────────
Open
Settings
────────────────
Quit

```

Desde el tray se podrá:

- visualizar el estado;
- abrir la ventana;
- iniciar sesión;
- pausar;
- continuar;
- saltar;
- detener;
- salir de la aplicación.

El icono podrá cambiar según el estado.

Ejemplo:

```text
Idle       → Pomodoro normal
Focus      → Focus activo
Break      → Break
Paused     → Paused

```

---

# 9. CLI

El proyecto incluirá una CLI oficial.

Nombre provisional:

```bash
pomodoro

```

## Comandos básicos

```bash
pomodoro start
pomodoro pause
pomodoro resume
pomodoro toggle
pomodoro skip
pomodoro stop
pomodoro reset

```

Consultar estado:

```bash
pomodoro status

```

Ejemplo:

```text
Focus — 18:42

```

---

# 10. Salida JSON

Para permitir integraciones externas:

```bash
pomodoro status --json

```

deberá retornar una estructura estable.

Ejemplo:

```json
{
  "version": 1,
  "mode": "focus",
  "status": "running",
  "remaining_seconds": 1122,
  "duration_seconds": 1500,
  "progress": 0.252,
  "session": 2,
  "sessions_before_long_break": 4
}

```

Esto actuará como una API pública para scripts e integraciones.

---

# 11. Formatos simplificados

Para evitar que las barras tengan que procesar JSON:

```bash
pomodoro remaining

```

Resultado:

```text
18:42

```

También podrá existir:

```bash
pomodoro status --format "{icon} {remaining}"

```

Resultado:

```text
󰔟 18:42

```

Variables previstas:

```text
{mode}
{status}
{remaining}
{remaining_seconds}
{duration}
{progress}
{session}
{icon}

```

---

# 12. Event stream

Para evitar polling constante:

```bash
pomodoro watch

```

mantendrá el proceso abierto y emitirá cambios.

Ejemplo:

```json
{"event":"started","mode":"focus","remaining_seconds":1500}
{"event":"tick","remaining_seconds":1499}
{"event":"tick","remaining_seconds":1498}
{"event":"paused","remaining_seconds":1498}

```

Esto permitirá mantener widgets sincronizados sin ejecutar:

```bash
pomodoro status

```

cada segundo.

---

# 13. IPC

Las interfaces deberán comunicarse mediante IPC con el proceso que mantiene el estado.

## Linux

Preferentemente:

```text
Unix Domain Socket

```

Ubicación:

```text
$XDG_RUNTIME_DIR/pomodoro/pomodoro.sock

```

Ejemplo:

```text
/run/user/1000/pomodoro/pomodoro.sock

```

## Windows

Se utilizará:

```text
Named Pipes

```

Por ejemplo:

```text
\\.\pipe\pomodoro

```

---

# 14. Protocolo IPC

El protocolo será independiente del transporte.

Ejemplo request:

```json
{
  "version": 1,
  "command": "pause"
}

```

Response:

```json
{
  "ok": true,
  "state": {
    "mode": "focus",
    "status": "paused",
    "remaining_seconds": 1034
  }
}

```

Esto permitirá cambiar en el futuro:

```text
Unix Socket
Named Pipe
D-Bus
HTTP

```

sin modificar la lógica del Pomodoro.

---

# 15. Integración con Linux

Una de las funciones principales del proyecto será permitir que otros programas consuman el estado del Pomodoro.

Casos de uso:

```text
Quickshell
Waybar
Eww
AGS
Polybar
Rofi
shell scripts

```

Ejemplo de barra:

```text
CPU 14%  │  RAM 5.2G  │  󰔟 18:42  │  10:32

```

Al hacer click podría ejecutar:

```bash
pomodoro toggle

```

Click secundario:

```bash
pomodoro gui

```

---

# 16. GUI desde CLI

Debe ser posible controlar la UI desde terminal.

```bash
pomodoro gui

```

abre la interfaz.

También:

```bash
pomodoro gui --hide

```

y eventualmente:

```bash
pomodoro gui --toggle

```

Esto permitirá crear keybindings.

Por ejemplo Hyprland:

```text
SUPER + P

```

ejecutaría:

```bash
pomodoro gui --toggle

```

Mientras:

```text
SUPER + SHIFT + P

```

podría ejecutar:

```bash
pomodoro toggle

```

---

# 17. Notificaciones

Cuando termine una sesión, la aplicación deberá enviar una notificación del sistema.

Ejemplo:

```text
Pomodoro completed

Time for a short break.

```

Para un break:

```text
Break finished

Ready to focus?

```

Opciones configurables:

```text
notifications = true
sound = true

```

---

# 18. Audio

Opcionalmente se reproducirá un sonido cuando:

- termine Focus;
- termine Short Break;
- termine Long Break.

Inicialmente se utilizarán sonidos incluidos con la aplicación.

Posteriormente se podrá permitir configurar sonidos personalizados.

---

# 19. Autostart

El usuario podrá configurar Pomodoro para ejecutarse al iniciar sesión.

```text
Start Pomodoro on login

```

Al iniciar automáticamente:

- el proceso empieza;
- la UI permanece oculta;
- el System Tray aparece;
- el temporizador permanece Idle.

---

# 20. Configuración

Las opciones principales serán:

```text
Focus duration
Short Break duration
Long Break duration
Sessions before long break

Auto start Focus
Auto start Break

Notifications
Sound

Start on login

Always on top

```

---

# 21. Archivo de configuración

Se utilizará un formato editable manualmente.

Preferentemente:

```text
TOML

```

Ejemplo:

```toml
[timer]
focus = 25
short_break = 5
long_break = 15
sessions_before_long_break = 4

[behavior]
auto_start_focus = false
auto_start_break = false

[notifications]
enabled = true
sound = true

[desktop]
start_on_login = false

```

Esto es especialmente importante para usuarios Linux.

---

# 22. Persistencia

## MVP

Inicialmente no será necesario SQLite.

Podrán utilizarse archivos locales para:

```text
configuration
state

```

Ejemplo Linux:

```text
~/.config/pomodoro/config.toml

~/.local/state/pomodoro/state.json

```

En Windows deberán utilizarse los directorios estándar de application data.

---

# 23. Restauración de estado

Si Pomodoro se cierra accidentalmente mientras existe una sesión:

```text
Focus
10:32 restantes

```

al reiniciarlo deberá poder determinar correctamente si:

- la sesión continúa;
- ya terminó;
- estaba pausada.

No se dependerá de decrementar una variable cada segundo.

En su lugar se almacenará información temporal.

Ejemplo:

```text
started_at
ends_at
paused_at
remaining_at_pause

```

---

# 24. Manejo de suspensión

Si el equipo entra en suspensión:

```text
Focus
10:00 restantes

↓ laptop suspendida 20 minutos

Resume

```

Pomodoro deberá detectar que el tiempo ya finalizó.

El temporizador será calculado mediante timestamps/tiempo monotónico según corresponda y no mediante:

```text
remaining -= 1

```

cada segundo.

---

# 25. Historial — fase posterior

Una versión posterior podrá almacenar sesiones terminadas.

Información:

```text
started_at
ended_at
duration
mode
completed

```

Esto permitirá generar estadísticas.

---

# 26. Estadísticas — fase posterior

Ejemplos:

```text
Today

6 Pomodoros
2h 30m Focus

```

Otros periodos:

```text
Today
Week
Month
Year

```

Métricas:

```text
Focus sessions
Focus time
Completed sessions
Interrupted sessions
Average session duration

```

---

# 27. Presets

Posteriormente podrán existir presets.

Ejemplo:

```text
Classic
25 / 5 / 15

Deep Work
50 / 10 / 30

Quick
15 / 3 / 10

```

También presets personalizados.

---

# 28. Arquitectura

Se utilizará una arquitectura separando la lógica de negocio de la UI.

```text
                       ┌────────────────┐
                       │ Pomodoro Core  │
                       │     Rust       │
                       └───────┬────────┘
                               │
               ┌───────────────┼────────────────┐
               │               │                │
               ▼               ▼                ▼
             IPC             Tray              GUI
               │                                 │
               ▼                                 ▼
             CLI                               Tauri
               │
       ┌───────┴─────────┐
       ▼                 ▼
   Quickshell          Waybar
       │
       ▼
   Other tools

```

---

# 29. Tecnologías

## Core

**Rust**

Responsable de:

- timer;
- estado;
- sesiones;
- configuración;
- persistencia;
- IPC;
- eventos;
- lógica Pomodoro.

### Motivos

- bajo consumo de recursos;
- binarios nativos;
- buen soporte Windows/Linux;
- excelente opción para herramientas CLI;
- integración natural con Tauri;
- buen manejo de concurrencia;
- sin runtime adicional.

---

# 30. Desktop

## Tauri 2

Tauri será utilizado para:

- crear la aplicación desktop;
- ventana;
- System Tray;
- autostart;
- notificaciones;
- integración con el sistema operativo.

Ventajas frente a una solución basada completamente en Electron:

- menor consumo de memoria;
- binarios más pequeños;
- backend en Rust compartido con el core;
- buena integración con APIs nativas.

---

# 31. Frontend

Stack propuesto:

```text
React
TypeScript
Tailwind CSS

```

La UI será suficientemente pequeña como para evitar introducir una arquitectura frontend compleja.

Estructura aproximada:

```text
src/
├── components/
│   ├── Timer.tsx
│   ├── TimerControls.tsx
│   ├── SessionIndicator.tsx
│   └── Settings.tsx
│
├── hooks/
│   └── usePomodoro.ts
│
├── pages/
│   ├── Timer.tsx
│   └── Settings.tsx
│
└── App.tsx

```

---

# 32. Runtime frontend

Se utilizará:

```text
Bun

```

para:

- instalación de dependencias;
- scripts;
- desarrollo frontend;
- builds web asociados a Tauri.

---

# 33. CLI

La CLI estará escrita en Rust.

Librería propuesta:

```text
clap

```

Ejemplo:

```rust
enum Command {
    Start,
    Pause,
    Resume,
    Toggle,
    Skip,
    Stop,
    Reset,
    Status,
    Watch,
    Gui,
}

```

---

# 34. Async runtime

Se utilizará:

```text
Tokio

```

para:

- IPC;
- múltiples clientes;
- streams de eventos;
- tareas del background service.

---

# 35. Serialización

Se utilizará:

```text
serde
serde_json

```

para:

- IPC;
- estado;
- CLI JSON;
- eventos.

---

# 36. Configuración

Para configuración:

```text
serde
toml

```

---

# 37. Persistencia futura

Cuando se añada historial y estadísticas:

```text
SQLite

```

Opciones posibles:

```text
rusqlite

```

o:

```text
sqlx

```

No será necesario para el MVP.

---

# 38. Workspace

El proyecto deberá utilizar un Cargo Workspace.

Estructura propuesta:

```text
pomodoro/
│
├── Cargo.toml
│
├── crates/
│   │
│   ├── pomodoro-core/
│   │   └── src/
│   │       ├── timer.rs
│   │       ├── session.rs
│   │       ├── state.rs
│   │       ├── config.rs
│   │       └── lib.rs
│   │
│   ├── pomodoro-ipc/
│   │   └── src/
│   │       ├── protocol.rs
│   │       ├── client.rs
│   │       ├── server.rs
│   │       └── transport/
│   │
│   └── pomodoro-cli/
│       └── src/
│
├── src-tauri/
│   └── src/
│       ├── main.rs
│       ├── tray.rs
│       ├── commands.rs
│       └── notifications.rs
│
└── src/
    ├── components/
    ├── hooks/
    ├── pages/
    └── App.tsx

```

---

# 39. Pomodoro Core

`pomodoro-core` no deberá conocer:

```text
Tauri
React
System Tray
Quickshell
Waybar

```

Solamente manejará:

```text
Timer
Session
State
Config
Events

```

Esto permitirá utilizarlo posteriormente dentro de:

```text
desktop app
daemon
CLI
tests
mobile app

```

---

# 40. Modelo de estado

Ejemplo conceptual:

```rust
struct PomodoroState {
    mode: Mode,
    status: Status,

    duration: Duration,

    started_at: Option<DateTime>,
    ends_at: Option<DateTime>,

    paused_remaining: Option<Duration>,

    session: u32,
}

```

Tipos:

```rust
enum Mode {
    Focus,
    ShortBreak,
    LongBreak,
}

enum Status {
    Idle,
    Running,
    Paused,
    Completed,
}

```

---

# 41. Eventos internos

El core emitirá eventos como:

```text
TimerStarted
TimerPaused
TimerResumed
TimerStopped
TimerCompleted
TimerSkipped
SessionChanged
ConfigChanged

```

Los consumidores podrán reaccionar independientemente.

Ejemplo:

```text
TimerCompleted
     │
     ├── notification
     ├── sound
     ├── tray update
     ├── IPC broadcast
     └── next session

```

---

# 42. Single Instance

La aplicación deberá permitir únicamente una instancia del servidor Pomodoro.

Ejemplo:

```text
pomodoro.exe
pomodoro.exe

```

La segunda instancia no creará un temporizador independiente.

En su lugar podrá:

```text
mostrar la instancia existente

```

o enviarle un comando.

Esto evita tener dos timers simultáneamente.

---

# 43. API versionada

Las respuestas utilizadas por aplicaciones externas incluirán una versión.

```json
{
  "version": 1
}

```

Esto permitirá modificar el protocolo en futuras versiones sin romper integraciones existentes.

---

# 44. Requisitos no funcionales

## Rendimiento

En background:

- CPU prácticamente 0% cuando está idle;
- sin rendering continuo de la UI;
- memoria mínima razonable;
- sin polling agresivo.

## Inicio

La aplicación debe iniciar rápidamente.

## Offline

Todas las funcionalidades principales funcionarán:

```text
100% offline

```

No será necesaria una cuenta.

## Privacidad

Los datos permanecerán inicialmente en el dispositivo.

No existirá telemetría obligatoria.

---

# 45. MVP — v0.1

La primera versión tendrá:

## Timer

- Focus
- Short Break
- Long Break
- Start
- Pause
- Resume
- Toggle
- Stop
- Skip
- Reset

## Sessions

- contador de sesiones;
- Long Break configurable.

## Desktop

- Tauri;
- ventana pequeña;
- hide on close;
- System Tray;
- ejecución background.

## CLI

```text
start
pause
resume
toggle
skip
stop
reset
status
status --json
watch
gui

```

## IPC

```text
Unix Domain Socket — Linux
Named Pipe — Windows

```

## System

- notifications;
- sound;
- autostart;
- single instance.

## Config

- Focus duration;
- breaks;
- sessions;
- auto start;
- notifications;
- autostart.

## Linux

Documentación inicial para integrar con:

```text
Quickshell
Waybar

```

---

# 46. v0.2

Añadir:

- SQLite;
- historial;
- estadísticas;
- sesiones diarias;
- tiempo Focus diario;
- vista semanal;
- presets.

---

# 47. v0.3

Añadir:

- custom presets;
- temas;
- selección de sonidos;
- custom notification behavior;
- comandos CLI adicionales;
- mejor API para widgets.

---

# 48. v0.4

Evaluar:

```text
D-Bus API para Linux

```

permitiendo integración nativa con aplicaciones Linux.

Mantener CLI + Unix Socket para compatibilidad.

---

# 49. Posibles funcionalidades futuras

No forman parte del MVP:

- tareas asociadas a sesiones;
- etiquetas;
- proyectos;
- estadísticas avanzadas;
- objetivos diarios;
- Pomodoros diarios objetivo;
- streaks;
- sincronización entre dispositivos;
- exportación de historial;
- plugins;
- scripting API;
- mobile companion;
- integración con VS Code;
- integración con Neovim;
- integración con calendario.

---

# 50. Fuera del alcance inicial

El MVP no incluirá:

- autenticación;
- cuentas;
- backend remoto;
- sincronización cloud;
- colaboración;
- equipos;
- aplicación móvil;
- integración directa con calendarios;
- gamificación compleja.

El objetivo inicial será construir un Pomodoro local excepcional antes de añadir funcionalidades adicionales.

---

# 51. Flujo principal

Inicio:

```text
Start application
       │
       ▼
Load config
       │
       ▼
Load previous state
       │
       ▼
Start IPC server
       │
       ▼
Create tray
       │
       ▼
Background ready

```

El usuario ejecuta:

```bash
pomodoro start

```

Flujo:

```text
CLI
 │
 ▼
IPC
 │
 ▼
Pomodoro Core
 │
 ├── update state
 ├── calculate end time
 └── emit TimerStarted
            │
            ├── update tray
            ├── update GUI
            └── broadcast IPC

```

---

# 52. Ejemplo de experiencia Windows

El usuario inicia Windows.

Pomodoro arranca automáticamente en segundo plano.

En System Tray:

```text
🍅

```

El usuario abre el menú:

```text
Pomodoro
─────────────
Start Focus
Open
Settings
Quit

```

Empieza Focus:

```text
🍅 24:52

```

Al terminar:

```text
Pomodoro complete

Take a 5 minute break.

```

La ventana nunca tuvo que permanecer abierta.

---

# 53. Ejemplo de experiencia Linux

El usuario configura Hyprland para iniciar:

```bash
pomodoro

```

Su Quickshell ejecuta:

```bash
pomodoro watch

```

La barra muestra:

```text
󰔟 18:42

```

El usuario tiene:

```text
SUPER + SHIFT + P

```

configurado para:

```bash
pomodoro toggle

```

Y:

```text
SUPER + P

```

para:

```bash
pomodoro gui --toggle

```

Puede usar prácticamente toda la aplicación sin mantener abierta la interfaz gráfica.

---

# 54. Criterios de éxito del MVP

Se considerará que el MVP cumple su objetivo cuando:

1. Pomodoro pueda permanecer funcionando sin una ventana visible.
2. El temporizador continúe correctamente después de suspensiones del sistema.
3. Windows pueda controlar el timer desde System Tray.
4. Linux pueda obtener el estado mediante:

```bash
pomodoro status

```

5. Una barra externa pueda obtener información mediante:

```bash
pomodoro status --json

```

6. Una integración pueda recibir actualizaciones mediante:

```bash
pomodoro watch

```

7. La UI y CLI controlen exactamente el mismo estado.
8. Solo exista una instancia activa del Pomodoro.
9. La configuración persista entre reinicios.
10. Quickshell o Waybar puedan integrar el Pomodoro sin acceder al código interno de la aplicación.

---

# 55. Stack final propuesto

```text
Desktop
├── Tauri 2
├── React
├── TypeScript
└── Tailwind CSS

Core
├── Rust
├── Tokio
└── Serde

CLI
├── Rust
└── Clap

IPC
├── Unix Domain Sockets    Linux
├── Named Pipes            Windows
├── Serde
└── JSON protocol

Config
├── TOML
└── Serde

Persistence — MVP
├── config.toml
└── state.json

Persistence — Future
└── SQLite

Frontend tooling
└── Bun

```

---

# 56. Visión

Pomodoro no busca ser únicamente otra aplicación con un contador de 25 minutos.

La idea es construir un **Pomodoro orientado al sistema operativo**, donde el motor funciona independientemente de cualquier interfaz.

```text
Pomodoro Core
     │
     ├── Desktop UI
     ├── System Tray
     ├── CLI
     ├── Quickshell
     ├── Waybar
     ├── Eww
     ├── AGS
     ├── scripts
     └── futuras integraciones

```

La UI oficial será simplemente uno de los clientes del motor.

Este enfoque permitirá que Pomodoro sea una aplicación sencilla para un usuario de Windows y, al mismo tiempo, una herramienta flexible y profundamente integrable para usuarios avanzados de Linux.