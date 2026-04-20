# pixi-square

A colony management game built with [PixiJS v8](https://pixijs.com/) (WebGL renderer) and [Vue 3](https://vuejs.org/). PixiJS drives all rendering; Vue handles the UI overlay and application shell.

## Tech stack

| Layer | Library |
|---|---|
| Renderer | PixiJS v8 + `@pixi/sound` |
| UI / routing | Vue 3, Vue Router (hash mode), Pinia |
| Build | Vite + `vue-tsc` |
| Tests | Vitest + `@vue/test-utils` + happy-dom |
| Lint | ESLint via `@antfu/eslint-config` |

## Project structure

```
src/
  main.ts           ← Vue entry point
  App.vue           ← mounts <RouterView>
  game/             ← PixiJS code — no Vue/Pinia/Router imports allowed here
    app.ts          ← Application singleton (initApp / destroyApp)
  views/
    AppLayout.vue   ← root layout: persistent canvas + UI overlay
    MainMenuView.vue
    GameView.vue
    SettingsView.vue
  router/           ← hash-mode router (#/, #/game, #/settings)
  stores/           ← Pinia stores
  components/       ← reusable Vue components
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
