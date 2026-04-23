import { Events } from 'phaser'

// Used to emit events between Vue components and Phaser scenes.
export const EventBus = new Events.EventEmitter()
