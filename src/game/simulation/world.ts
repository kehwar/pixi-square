import type { Unit } from './unit'
import { Grid } from './grid'
import { findPath } from './pathfinder'

export type Controller = 'p1' | 'p2'
export type Direction = 'up' | 'down' | 'left' | 'right'

export interface WorldState {
  readonly units: readonly Unit[]
}

export class World {
  private readonly grid: Grid
  private readonly units: Unit[]

  constructor(grid: Grid, units: Unit[]) {
    this.grid = grid
    this.units = units
  }

  getGrid(): Grid {
    return this.grid
  }

  getState(): WorldState {
    return {
      units: this.units,
    }
  }

  /** Claim the unit with the given id for a controller. Resets idleMs and clears path. */
  claimUnit(controller: Controller, unitId: string): void {
    const existing = this.units.find(u => u.controller === controller)
    if (existing)
      existing.controller = null

    const unit = this.units.find(u => u.id === unitId)
    if (unit === undefined)
      return

    unit.controller = controller
    unit.idleMs = 0
    unit.path = []
  }

  /** Release the unit currently claimed by a controller. Triggers P2→P1 promotion when P1 is released. */
  releaseUnit(controller: Controller): void {
    const unit = this.units.find(u => u.controller === controller)
    if (unit === undefined)
      return

    unit.controller = null

    if (controller === 'p1') {
      const p2Unit = this.units.find(u => u.controller === 'p2')
      if (p2Unit)
        p2Unit.controller = 'p1'
    }
  }

  /** Move the claimed unit one tile in the given direction. No-op into obstacles or out-of-bounds. */
  stepUnit(controller: Controller, direction: Direction): void {
    const unit = this.units.find(u => u.controller === controller)
    if (unit === undefined)
      return

    const dc = direction === 'left' ? -1 : direction === 'right' ? 1 : 0
    const dr = direction === 'up' ? -1 : direction === 'down' ? 1 : 0
    const newCol = unit.col + dc
    const newRow = unit.row + dr

    if (!this.grid.isPassable(newCol, newRow))
      return

    unit.path = [{ col: newCol, row: newRow }]
  }

  /** Path-find from the claimed unit's current tile to the target tile. Replaces the unit's movement queue. */
  pathfindUnit(controller: Controller, col: number, row: number): void {
    const unit = this.units.find(u => u.controller === controller)
    if (unit === undefined)
      return

    const path = findPath(this.grid, unit.col, unit.row, col, row)
    if (path === null || path.length === 0)
      return

    unit.path = path
  }

  /** Reset idleMs to 0 for the claimed unit without moving it. */
  registerInput(controller: Controller): void {
    const unit = this.units.find(u => u.controller === controller)
    if (unit === undefined)
      return

    unit.idleMs = 0
  }

  /** Return the units currently claimed by each controller. */
  getClaimedUnits(): { p1: Unit | null, p2: Unit | null } {
    return {
      p1: this.units.find(u => u.controller === 'p1') ?? null,
      p2: this.units.find(u => u.controller === 'p2') ?? null,
    }
  }

  /** Return the id of the nearest unclaimed unit to the given pixel position, or null if none exist. */
  nearestUnclaimedUnit(pixelX: number, pixelY: number): string | null {
    let nearest: Unit | null = null
    let minDist = Infinity
    for (const unit of this.units) {
      if (unit.controller !== null)
        continue
      const dist = Math.hypot(unit.pixelX - pixelX, unit.pixelY - pixelY)
      if (dist < minDist) {
        minDist = dist
        nearest = unit
      }
    }
    return nearest?.id ?? null
  }

  /**
   * Advance each unit along its path by the time elapsed since the last tick.
   *  Unclaimed units wander by picking random destinations.
   *  Claimed units accumulate idleMs and auto-release when idleMs >= 10 000.
   */
  tick(deltaMs: number): void {
    const ts = Grid.TILE_SIZE

    for (const unit of this.units) {
      if (unit.controller !== null)
        unit.idleMs += deltaMs

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

      if (unit.controller === null && unit.path.length === 0) {
        const dest = randomPassableTile(this.grid)
        const path = findPath(this.grid, unit.col, unit.row, dest.col, dest.row)
        if (path !== null && path.length > 0)
          unit.path = path
      }
    }

    // Auto-release units whose idle time has expired (captured before mutation)
    for (const unit of this.units) {
      if (unit.controller !== null && unit.idleMs >= 10_000)
        this.releaseUnit(unit.controller)
    }
  }
}

let nextId = 0

export class WorldFactory {
  static readonly UNIT_COUNT = 200

  static create(): World {
    const grid = new Grid()
    const units: Unit[] = []
    const ts = Grid.TILE_SIZE

    for (let i = 0; i < WorldFactory.UNIT_COUNT; i++) {
      const tile = randomPassableTile(grid)
      units.push({
        id: String(nextId++),
        controller: null,
        idleMs: 0,
        col: tile.col,
        row: tile.row,
        pixelX: tile.col * ts + ts / 2,
        pixelY: tile.row * ts + ts / 2,
        speed: 3,
        path: [],
      })
    }

    return new World(grid, units)
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
