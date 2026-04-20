# PRD: Project Setup

## Problem Statement

The project workspace is currently empty. Before any game features can be built, a coherent technical foundation must be decided: which build system, UI framework, rendering library, state manager, test runner, and developer tooling will be used. Without these decisions locked in, every subsequent feature risks being built on assumptions that later conflict.

Additionally, the AI agent skills that provide guidance on the PixiJS API must be selected and installed so they are available from the first implementation commit.

## Solution

Decide and document the full technology stack for a PixiJS v8 colony management game delivered as a statically-hosted SPA. The game has three core non-rendering requirements that influence library choices from the start: **sound**, **local shared-screen multiplayer** (multiple players on the same device/browser tab), and a **gamepad-first input model**. Install the relevant PixiJS sub-skills from the `pixijs/pixijs-skills` repository.

No code is written in this PRD. Scaffolding is a separate PRD.

## User Stories

1. As a developer, I want the technology stack chosen before writing any code, so I do not have to undo architectural decisions mid-project.
2. As a developer, I want PixiJS v8 as the rendering library, so I get high-performance WebGL/WebGPU rendering for many simultaneous game objects.
3. As a developer, I want Vue 3 as the UI framework, so I can build HUD panels and menus in HTML with a component model I am familiar with.
4. As a developer, I want Vite as the build tool, so I get fast dev-server HMR and a zero-config static build output.
5. As a developer, I want TypeScript with strict mode, so type errors are caught at compile time rather than at runtime.
6. As a developer, I want Vue Router in hash mode, so the SPA works on any static host without server-side URL rewriting.
7. As a developer, I want Pinia as the state management library, so Vue components can reactively consume game-derived data without touching PixiJS objects directly.
8. As a developer, I want ESLint configured for Vue 3 and TypeScript, so code quality is enforced consistently.
9. As a developer, I want Vitest as the test runner, so unit tests share the same Vite build pipeline with no separate configuration.
10. As a developer, I want the deployment target confirmed as a static host (GitHub Pages or Netlify), so the build output requirements are clear from the start.
11. As a developer, I want an audio library chosen upfront, so sound effects and music can be added without reconsidering the stack mid-project.
12. As a player, I want sound effects and music during gameplay, so the colony feels alive and feedback is reinforced through audio.
13. As a developer, I want the input model designed for multiple simultaneous players on one device, so the game loop and input handling are not later forced into an incompatible single-player assumption.
14. As a player, I want to share a single screen with other players without needing separate devices or an internet connection, so local co-op is frictionless.
15. As a player, I want to play with a gamepad as the primary input device, so the game feels purpose-built for controllers rather than adapted from a mouse-and-keyboard experience.
16. As a developer, I want all in-game actions mappable to a gamepad, so keyboard/mouse are secondary fallbacks and no feature requires them.
17. As a developer, I want the PixiJS sub-skills installed via `npx skills add pixijs/pixijs-skills`, so AI guidance on the PixiJS API is available before implementation begins.
18. As a developer, I want the installed skills recorded in `skills-lock.json`, so the exact skill set is reproducible by any contributor.

## Implementation Decisions

### Framework Stack

- **Vue 3** (Composition API, `<script setup>` syntax) as the UI shell over the PixiJS canvas.
- **Vite** as the build tool and dev server.
- **TypeScript** with strict mode (`"strict": true`).
- **Vue Router 4** in hash mode (`createWebHashHistory`) for screen navigation.
- **Pinia** for state management.
- **PixiJS v8** (`pixi.js` package) as the rendering engine.

### Why Vue over Nuxt

Nuxt 3 was considered and rejected. This is a client-only SPA; SSR, server routes, and Nuxt's file-system conventions add overhead with no benefit for a game.

### Why not `create-pixi` scaffolding

`create-pixi` has no Vue template. Vue is added on top via `npm install` after scaffolding. The scaffolding approach is decided in a separate PRD.

### Developer Tooling

- **ESLint** with **`@antfu/eslint-config`** (Anthony Fu's opinionated flat config). It ships Vue 3, TypeScript, and formatting rules in one package, replacing the need for separate `eslint-plugin-vue` and `@vue/eslint-config-typescript` installs. No Prettier — ESLint rules handle formatting.
- **Vitest** with a `happy-dom` environment for Vue component tests.
- `@vue/test-utils` for mounting and querying Vue components in tests.

### Audio

- **`@pixi/sound`** as the audio library. It integrates directly with PixiJS's `Assets.load()` pipeline, so audio assets are loaded through the same bundle and cache system as sprites and spritesheets — eliminating a second asset-loading path.
- Howler.js was considered and rejected: it requires a parallel asset-loading system entirely separate from `Assets`, which adds unnecessary complexity.
- No server component needed; all audio assets are bundled as static files.

### Input: Gamepad-First

- **Gamepad is the primary input device.** All in-game actions must be reachable via a standard gamepad (Xbox/PlayStation layout).
- Input is read through the **Web Gamepad API** (`navigator.getGamepads()`), polled each frame inside the game loop ticker. No third-party gamepad library is required at this stage.
- Keyboard and mouse are supported as secondary fallbacks, but no feature may require them.
- Each connected gamepad maps to one player by its gamepad index.
- Input abstraction (a device-agnostic action layer) must be designed with gamepad as the canonical source; keyboard bindings are mapped onto that same action layer.

### Local Shared-Screen Multiplayer

- Multiplayer is **local, same-device, same-tab** only. No networking, WebSockets, or server state is involved.
- Up to **4 players** are supported. Each connected gamepad maps to one player by its gamepad index (indices 0–3).
- **Hot-join**: a player whose gamepad connects at any point during a session is added immediately with controls live. The simulation does not pause. No lobby phase is required to join.
- **Keyboard fallback**: at most **one** keyboard player is supported at any time. Keyboard/mouse are secondary fallbacks for a single player only; players 2–4 must use gamepads.
- The game simulation runs a single authoritative loop; all players advance the same world state.
- This model requires no backend and is fully compatible with the static deployment target.

### Deployment Target

- Fully static output (`dist/`) deployable to GitHub Pages or Netlify.
- No server-side rendering, no API routes, no Node runtime at deployment.

### PixiJS Sub-Skills to Install

All sub-skills installed via `npx skills add pixijs/pixijs-skills`:

| Sub-skill | Reason |
|---|---|
| `pixijs-application` | Core `Application.init()`, renderer, `app.stage` |
| `pixijs-assets` | Spritesheet and asset bundle loading |
| `pixijs-scene-container` | Scene graph, `zIndex`, transforms |
| `pixijs-scene-sprite` | Buildings, units, terrain tiles |
| `pixijs-scene-graphics` | Debug overlays, selection rings |
| `pixijs-scene-text` | Floating labels, counters |
| `pixijs-ticker` | Game loop delta time |
| `pixijs-events` | Click/tap input for selecting entities |
| `pixijs-performance` | Draw call optimisation, culling, `cacheAsTexture` |
| `pixijs-scene-particle-container` | Crowds, smoke, ambient particles |

## Testing Decisions

Testing strategy is deferred to the scaffolding PRD. The only decision made here is the choice of **Vitest** as the test runner.

## Out of Scope

- Project scaffolding, directory structure, and initial file creation — separate PRD.
- PixiJS integration pattern (`usePixiApp` composable, overlay layout) — separate PRD.
- Pinia store design — separate PRD.
- Vue Router route definitions — separate PRD.
- Game mechanics, colony simulation, entity AI, pathfinding — future PRDs.
- Online/networked multiplayer — explicitly out of scope; local shared-screen only.
- Mobile packaging (Capacitor, Cordova, etc.), CI/CD, asset pipeline tooling, accessibility, i18n.

## Further Notes

- PixiJS objects must never be wrapped in Vue's `ref()` or `reactive()`. Vue's Proxy-based reactivity adds per-property tracking overhead that is destructive to game-loop performance on scene graph nodes or typed arrays. This constraint must be respected in all future implementation PRDs.
- **Pinia write contract**: Pinia stores hold HUD/menu-visible summary state only (resource totals, game phase, active menu, player scores). Per-entity state (positions, velocity, health) lives exclusively in PixiJS objects and game-world data structures — never in Pinia. The game loop writes to Pinia only when a value meaningfully changes (event-rate, not frame-rate), so Vue re-renders are not triggered every tick.
- **PixiJS Application lifecycle**: `Application.init()` is called eagerly on app mount, before any Vue Router route renders. The canvas element is mounted once at the root layout component and persists for the full session. It is never destroyed or recreated on route navigation.
- Vue Router hash mode can be migrated to history mode later if the host supports URL rewriting (`_redirects` on Netlify, `nginx` rewrite rules, etc.).
