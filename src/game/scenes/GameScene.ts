import type { GameWorld } from '../systems/types'
import { addEntity, createWorld } from 'bitecs'
import { Events, Scene } from 'phaser'
import { EventBus } from '../EventBus'
import * as GridRendererSystem from '../systems/GridRendererSystem'
import * as GridSystem from '../systems/GridSystem'
import * as UnitFactorySystem from '../systems/UnitFactorySystem'
import * as UnitRendererSystem from '../systems/UnitRendererSystem'

export class GameScene extends Scene {
  private world!: ReturnType<typeof createWorld<GameWorld>>
  private worldEid!: number

  constructor() {
    super('Game')
  }

  create(): void {
    this.world = createWorld<GameWorld>({
      scene: this,
      events: new Events.EventEmitter(),
    })

    this.worldEid = addEntity(this.world)
    GridSystem.create(this.world, this.worldEid)
    GridRendererSystem.create(this.world, this.worldEid)
    UnitFactorySystem.create(this.world, this.worldEid)

    const gridWidth = GridSystem.COLS * GridSystem.TILE_SIZE
    const gridHeight = GridSystem.ROWS * GridSystem.TILE_SIZE
    this.cameras.main.centerOn(gridWidth / 2, gridHeight / 2)

    this.events.once('shutdown', () => {
      GridRendererSystem.destroySystems(this.world)
      UnitRendererSystem.destroySystems(this.world)
    })

    EventBus.emit('current-scene-ready', this)
    EventBus.emit('navigate', '/game')
  }

  update(_time: number, _delta: number): void {
    UnitRendererSystem.update(this.world)
  }
}
