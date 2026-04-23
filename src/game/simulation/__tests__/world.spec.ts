import type { Unit } from '../unit'

import { describe, expect, it } from 'vitest'
import { Grid } from '../grid'
import { World, WorldFactory } from '../world'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TS = Grid.TILE_SIZE

function makeUnit(overrides: Partial<Unit> & { id: string }): Unit {
  const col = overrides.col ?? 5
  const row = overrides.row ?? 5
  return {
    controller: null,
    idleMs: 0,
    col,
    row,
    pixelX: col * TS + TS / 2,
    pixelY: row * TS + TS / 2,
    speed: 6,
    path: [],
    ...overrides,
  }
}

/** Find the first passable tile by scanning top-left. */
function firstPassable(grid: Grid): { col: number, row: number } {
  for (let row = 0; row < Grid.ROWS; row++) {
    for (let col = 0; col < Grid.COLS; col++) {
      if (grid.isPassable(col, row))
        return { col, row }
    }
  }
  throw new Error('no passable tile')
}

/** Find a passable tile that has at least one passable right-neighbour. */
function passablePairRight(grid: Grid): { from: { col: number, row: number }, to: { col: number, row: number } } | null {
  for (let row = 0; row < Grid.ROWS; row++) {
    for (let col = 0; col < Grid.COLS - 1; col++) {
      if (grid.isPassable(col, row) && grid.isPassable(col + 1, row))
        return { from: { col, row }, to: { col: col + 1, row } }
    }
  }
  return null
}

/** Find the first obstacle tile. */
function firstObstacle(grid: Grid): { col: number, row: number } | null {
  for (let row = 0; row < Grid.ROWS; row++) {
    for (let col = 0; col < Grid.COLS; col++) {
      if (!grid.isPassable(col, row))
        return { col, row }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// WorldFactory
// ---------------------------------------------------------------------------

describe('worldFactory', () => {
  it('creates exactly 200 units', () => {
    const world = WorldFactory.create()
    expect(world.getState().units).toHaveLength(WorldFactory.UNIT_COUNT)
    expect(WorldFactory.UNIT_COUNT).toBe(200)
  })

  it('all units start with controller: null', () => {
    const world = WorldFactory.create()
    expect(world.getState().units.every(u => u.controller === null)).toBe(true)
  })

  it('all units start with idleMs: 0', () => {
    const world = WorldFactory.create()
    expect(world.getState().units.every(u => u.idleMs === 0)).toBe(true)
  })

  it('all units spawn on passable tiles', () => {
    const world = WorldFactory.create()
    const grid = world.getGrid()
    expect(world.getState().units.every(u => grid.isPassable(u.col, u.row))).toBe(true)
  })

  it('unit pixel position is at tile center', () => {
    const world = WorldFactory.create()
    for (const unit of world.getState().units) {
      expect(unit.pixelX).toBe(unit.col * TS + TS / 2)
      expect(unit.pixelY).toBe(unit.row * TS + TS / 2)
    }
  })
})

// ---------------------------------------------------------------------------
// world.claimUnit
// ---------------------------------------------------------------------------

describe('world.claimUnit', () => {
  it('marks the unit with the given controller', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1' })
    const world = new World(grid, [unit])
    world.claimUnit('p1', 'u1')
    expect(world.getState().units[0]!.controller).toBe('p1')
  })

  it('resets idleMs to 0', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', idleMs: 5000 })
    const world = new World(grid, [unit])
    world.claimUnit('p1', 'u1')
    expect(world.getState().units[0]!.idleMs).toBe(0)
  })

  it('clears the path', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', path: [{ col: 6, row: 5 }] })
    const world = new World(grid, [unit])
    world.claimUnit('p1', 'u1')
    expect(world.getState().units[0]!.path).toHaveLength(0)
  })

  it('does nothing if unit id is not found', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1' })
    const world = new World(grid, [unit])
    expect(() => world.claimUnit('p1', 'missing')).not.toThrow()
    expect(unit.controller).toBeNull()
  })

  it('releases prior claim on the same controller before claiming new unit', () => {
    const grid = new Grid()
    const a = makeUnit({ id: 'a' })
    const b = makeUnit({ id: 'b' })
    const world = new World(grid, [a, b])
    world.claimUnit('p1', 'a')
    world.claimUnit('p1', 'b')
    expect(a.controller).toBeNull()
    expect(b.controller).toBe('p1')
  })
})

// ---------------------------------------------------------------------------
// world.releaseUnit
// ---------------------------------------------------------------------------

describe('world.releaseUnit', () => {
  it('clears the controller field', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', controller: 'p1' })
    const world = new World(grid, [unit])
    world.releaseUnit('p1')
    expect(unit.controller).toBeNull()
  })

  it('does nothing if controller has no claimed unit', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1' })
    const world = new World(grid, [unit])
    expect(() => world.releaseUnit('p1')).not.toThrow()
    expect(unit.controller).toBeNull()
  })

  it('p2→P1 promotion: releasing P1 while P2 holds a unit promotes P2 to P1', () => {
    const grid = new Grid()
    const p1Unit = makeUnit({ id: 'a', controller: 'p1' })
    const p2Unit = makeUnit({ id: 'b', controller: 'p2' })
    const world = new World(grid, [p1Unit, p2Unit])
    world.releaseUnit('p1')
    expect(p1Unit.controller).toBeNull()
    expect(p2Unit.controller).toBe('p1')
  })

  it('p2→P1 promotion preserves idleMs', () => {
    const grid = new Grid()
    const p1Unit = makeUnit({ id: 'a', controller: 'p1' })
    const p2Unit = makeUnit({ id: 'b', controller: 'p2', idleMs: 3000 })
    const world = new World(grid, [p1Unit, p2Unit])
    world.releaseUnit('p1')
    expect(p2Unit.idleMs).toBe(3000)
  })

  it('releasing P2 does not trigger promotion', () => {
    const grid = new Grid()
    const p1Unit = makeUnit({ id: 'a', controller: 'p1' })
    const p2Unit = makeUnit({ id: 'b', controller: 'p2' })
    const world = new World(grid, [p1Unit, p2Unit])
    world.releaseUnit('p2')
    expect(p2Unit.controller).toBeNull()
    expect(p1Unit.controller).toBe('p1')
  })
})

// ---------------------------------------------------------------------------
// world.stepUnit
// ---------------------------------------------------------------------------

describe('world.stepUnit', () => {
  it('sets path to the adjacent tile in the given direction', () => {
    const grid = new Grid()
    const pair = passablePairRight(grid)
    if (pair === null)
      return
    const unit = makeUnit({ id: 'u1', controller: 'p1', col: pair.from.col, row: pair.from.row })
    const world = new World(grid, [unit])
    world.stepUnit('p1', 'right')
    expect(unit.path[0]).toEqual({ col: pair.to.col, row: pair.to.row })
    expect(unit.path).toHaveLength(1)
  })

  it('no-ops when the adjacent tile is an obstacle', () => {
    const grid = new Grid()
    let from: { col: number, row: number } | null = null
    for (let row = 0; row < Grid.ROWS && from === null; row++) {
      for (let col = 0; col < Grid.COLS - 1 && from === null; col++) {
        if (grid.isPassable(col, row) && !grid.isPassable(col + 1, row))
          from = { col, row }
      }
    }
    if (from === null)
      return
    const unit = makeUnit({ id: 'u1', controller: 'p1', col: from.col, row: from.row })
    const world = new World(grid, [unit])
    world.stepUnit('p1', 'right')
    expect(unit.path).toHaveLength(0)
  })

  it('no-ops out of bounds (step up from row 0)', () => {
    const grid = new Grid()
    let topRow: { col: number, row: number } | null = null
    for (let col = 0; col < Grid.COLS; col++) {
      if (grid.isPassable(col, 0)) {
        topRow = { col, row: 0 }
        break
      }
    }
    if (topRow === null)
      return
    const unit = makeUnit({ id: 'u1', controller: 'p1', col: topRow.col, row: topRow.row })
    const world = new World(grid, [unit])
    world.stepUnit('p1', 'up')
    expect(unit.path).toHaveLength(0)
  })

  it('does nothing if controller has no claimed unit', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1' })
    const world = new World(grid, [unit])
    expect(() => world.stepUnit('p1', 'right')).not.toThrow()
    expect(unit.path).toHaveLength(0)
  })

  it('replaces existing path with new single-step path', () => {
    const grid = new Grid()
    const pair = passablePairRight(grid)
    if (pair === null)
      return
    const unit = makeUnit({
      id: 'u1',
      controller: 'p1',
      col: pair.from.col,
      row: pair.from.row,
      path: [{ col: 50, row: 50 }, { col: 51, row: 50 }],
    })
    const world = new World(grid, [unit])
    world.stepUnit('p1', 'right')
    expect(unit.path).toHaveLength(1)
    expect(unit.path[0]).toEqual({ col: pair.to.col, row: pair.to.row })
  })
})

// ---------------------------------------------------------------------------
// world.pathfindUnit
// ---------------------------------------------------------------------------

describe('world.pathfindUnit', () => {
  function findDistantPassableTile(grid: Grid, fromRow: number): { col: number, row: number } | null {
    for (let row = fromRow + 2; row < Grid.ROWS; row++) {
      for (let col = 0; col < Grid.COLS; col++) {
        if (grid.isPassable(col, row))
          return { col, row }
      }
    }
    return null
  }

  it('sets a non-empty path when target is a reachable passable tile', () => {
    const grid = new Grid()
    const start = firstPassable(grid)
    const target = findDistantPassableTile(grid, start.row)
    if (target === null)
      return
    const unit = makeUnit({ id: 'u1', controller: 'p1', col: start.col, row: start.row })
    const world = new World(grid, [unit])
    world.pathfindUnit('p1', target.col, target.row)
    expect(unit.path.length).toBeGreaterThan(0)
  })

  it('does nothing when target is an obstacle tile', () => {
    const grid = new Grid()
    const start = firstPassable(grid)
    const obstacle = firstObstacle(grid)
    if (obstacle === null)
      return
    const unit = makeUnit({ id: 'u1', controller: 'p1', col: start.col, row: start.row })
    const world = new World(grid, [unit])
    world.pathfindUnit('p1', obstacle.col, obstacle.row)
    expect(unit.path).toHaveLength(0)
  })

  it('does nothing if controller has no claimed unit', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1' })
    const world = new World(grid, [unit])
    expect(() => world.pathfindUnit('p1', 10, 10)).not.toThrow()
    expect(unit.path).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// world.registerInput
// ---------------------------------------------------------------------------

describe('world.registerInput', () => {
  it('resets idleMs to 0 for the claimed unit', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', controller: 'p1', idleMs: 7000 })
    const world = new World(grid, [unit])
    world.registerInput('p1')
    expect(unit.idleMs).toBe(0)
  })

  it('does nothing if controller has no claimed unit', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', idleMs: 7000 })
    const world = new World(grid, [unit])
    expect(() => world.registerInput('p1')).not.toThrow()
    expect(unit.idleMs).toBe(7000)
  })
})

// ---------------------------------------------------------------------------
// world.getClaimedUnits
// ---------------------------------------------------------------------------

describe('world.getClaimedUnits', () => {
  it('returns null for both when no units are claimed', () => {
    const grid = new Grid()
    const world = new World(grid, [makeUnit({ id: 'a' }), makeUnit({ id: 'b' })])
    const claimed = world.getClaimedUnits()
    expect(claimed.p1).toBeNull()
    expect(claimed.p2).toBeNull()
  })

  it('reflects live claim/release state', () => {
    const grid = new Grid()
    const a = makeUnit({ id: 'a' })
    const b = makeUnit({ id: 'b' })
    const world = new World(grid, [a, b])

    world.claimUnit('p1', 'a')
    world.claimUnit('p2', 'b')
    expect(world.getClaimedUnits().p1?.id).toBe('a')
    expect(world.getClaimedUnits().p2?.id).toBe('b')

    world.releaseUnit('p2')
    expect(world.getClaimedUnits().p2).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// world.nearestUnclaimedUnit
// ---------------------------------------------------------------------------

describe('world.nearestUnclaimedUnit', () => {
  it('returns the id of the closest unclaimed unit by Euclidean distance', () => {
    const grid = new Grid()
    const near = makeUnit({ id: 'near', col: 5, row: 5 })
    const far = makeUnit({ id: 'far', col: 50, row: 50 })
    const world = new World(grid, [near, far])
    expect(world.nearestUnclaimedUnit(near.pixelX, near.pixelY)).toBe('near')
  })

  it('ignores claimed units', () => {
    const grid = new Grid()
    const claimed = makeUnit({ id: 'claimed', controller: 'p1', col: 5, row: 5 })
    const unclaimed = makeUnit({ id: 'unclaimed', col: 50, row: 50 })
    const world = new World(grid, [claimed, unclaimed])
    expect(world.nearestUnclaimedUnit(claimed.pixelX, claimed.pixelY)).toBe('unclaimed')
  })

  it('returns null when all units are claimed', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', controller: 'p1' })
    const world = new World(grid, [unit])
    expect(world.nearestUnclaimedUnit(0, 0)).toBeNull()
  })

  it('returns null when units array is empty', () => {
    const grid = new Grid()
    const world = new World(grid, [])
    expect(world.nearestUnclaimedUnit(0, 0)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// world.tick
// ---------------------------------------------------------------------------

describe('world.tick', () => {
  it('advances unit pixelX toward next waypoint', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', col: 5, row: 5, path: [{ col: 6, row: 5 }] })
    const world = new World(grid, [unit])
    world.tick(100) // 6 tiles/s * 32 px/tile * 0.1 s = 19.2 px
    expect(unit.pixelX).toBeCloseTo(5 * TS + TS / 2 + 19.2, 1)
  })

  it('dequeues waypoint when unit reaches tile center', () => {
    const grid = new Grid()
    const targetPixelX = 6 * TS + TS / 2
    const unit = makeUnit({ id: 'u1', controller: 'p1', col: 5, row: 5, pixelX: targetPixelX - 0.5, path: [{ col: 6, row: 5 }] })
    const world = new World(grid, [unit])
    world.tick(500)
    expect(unit.col).toBe(6)
    expect(unit.path).toHaveLength(0)
  })

  it('unit stops at final destination', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', controller: 'p1', col: 5, row: 5, path: [{ col: 6, row: 5 }] })
    const world = new World(grid, [unit])
    world.tick(10_000)
    expect(unit.col).toBe(6)
    expect(unit.pixelX).toBe(6 * TS + TS / 2)
    expect(unit.path).toHaveLength(0)
  })

  it('unit with empty path does not move', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', col: 5, row: 5 })
    const world = new World(grid, [unit])
    world.tick(1000)
    expect(unit.pixelX).toBe(5 * TS + TS / 2)
    expect(unit.col).toBe(5)
  })

  it('unclaimed unit picks a new random destination when path runs out', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', controller: null })
    const world = new World(grid, [unit])
    world.tick(0)
    expect(unit.path.length).toBeGreaterThan(0)
  })

  it('claimed unit does not get wandering path assigned', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', controller: 'p1' })
    const world = new World(grid, [unit])
    world.tick(0)
    expect(unit.path).toHaveLength(0)
  })

  it('increments idleMs for claimed units', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', controller: 'p1' })
    const world = new World(grid, [unit])
    world.tick(500)
    expect(unit.idleMs).toBe(500)
  })

  it('does not increment idleMs for unclaimed units', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', controller: null })
    const world = new World(grid, [unit])
    world.tick(500)
    expect(unit.idleMs).toBe(0)
  })

  it('auto-releases a unit when idleMs >= 10 000', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', controller: 'p1', idleMs: 9900 })
    const world = new World(grid, [unit])
    world.tick(200) // 9900 + 200 = 10 100 ≥ 10 000
    expect(unit.controller).toBeNull()
  })

  it('does not auto-release a unit when idleMs < 10 000', () => {
    const grid = new Grid()
    const unit = makeUnit({ id: 'u1', controller: 'p1', idleMs: 0 })
    const world = new World(grid, [unit])
    world.tick(9000)
    expect(unit.controller).toBe('p1')
  })
})
