import { Scene } from 'phaser'
import { EventBus } from '../EventBus'

export class Boot extends Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    EventBus.emit('current-scene-ready', this)
    this.scene.start('Preloader')
  }
}
