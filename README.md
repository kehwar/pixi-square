# pixi-square

A colony management game built with [Phaser 4](https://phaser.io/) and [Vue 3](https://vuejs.org/). Phaser drives all rendering, cameras, and input; Vue handles the UI overlay and application shell.

## Tech stack

| Layer | Library |
|---|---|
| Game engine | Phaser 4 |
| UI / routing | Vue 3, Vue Router (hash mode), Pinia |
| Build | Vite + `vue-tsc` |
| Tests | Vitest + `@vue/test-utils` + happy-dom |
| Lint | ESLint via `@antfu/eslint-config` |

## Project structure

```
src/
  main.ts           ← Vue entry point
  App.vue           ← mounts <RouterView>
  game/             ← Phaser code — no Vue/Pinia/Router imports allowed here
    main.ts         ← StartGame factory (creates Phaser.Game instance)
    EventBus.ts     ← Phaser EventEmitter singleton bridging game ↔ Vue
    scenes/         ← Phaser scene chain
      Boot.ts       ← immediately starts Preloader
      Preloader.ts  ← asset loading; starts MainMenu
      MainMenu.ts   ← waits for start-game EventBus event
      Game.ts       ← grid + unit rendering, simulation tick
      GameOver.ts
    simulation/     ← pure TypeScript game logic (no Phaser)
      grid.ts       ← 200×200 tile grid + passability
      unit.ts       ← Unit type (controller, idleMs)
      world.ts      ← World + WorldFactory, tick loop, wandering
      pathfinder.ts ← A* 8-directional pathfinder
  components/
    PhaserGame.vue  ← mounts/destroys Phaser canvas on mount/unmount
  views/
    AppLayout.vue   ← root layout: persistent canvas + UI overlay
    MainMenuView.vue
    GameView.vue
    SettingsView.vue
  router/           ← hash-mode router (#/, #/game, #/settings)
  stores/           ← Pinia stores
  assets/           ← CSS and static assets
```

## Dev commands

```sh
npm install          # install dependencies
npm run dev          # dev server (http://localhost:5173)
npm run build        # type-check + production build → dist/
npm run test:unit    # Vitest unit tests
npm run lint         # ESLint (auto-fix)
```

## IDE setup

[VS Code](https://code.visualstudio.com/) with the [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension. Vue devtools are available for [Chrome](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/).
