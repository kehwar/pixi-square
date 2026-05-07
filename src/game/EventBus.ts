import { Events } from 'phaser'

// Used to emit events between Vue components and Phaser scenes.
export const EventBus = new Events.EventEmitter()

// Set by GameView when mounted, checked by MainMenu to resolve
// the timing gap where Vue onMounted fires before Phaser scene create().
export const pendingGameStart = { value: false }
