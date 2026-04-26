import type { World } from 'bitecs'
import type { GameObjects } from 'phaser'
import type { GameWorld } from './types'
import { COLS, Grid, isPassable, ROWS, TILE_SIZE } from './GridSystem'

const TILE_COLORS = {
  passable: 0x4A7C59,
  obstacle: 0x6B3A2A,
  border: 0x1A1A1A,
} as const

let graphics: GameObjects.Graphics | null = null

export function create(world: World<GameWorld>, worldEid: number): void {
  const ts = TILE_SIZE
  const gfx = world.scene.add.graphics()
  graphics = gfx

  const gridData = Grid[worldEid]!

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

export function destroySystems(_world: World<GameWorld>): void {
  if (graphics !== null) {
    graphics.destroy()
    graphics = null
  }
}

// Expose for testing
export function _getGraphics(): GameObjects.Graphics | null {
  return graphics
}

// Reset for testing
export function _reset(): void {
  graphics = null
}

// Re-export grid data for reference by tests
export { COLS, Grid, ROWS, TILE_SIZE }
