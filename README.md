# pixi-square

A collection of games built with [Phaser 4](https://phaser.io/) and [Vue 3](https://vuejs.org/). The framework provides isolated game instances, dynamic routing, and a shared infrastructure for multi-game development.

> **Status**: Currently migrating from single-game (Grid World) to multi-game collection. See `docs/adr/` and epic `pixi-square-ejb` for architecture details.

## Tech stack

| Layer | Library |
|---|---|
| Game engine | Phaser 4 |
| UI / routing | Vue 3, Vue Router (hash mode), Pinia |
| Build | Vite + `vue-tsc` |
| Tests | Vitest + `@vue/test-utils` + happy-dom |
| Lint | ESLint via `@antfu/eslint-config` |

## Project structure (Multi-Game Model)

```
src/
  main.ts                    ← Vue entry point
  App.vue                    ← mounts <RouterView>

  shared/                    ← Shared infrastructure (Vue-free in systems/ + utils/)
    systems/                 ← Reusable ECS systems
    utils/                   ← EventBus factory, StartGame factory, utilities
    components/              ← Reusable Vue components (GameTile, etc.)
    views/                   ← Reusable Vue views (AppLayout, MenuView, etc.)

  games/                     ← Game collection (each game is isolated)
    grid-world/              ← Example: Grid-world game
      index.ts               ← Exports manifest + factory
      manifest.ts            ← { id, title, thumbnail, sceneNames, startScene }
      scenes/                ← Game-specific Phaser scenes (Boot, MainMenu, GameScene, etc.)
      systems/               ← Game-specific ECS systems
      utils/                 ← Game-specific utilities
      components/            ← Game-specific Vue components
      views/
        GameView.vue         ← Entry point: creates Phaser instance

    puzzle-game/             ← Future game (follows same pattern)
      (same structure as grid-world/)

    games-registry.ts        ← Loader: collects all game manifests

  router/                    ← Vue Router configuration
  stores/                    ← Pinia stores (registry, per-game state)
  assets/                    ← CSS and static assets
```

### Legacy Structure (During Migration)

Temporarily, `src/game/` may still contain shared logic and the original grid-world scenes until full migration is complete. See [AGENTS.md](AGENTS.md) for boundary details.

## Dev commands

```sh
npm install          # install dependencies
npm run dev          # dev server (http://localhost:5173)
npm run build        # type-check + production build → dist/
npm run test:unit    # Vitest unit tests
npm run lint         # ESLint (auto-fix)
```

## Next Steps

1. **Implement game registry loader** — `src/games/games-registry.ts` and discovery mechanism
2. **Refactor router** — Dynamic route registration based on loaded manifests
3. **Migrate grid-world** — Move current game to `src/games/grid-world/`
4. **Create game-scoped stores** — Per-game `currentScene` and `EventBus`
5. **Add more games** — Extend the collection with new game folders

See epic `pixi-square-ejb` for detailed tasks and dependencies.

## IDE setup

[VS Code](https://code.visualstudio.com/) with the [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension. Vue devtools are available for [Chrome](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/).
