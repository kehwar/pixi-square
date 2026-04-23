import { Scene } from 'phaser'
import { EventBus } from '../EventBus'

export class MainMenu extends Scene {
  constructor() {
    super('MainMenu')
  }

  create(): void {
    EventBus.emit('current-scene-ready', this)
    EventBus.once('start-game', () => {
      this.scene.start('Game')
    })
  }
}
