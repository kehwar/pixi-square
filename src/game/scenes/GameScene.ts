import type { GameWorld } from '../systems/types'
import { addComponent, addEntity } from 'bitecs'
import { Scene } from 'phaser'
import { EventBus } from '../EventBus'
import { GridRendererSystem } from '../systems/GridRendererSystem'
import { COLS, GridSystem, ROWS, TILE_SIZE } from '../systems/GridSystem'
import * as MovementSystem from '../systems/MovementSystem'
import { createWorld } from '../systems/types'
import * as UnitFactorySystem from '../systems/UnitFactorySystem'
import * as UnitRendererSystem from '../systems/UnitRendererSystem'
import * as WanderingSystem from '../systems/WanderingSystem'

export class GameScene extends Scene {
  private world!: GameWorld
  private worldEid!: number

  constructor() {
    super('Game')
  }

  create(): void {
    this.world = createWorld(this)

    this.worldEid = addEntity(this.world)

    this.world.installSystem(new GridSystem())
    const gridRenderer = new GridRendererSystem()
    this.world.installSystem(gridRenderer)
    addComponent(this.world, this.worldEid, GridSystem)
    addComponent(this.world, this.worldEid, GridRendererSystem)

    WanderingSystem.create(this.world, this.worldEid)
    UnitFactorySystem.create(this.world, this.worldEid)

    const gridWidth = COLS * TILE_SIZE
    const gridHeight = ROWS * TILE_SIZE
    this.cameras.main.centerOn(gridWidth / 2, gridHeight / 2)

    this.events.once('shutdown', () => {
      const rendererData = gridRenderer.getComponent(this.world, this.worldEid)
      rendererData.graphics.destroy()
      UnitRendererSystem.destroySystems(this.world)
    })

    EventBus.emit('current-scene-ready', this)
    EventBus.emit('navigate', '/game')
  }

  update(_time: number, delta: number): void {
    MovementSystem.update(this.world, delta)
    UnitRendererSystem.update(this.world)
  }
}
