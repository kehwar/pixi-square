import type { GameObjects } from 'phaser'
import { Scene } from 'phaser'
import { EventBus } from '../EventBus'
import { Grid } from '../simulation/grid'
import { WorldFactory } from '../simulation/world'

const TILE_COLORS = {
  passable: 0x4A7C59,
  obstacle: 0x6B3A2A,
  border: 0x1A1A1A,
  wanderer: 0x4169E1,
} as const

export class Game extends Scene {
  private world = WorldFactory.create()
  private unitGfx!: GameObjects.Graphics

  constructor() {
    super('Game')
  }

  create(): void {
    this.world = WorldFactory.create()

    this.drawGrid()

    this.unitGfx = this.add.graphics()

    const gridWidth = Grid.COLS * Grid.TILE_SIZE
    const gridHeight = Grid.ROWS * Grid.TILE_SIZE
    this.cameras.main.centerOn(gridWidth / 2, gridHeight / 2)

    EventBus.emit('current-scene-ready', this)
    EventBus.emit('navigate', '/game')
  }

  update(_time: number, delta: number): void {
    this.world.tick(delta)
    this.drawUnits()
  }

  private drawGrid(): void {
    const ts = Grid.TILE_SIZE
    const grid = this.world.getGrid()
    const gfx = this.add.graphics()

    // Background (border color)
    gfx.fillStyle(TILE_COLORS.border, 1)
    gfx.fillRect(0, 0, Grid.COLS * ts, Grid.ROWS * ts)

    // Passable tiles
    gfx.fillStyle(TILE_COLORS.passable, 1)
    for (let row = 0; row < Grid.ROWS; row++) {
      for (let col = 0; col < Grid.COLS; col++) {
        if (grid.isPassable(col, row))
          gfx.fillRect(col * ts + 1, row * ts + 1, ts - 2, ts - 2)
      }
    }

    // Obstacle tiles
    gfx.fillStyle(TILE_COLORS.obstacle, 1)
    for (let row = 0; row < Grid.ROWS; row++) {
      for (let col = 0; col < Grid.COLS; col++) {
        if (!grid.isPassable(col, row))
          gfx.fillRect(col * ts + 1, row * ts + 1, ts - 2, ts - 2)
      }
    }
  }

  private drawUnits(): void {
    const unitSize = 16
    const half = unitSize / 2
    const units = this.world.getState().units

    this.unitGfx.clear()
    this.unitGfx.fillStyle(TILE_COLORS.wanderer, 1)
    for (const unit of units) {
      this.unitGfx.fillRect(unit.pixelX - half, unit.pixelY - half, unitSize, unitSize)
    }
  }
}
