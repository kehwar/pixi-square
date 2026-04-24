import type { Events, Scene } from 'phaser'

export interface GameWorld {
  scene: Scene
  events: Events.EventEmitter
}
