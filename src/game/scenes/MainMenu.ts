import { Scene } from 'phaser'
import { EventBus, pendingGameStart } from '../EventBus'

export class MainMenu extends Scene {
  constructor() {
    super('MainMenu')
  }

  create(): void {
    EventBus.emit('current-scene-ready', this)

    EventBus.once('start-game', () => {
      this.scene.start('Game')
    })

    if (pendingGameStart.value) {
      this.scene.start('Game')
    }
  }
}
