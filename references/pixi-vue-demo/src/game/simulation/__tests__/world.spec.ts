import type { Unit } from '../unit'

import { describe, expect, it } from 'vitest'
import { Grid } from '../grid'
import { World, WorldFactory } from '../world'

describe('worldFactory', () => {
  it('creates 1 player + 20 AI units', () => {
    const world = WorldFactory.create()
    expect(world.getState().units).toHaveLength(1 + WorldFactory.AI_COUNT)
  })

  it('first unit is the player; rest are AI', () => {
    const world = WorldFactory.create()
    const { units } = world.getState()
    expect(units[0]!.type).toBe('player')
    expect(units.slice(1).every(u => u.type === 'ai')).toBe(true)
  })

  it('playerUnitId matches the player unit id', () => {
    const world = WorldFactory.create()
    const { units, playerUnitId } = world.getState()
    expect(units[0]!.id).toBe(playerUnitId)
  })

  it('player unit spawns on a passable tile', () => {
    const world = WorldFactory.create()
    const { units } = world.getState()
    const player = units[0]!
    expect(world.getGrid().isPassable(player.col, player.row)).toBe(true)
  })

  it('player pixel position is at tile center', () => {
    const world = WorldFactory.create()
    const player = world.getState().units[0]!
    const ts = Grid.TILE_SIZE
    expect(player.pixelX).toBe(player.col * ts + ts / 2)
    expect(player.pixelY).toBe(player.row * ts + ts / 2)
  })
})

describe('world', () => {
  function makeWorld(): { world: World, player: Unit } {
    const grid = new Grid()
    const player: Unit = { id: 'p1', type: 'player', col: 5, row: 5, pixelX: 176, pixelY: 176, speed: 2, path: [] }
    const world = new World(grid, [player], 'p1')
    return { world, player }
  }

  it('getGrid returns the grid', () => {
    const { world } = makeWorld()
    expect(world.getGrid()).toBeInstanceOf(Grid)
  })

  it('getState returns the expected playerUnitId', () => {
    const { world } = makeWorld()
    expect(world.getState().playerUnitId).toBe('p1')
  })

  it('getState returns the units array', () => {
    const { world, player } = makeWorld()
    expect(world.getState().units).toContain(player)
  })
})

describe('world.tick', () => {
  const ts = Grid.TILE_SIZE // 32

  function makeMovingUnit(col: number, row: number, pathCols: number[]): { world: World, player: Unit } {
    const grid = new Grid()
    const player: Unit = {
      id: 'p1',
      type: 'player',
      col,
      row,
      pixelX: col * ts + ts / 2,
      pixelY: row * ts + ts / 2,
      speed: 2,
      path: pathCols.map(c => ({ col: c, row })),
    }
    return { world: new World(grid, [player], 'p1'), player }
  }

  it('advances unit pixelX toward next waypoint', () => {
    const { world } = makeMovingUnit(5, 5, [6])
    world.tick(100) // 100 ms → 2 tiles/s * 32 px/tile * 0.1 s = 6.4 px
    const u = world.getState().units[0]!
    expect(u.pixelX).toBeCloseTo(5 * ts + ts / 2 + 6.4, 1)
    expect(u.pixelY).toBeCloseTo(5 * ts + ts / 2, 1)
  })

  it('dequeues waypoint when unit reaches tile center', () => {
    const col = 5
    const row = 5
    const grid = new Grid()
    // Place unit 1 px before the center of the next tile so a short tick crosses it
    const targetPixelX = 6 * ts + ts / 2
    const player: Unit = {
      id: 'p1',
      type: 'player',
      col,
      row,
      pixelX: targetPixelX - 1,
      pixelY: row * ts + ts / 2,
      speed: 2,
      path: [{ col: 6, row }],
    }
    const world = new World(grid, [player], 'p1')
    world.tick(500) // 500 ms covers much more than 1 px
    const u = world.getState().units[0]!
    expect(u.col).toBe(6)
    expect(u.path).toHaveLength(0)
  })

  it('unit stops at final destination', () => {
    const { world } = makeMovingUnit(5, 5, [6])
    world.tick(10_000) // way more than enough to reach one tile
    const u = world.getState().units[0]!
    expect(u.col).toBe(6)
    expect(u.row).toBe(5)
    expect(u.pixelX).toBe(6 * ts + ts / 2)
    expect(u.path).toHaveLength(0)
  })

  it('unit with empty path does not move', () => {
    const grid = new Grid()
    const player: Unit = { id: 'p1', type: 'player', col: 5, row: 5, pixelX: 5 * ts + ts / 2, pixelY: 5 * ts + ts / 2, speed: 2, path: [] }
    const world = new World(grid, [player], 'p1')
    world.tick(1000)
    const u = world.getState().units[0]!
    expect(u.pixelX).toBe(5 * ts + ts / 2)
    expect(u.col).toBe(5)
  })
})

describe('world.moveUnit', () => {
  function findPassableTile(grid: Grid): { col: number, row: number } {
    for (let r = 0; r < Grid.ROWS; r++) {
      for (let c = 0; c < Grid.COLS; c++) {
        if (grid.isPassable(c, r))
          return { col: c, row: r }
      }
    }
    throw new Error('no passable tile')
  }

  function findObstacleTile(grid: Grid): { col: number, row: number } {
    for (let r = 0; r < Grid.ROWS; r++) {
      for (let c = 0; c < Grid.COLS; c++) {
        if (!grid.isPassable(c, r))
          return { col: c, row: r }
      }
    }
    throw new Error('no obstacle tile')
  }

  it('sets a non-empty path when target is a reachable passable tile', () => {
    const grid = new Grid()
    const ts = Grid.TILE_SIZE
    // Find a passable tile for player start, then any distant passable tile as target
    const start = findPassableTile(grid)
    // Find a different passable tile on a different row
    let target: { col: number, row: number } | null = null
    for (let r = start.row + 2; r < Grid.ROWS && target === null; r++) {
      for (let c = 0; c < Grid.COLS && target === null; c++) {
        if (grid.isPassable(c, r))
          target = { col: c, row: r }
      }
    }
    if (target === null)
      return // degenerate grid — skip
    const player: Unit = { id: 'p1', type: 'player', col: start.col, row: start.row, pixelX: start.col * ts + ts / 2, pixelY: start.row * ts + ts / 2, speed: 2, path: [] }
    const world = new World(grid, [player], 'p1')
    world.moveUnit('p1', target.col, target.row)
    expect(world.getState().units[0]!.path.length).toBeGreaterThan(0)
  })

  it('does nothing when target is an obstacle tile', () => {
    const grid = new Grid()
    const ts = Grid.TILE_SIZE
    const start = findPassableTile(grid)
    const obstacle = findObstacleTile(grid)
    const player: Unit = { id: 'p1', type: 'player', col: start.col, row: start.row, pixelX: start.col * ts + ts / 2, pixelY: start.row * ts + ts / 2, speed: 2, path: [] }
    const world = new World(grid, [player], 'p1')
    world.moveUnit('p1', obstacle.col, obstacle.row)
    expect(world.getState().units[0]!.path).toHaveLength(0)
  })

  it('replaces an in-progress path with the new path', () => {
    const grid = new Grid()
    const ts = Grid.TILE_SIZE
    const start = findPassableTile(grid)
    let targetA: { col: number, row: number } | null = null
    let targetB: { col: number, row: number } | null = null
    for (let r = start.row + 2; r < Grid.ROWS; r++) {
      for (let c = 0; c < Grid.COLS; c++) {
        if (grid.isPassable(c, r)) {
          if (targetA === null)
            targetA = { col: c, row: r }
          else if ((c !== targetA.col || r !== targetA.row) && targetB === null)
            targetB = { col: c, row: r }
        }
        if (targetA !== null && targetB !== null)
          break
      }
      if (targetA !== null && targetB !== null)
        break
    }
    if (targetA === null || targetB === null)
      return // degenerate grid — skip
    const player: Unit = { id: 'p1', type: 'player', col: start.col, row: start.row, pixelX: start.col * ts + ts / 2, pixelY: start.row * ts + ts / 2, speed: 2, path: [] }
    const world = new World(grid, [player], 'p1')
    world.moveUnit('p1', targetA.col, targetA.row)
    const pathA = [...world.getState().units[0]!.path]
    world.moveUnit('p1', targetB.col, targetB.row)
    const pathB = world.getState().units[0]!.path
    // Path should have changed (different destination)
    expect(pathB.at(-1)).not.toEqual(pathA.at(-1))
  })
})

describe('world.tick — AI wandering', () => {
  const ts = Grid.TILE_SIZE

  it('an AI unit with an empty path picks a new passable destination after a tick', () => {
    const grid = new Grid()
    // Place AI unit at a known passable tile with empty path
    const start = (() => {
      for (let r = 0; r < Grid.ROWS; r++) {
        for (let c = 0; c < Grid.COLS; c++) {
          if (grid.isPassable(c, r))
            return { col: c, row: r }
        }
      }
      throw new Error('no passable tile')
    })()
    const ai: Unit = {
      id: 'a1',
      type: 'ai',
      col: start.col,
      row: start.row,
      pixelX: start.col * ts + ts / 2,
      pixelY: start.row * ts + ts / 2,
      speed: 3,
      path: [],
    }
    const world = new World(grid, [ai], 'a1')
    world.tick(16) // one frame
    const u = world.getState().units[0]!
    // After one tick the AI should have received a new path (may already be partially traveled)
    // Either the path is non-empty (more tiles remain) or the unit has moved (different col/row)
    const movedOrHasPath = u.path.length > 0 || u.col !== start.col || u.row !== start.row
    expect(movedOrHasPath).toBe(true)
  })

  it('the destination picked for an AI unit is a passable tile', () => {
    const grid = new Grid()
    const start = (() => {
      for (let r = 0; r < Grid.ROWS; r++) {
        for (let c = 0; c < Grid.COLS; c++) {
          if (grid.isPassable(c, r))
            return { col: c, row: r }
        }
      }
      throw new Error('no passable tile')
    })()
    const ai: Unit = {
      id: 'a1',
      type: 'ai',
      col: start.col,
      row: start.row,
      pixelX: start.col * ts + ts / 2,
      pixelY: start.row * ts + ts / 2,
      speed: 3,
      path: [],
    }
    const world = new World(grid, [ai], 'a1')
    world.tick(0) // zero-duration tick: no movement budget, but wandering logic still runs
    const u = world.getState().units[0]!
    if (u.path.length > 0) {
      const dest = u.path.at(-1)!
      expect(grid.isPassable(dest.col, dest.row)).toBe(true)
    }
  })
})
