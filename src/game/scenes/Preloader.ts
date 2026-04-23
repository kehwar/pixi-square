import { Scene } from 'phaser'
import { EventBus } from '../EventBus'

export class Preloader extends Scene {
  constructor() {
    super('Preloader')
  }

  create(): void {
    EventBus.emit('current-scene-ready', this)
    // No file assets to load — proceed immediately.
    this.scene.start('MainMenu')
  }
}
