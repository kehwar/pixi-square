import type { GameObjects } from 'phaser'
import type { GameWorld } from './types'
import { ComponentSystem } from './ComponentSystem'
import { TILE_SIZE } from './GridSystem'
import { PositionSystem } from './PositionSystem'

// --- Constants ---

const UNIT_SIZE = TILE_SIZE - 6

// --- Data type ---

export interface UnitSpriteData {
  sprite: GameObjects.Image
}

// --- Data store ---

export const UnitSprite: UnitSpriteData[] = []

// --- System class ---

export class UnitRendererSystem extends ComponentSystem<UnitSpriteData> {
  override install(world: GameWorld): void {
    world.setupComponentStorage(UnitRendererSystem, UnitSprite)
    const gfx = world.scene.add.graphics()
    gfx.fillStyle(0xFFD700, 1)
    gfx.fillRect(0, 0, UNIT_SIZE, UNIT_SIZE)
    gfx.generateTexture('unit', UNIT_SIZE, UNIT_SIZE)
    gfx.destroy()
  }

  override create(world: GameWorld, eid: number): void {
    const posStorage = world.getComponentStorage(PositionSystem)
    const sprite = world.scene.add.image(
      posStorage.pixelX[eid]!,
      posStorage.pixelY[eid]!,
      'unit',
    )
    this.setComponent(world, eid, { sprite })
  }

  override update(world: GameWorld, eid: number, _delta: number): void {
    const posStorage = world.getComponentStorage(PositionSystem)
    const { sprite } = this.getComponent(world, eid)
    sprite.setPosition(posStorage.pixelX[eid]!, posStorage.pixelY[eid]!)
  }

  override destroy(world: GameWorld, eid: number): void {
    const { sprite } = this.getComponent(world, eid)
    sprite.destroy()
    super.destroy(world, eid)
  }
}
