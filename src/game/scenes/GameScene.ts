import type { GameWorld } from '../systems/types'
import { addComponent, addEntity, query } from 'bitecs'
import { Scene } from 'phaser'
import { EventBus } from '../EventBus'
import { GridRendererSystem } from '../systems/GridRendererSystem'
import { COLS, GridSystem, ROWS, TILE_SIZE } from '../systems/GridSystem'
import { MovementSystem } from '../systems/MovementSystem'
import { PathfindingSystem } from '../systems/PathfindingSystem'
import { PositionSystem } from '../systems/PositionSystem'
import { createWorld } from '../systems/types'
import * as UnitFactorySystem from '../systems/UnitFactorySystem'
import * as UnitRendererSystem from '../systems/UnitRendererSystem'
import * as WanderingSystem from '../systems/WanderingSystem'

export class GameScene extends Scene {
  private world!: GameWorld
  private worldEid!: number
  private movementSystem!: MovementSystem

  constructor() {
    super('Game')
  }

  create(): void {
    this.world = createWorld(this)

    this.worldEid = addEntity(this.world)

    this.world.installSystem(new GridSystem())
    const gridRenderer = new GridRendererSystem()
    this.world.installSystem(gridRenderer)
    this.world.installSystem(new PositionSystem())
    const movementSystem = new MovementSystem()
    this.world.installSystem(movementSystem)
    this.movementSystem = movementSystem
    this.world.installSystem(new PathfindingSystem())
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
    const eids = query(this.world, [MovementSystem])
    for (const eid of eids) {
      this.movementSystem.update(this.world, eid, delta)
    }
    UnitRendererSystem.update(this.world)
  }
}
