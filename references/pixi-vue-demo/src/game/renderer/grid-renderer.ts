import { Container, Graphics } from 'pixi.js'

import { Grid } from '../simulation/grid'

const COLOR_PASSABLE = 0x4A7C59
const COLOR_OBSTACLE = 0x6B4226
const COLOR_BORDER = 0x2D4A38

export class GridRenderer extends Container {
  constructor(grid: Grid) {
    super()
    this.drawGrid(grid)
  }

  private drawGrid(grid: Grid): void {
    const g = new Graphics()

    // Batch all passable tile fills in a single fill() call
    const ts = Grid.TILE_SIZE
    for (let row = 0; row < Grid.ROWS; row++) {
      for (let col = 0; col < Grid.COLS; col++) {
        if (grid.isPassable(col, row)) {
          g.rect(col * ts, row * ts, ts, ts)
        }
      }
    }
    g.fill(COLOR_PASSABLE)

    // Batch all obstacle tile fills in a single fill() call
    for (let row = 0; row < Grid.ROWS; row++) {
      for (let col = 0; col < Grid.COLS; col++) {
        if (!grid.isPassable(col, row)) {
          g.rect(col * ts, row * ts, ts, ts)
        }
      }
    }
    g.fill(COLOR_OBSTACLE)

    // Draw the entire grid border as a single stroke
    const gridWidth = Grid.COLS * ts
    const gridHeight = Grid.ROWS * ts

    for (let col = 0; col <= Grid.COLS; col++) {
      const x = col * ts
      g.moveTo(x, 0).lineTo(x, gridHeight)
    }
    for (let row = 0; row <= Grid.ROWS; row++) {
      const y = row * ts
      g.moveTo(0, y).lineTo(gridWidth, y)
    }
    g.stroke({ width: 1, color: COLOR_BORDER })

    this.addChild(g)
  }
}
