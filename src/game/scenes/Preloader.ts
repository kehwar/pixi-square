import { Scene } from 'phaser'

export class Preloader extends Scene {
  constructor() {
    super('Preloader')
  }

  create(): void {
    // No file assets to load — proceed immediately.
    this.scene.start('MainMenu')
  }
}
