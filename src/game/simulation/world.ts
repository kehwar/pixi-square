import type { Unit } from './unit'
import { Grid } from './grid'

export interface WorldState {
  readonly units: readonly Unit[]
  readonly playerUnitId: string
}

export class World {
  private readonly grid: Grid
  private readonly units: Unit[]
  readonly playerUnitId: string

  constructor(grid: Grid, units: Unit[], playerUnitId: string) {
    this.grid = grid
    this.units = units
    this.playerUnitId = playerUnitId
  }

  getGrid(): Grid {
    return this.grid
  }

  getState(): WorldState {
    return {
      units: this.units,
      playerUnitId: this.playerUnitId,
    }
  }
}

let nextId = 0

export class WorldFactory {
  static create(): World {
    const grid = new Grid()
    const units: Unit[] = []

    const playerTile = WorldFactory.findPassableTile(grid)
    const playerId = String(nextId++)
    const ts = Grid.TILE_SIZE

    units.push({
      id: playerId,
      type: 'player',
      col: playerTile.col,
      row: playerTile.row,
      pixelX: playerTile.col * ts + ts / 2,
      pixelY: playerTile.row * ts + ts / 2,
      speed: 2,
    })

    return new World(grid, units, playerId)
  }

  private static findPassableTile(grid: Grid): { col: number, row: number } {
    for (;;) {
      const col = Math.floor(Math.random() * Grid.COLS)
      const row = Math.floor(Math.random() * Grid.ROWS)
      if (grid.isPassable(col, row)) {
        return { col, row }
      }
    }
  }
}
