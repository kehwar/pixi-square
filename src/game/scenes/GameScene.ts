import type { GameWorld } from '../systems/World'
import { Scene } from 'phaser'
import { EventBus } from '../EventBus'
import { CameraSystem } from '../systems/CameraSystem'
import { GridRendererSystem } from '../systems/GridRendererSystem'
import { COLS, GridSystem, ROWS, TILE_SIZE } from '../systems/GridSystem'
import { InputSystem } from '../systems/InputSystem'
import { MovementSystem } from '../systems/MovementSystem'
import { PathfindingSystem } from '../systems/PathfindingSystem'
import { PlayerCameraSystem } from '../systems/PlayerCameraSystem'
import { PositionSystem } from '../systems/PositionSystem'
import { UnitFactorySystem } from '../systems/UnitFactorySystem'
import { UnitRendererSystem } from '../systems/UnitRendererSystem'
import { WanderingSystem } from '../systems/WanderingSystem'
import { createWorld } from '../systems/World'

export class GameScene extends Scene {
  private world!: GameWorld

  constructor() {
    super('Game')
  }

  create(): void {
    this.world = createWorld(this)

    this.world.installSystem(new GridSystem())
    this.world.installSystem(new GridRendererSystem())
    this.world.installSystem(new PositionSystem())
    this.world.installSystem(new MovementSystem())
    this.world.installSystem(new PathfindingSystem())
    this.world.installSystem(new WanderingSystem())
    this.world.installSystem(new UnitRendererSystem())
    this.world.installSystem(new CameraSystem())
    this.world.installSystem(new InputSystem())
    this.world.installSystem(new PlayerCameraSystem())
    this.world.installSystem(new UnitFactorySystem())

    const gridEid = this.world.addEntity()
    this.world.addComponent(GridSystem, gridEid)
    this.world.addComponent(GridRendererSystem, gridEid)
    this.world.addComponent(UnitFactorySystem, gridEid)

    // World-level system entity: receives InputSystem.update each frame
    const sysEid = this.world.addEntity()
    this.world.addComponent(InputSystem, sysEid)

    const gridWidth = COLS * TILE_SIZE
    const gridHeight = ROWS * TILE_SIZE
    this.cameras.main.centerOn(gridWidth / 2, gridHeight / 2)

    EventBus.emit('current-scene-ready', this)
    EventBus.emit('navigate', '/game')
  }
}
