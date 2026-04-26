import type { GameObjects } from 'phaser'
import type { GameWorld } from './types'
import { ComponentSystem } from './ComponentSystem'
import { COLS, Grid, isPassable, ROWS, TILE_SIZE } from './GridSystem'

const TILE_COLORS = {
  passable: 0x4A7C59,
  obstacle: 0x6B3A2A,
  border: 0x1A1A1A,
} as const

// --- Data type ---

export interface GridRendererData {
  graphics: GameObjects.Graphics
}

// --- Data store ---

const GridRendererStore: GridRendererData[] = []

// --- System class ---

export class GridRendererSystem extends ComponentSystem<GridRendererData> {
  override install(world: GameWorld): void {
    world.setupComponentStorage(GridRendererSystem, GridRendererStore)
  }

  override create(world: GameWorld, eid: number): void {
    const ts = TILE_SIZE
    const gfx = world.scene.add.graphics()
    this.setComponent(world, eid, { graphics: gfx })

    const gridData = Grid[eid]!

    // Background (border color)
    gfx.fillStyle(TILE_COLORS.border, 1)
    gfx.fillRect(0, 0, COLS * ts, ROWS * ts)

    // Passable tiles
    gfx.fillStyle(TILE_COLORS.passable, 1)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (isPassable(gridData, col, row))
          gfx.fillRect(col * ts + 1, row * ts + 1, ts - 2, ts - 2)
      }
    }

    // Obstacle tiles
    gfx.fillStyle(TILE_COLORS.obstacle, 1)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!isPassable(gridData, col, row))
          gfx.fillRect(col * ts + 1, row * ts + 1, ts - 2, ts - 2)
      }
    }
  }

  override destroy(world: GameWorld, eid: number): void {
    const {graphics} = this.getComponent(world, eid)
    graphics.destroy()
    super.destroy(world, eid)
  }
}

// Re-export grid data for reference by other modules
export { COLS, Grid, ROWS, TILE_SIZE }
