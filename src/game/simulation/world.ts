import type { Unit } from './unit'
import { Grid } from './grid'
import { findPath } from './pathfinder'

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

  /** Advance each unit along its path by the time elapsed since the last tick. */
  tick(deltaMs: number): void {
    const ts = Grid.TILE_SIZE
    for (const unit of this.units) {
      let remaining = unit.speed * ts * (deltaMs / 1000)
      while (remaining > 0 && unit.path.length > 0) {
        const next = unit.path[0]!
        const targetX = next.col * ts + ts / 2
        const targetY = next.row * ts + ts / 2
        const dx = targetX - unit.pixelX
        const dy = targetY - unit.pixelY
        const dist = Math.hypot(dx, dy)
        if (dist <= remaining) {
          unit.pixelX = targetX
          unit.pixelY = targetY
          unit.col = next.col
          unit.row = next.row
          unit.path.shift()
          remaining -= dist
        }
        else {
          unit.pixelX += (dx / dist) * remaining
          unit.pixelY += (dy / dist) * remaining
          remaining = 0
        }
      }

      // AI units pick a new random passable destination when they run out of path.
      if (unit.type === 'ai' && unit.path.length === 0) {
        const dest = randomPassableTile(this.grid)
        const path = findPath(this.grid, unit.col, unit.row, dest.col, dest.row)
        if (path !== null && path.length > 0) {
          unit.path = path
        }
      }
    }
  }

  /**
   * Path-find from the unit's current tile to the target tile and replace the
   * unit's movement queue. Does nothing if the target is an obstacle or
   * unreachable, or if the unit id is not found.
   */
  moveUnit(unitId: string, targetCol: number, targetRow: number): void {
    const unit = this.units.find(u => u.id === unitId)
    if (unit === undefined)
      return
    const path = findPath(this.grid, unit.col, unit.row, targetCol, targetRow)
    if (path === null || path.length === 0)
      return
    unit.path = path
  }
}

let nextId = 0

export class WorldFactory {
  static readonly AI_COUNT = 200

  static create(): World {
    const grid = new Grid()
    const units: Unit[] = []
    const ts = Grid.TILE_SIZE

    const playerTile = randomPassableTile(grid)
    const playerId = String(nextId++)

    units.push({
      id: playerId,
      type: 'player',
      col: playerTile.col,
      row: playerTile.row,
      pixelX: playerTile.col * ts + ts / 2,
      pixelY: playerTile.row * ts + ts / 2,
      speed: 6,
      path: [],
    })

    for (let i = 0; i < WorldFactory.AI_COUNT; i++) {
      const tile = randomPassableTile(grid)
      units.push({
        id: String(nextId++),
        type: 'ai',
        col: tile.col,
        row: tile.row,
        pixelX: tile.col * ts + ts / 2,
        pixelY: tile.row * ts + ts / 2,
        speed: 3,
        path: [],
      })
    }

    return new World(grid, units, playerId)
  }
}

function randomPassableTile(grid: Grid): { col: number, row: number } {
  for (;;) {
    const col = Math.floor(Math.random() * Grid.COLS)
    const row = Math.floor(Math.random() * Grid.ROWS)
    if (grid.isPassable(col, row))
      return { col, row }
  }
}
