# Phaser 4 over PixiJS v8

The project started with PixiJS v8 but migrated to Phaser 4 before any roadmap features were built. Phaser provides cameras, keyboard/pointer input, and a scene lifecycle first-class. The features on the roadmap — per-player split-screen viewports, camera follow with zoom, tile-level click input — would each have required non-trivial custom infrastructure on top of PixiJS. The migration cost was judged lower than the ongoing custom-build cost.

The PixiJS implementation is preserved as a working reference under `references/pixi-vue-demo/`.

## Considered Options

- **Keep PixiJS, build custom camera/input on top**: ruled out because split-screen viewports and independent camera zoom require significant infrastructure that Phaser already provides. Every roadmap feature would have needed bespoke implementation.
