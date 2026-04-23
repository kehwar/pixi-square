import { Scene } from 'phaser'
import { EventBus } from '../EventBus'

export class Game extends Scene {
  constructor() {
    super('Game')
  }

  create(): void {
    EventBus.emit('current-scene-ready', this)
    EventBus.emit('navigate', '/game')
  }
}
