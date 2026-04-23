import { Scene } from 'phaser'
import { EventBus } from '../EventBus'

export class GameOver extends Scene {
  constructor() {
    super('GameOver')
  }

  create(): void {
    EventBus.emit('current-scene-ready', this)
    EventBus.emit('game-over')
  }
}
