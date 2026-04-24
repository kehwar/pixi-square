import type { GameWorld } from '../types'
import { addComponent, addEntity, createWorld } from 'bitecs'
import { describe, expect, it } from 'vitest'
import { _findPath, requestPath } from '../PathfindingSystem'
import * as GridSystem from '../GridSystem'
import { addPositionComponent } from '../PositionSystem'
import { addMovementComponent, Movement } from '../MovementSystem'

// --- Helpers ---

/** Build a grid from a 2D boolean array: true = passable, false = obstacle. */
function makeGrid(rows: boolean[][]): { isPassable: (col: number, row: number) => boolean } {
  return {
    isPassable(col: number, row: number): boolean {
      if (row < 0 || row >= rows.length)
        return false
      const r = rows[row]!
      if (col < 0 || col >= r.length)
        return false
      return r[col]!
    },
  }
}

// 5×5 grid layout (row-major, true = passable):
// . . . . .
// . X . . .
// . . . . .
// . . . X .
// . . . . .
const T = true
const F = false
const grid5x5 = makeGrid([
  [T, T, T, T, T],
  [T, F, T, T, T],
  [T, T, T, T, T],
  [T, T, T, F, T],
  [T, T, T, T, T],
])

// --- A* tests (migrated from pathfinder.spec.ts) ---

describe('pathfindingSystem._findPath', () => {
  it('returns a non-null path between two passable tiles', () => {
    const path = _findPath(grid5x5, 0, 0, 4, 4)
    expect(path).not.toBeNull()
    expect(path!.length).toBeGreaterThan(0)
  })

  it('returns null when the destination is an obstacle', () => {
    const path = _findPath(grid5x5, 0, 0, 1, 1)
    expect(path).toBeNull()
  })

  it('returns an empty array when source equals destination', () => {
    const path = _findPath(grid5x5, 2, 2, 2, 2)
    expect(path).toEqual([])
  })

  it('path includes no obstacle tiles', () => {
    const path = _findPath(grid5x5, 0, 0, 4, 4)
    expect(path).not.toBeNull()
    for (const tile of path!) {
      expect(grid5x5.isPassable(tile.col, tile.row)).toBe(true)
    }
  })

  it('path ends at the destination', () => {
    const path = _findPath(grid5x5, 0, 0, 4, 4)
    expect(path).not.toBeNull()
    expect(path!.at(-1)).toEqual({ col: 4, row: 4 })
  })

  it('path does not include the source tile', () => {
    const path = _findPath(grid5x5, 0, 0, 4, 4)
    expect(path).not.toBeNull()
    expect(path![0]).not.toEqual({ col: 0, row: 0 })
  })

  it('uses diagonal moves when they shorten the path', () => {
    const simpleDiag = makeGrid([
      [T, T, T],
      [T, T, T],
      [T, T, T],
    ])
    const path = _findPath(simpleDiag, 0, 0, 2, 2)
    expect(path).not.toBeNull()
    expect(path!.length).toBe(2)
    expect(path![0]).toEqual({ col: 1, row: 1 })
    expect(path![1]).toEqual({ col: 2, row: 2 })
  })

  it('returns null when destination is completely surrounded by obstacles', () => {
    const isolated = makeGrid([
      [T, T, T, T, T],
      [T, F, F, F, T],
      [T, F, T, F, T],
      [T, F, F, F, T],
      [T, T, T, T, T],
    ])
    const path = _findPath(isolated, 0, 0, 2, 2)
    expect(path).toBeNull()
  })

  it('routes around an obstacle in the direct path', () => {
    const blockedMid = makeGrid([
      [T, T, T],
      [F, F, T],
      [T, T, T],
    ])
    const path = _findPath(blockedMid, 0, 0, 0, 2)
    expect(path).not.toBeNull()
    for (const tile of path!) {
      expect(blockedMid.isPassable(tile.col, tile.row)).toBe(true)
    }
    expect(path!.at(-1)).toEqual({ col: 0, row: 2 })
  })

  it('does not cut corners through obstacle tiles diagonally', () => {
    const cornerGrid = makeGrid([
      [T, F],
      [F, T],
    ])
    const path = _findPath(cornerGrid, 0, 0, 1, 1)
    expect(path).toBeNull()
  })

  it('allows diagonal when neither cardinal neighbour is an obstacle', () => {
    const open3x3 = makeGrid([
      [T, T, T],
      [T, T, T],
      [T, T, T],
    ])
    const path = _findPath(open3x3, 0, 0, 2, 2)
    expect(path).not.toBeNull()
    expect(path!.length).toBe(2)
  })
})

// --- requestPath integration tests ---

describe('pathfindingSystem.requestPath', () => {
  function makePassableWorld(): {
    world: ReturnType<typeof createWorld<GameWorld>>
    worldEid: number
  } {
    const w = createWorld<GameWorld>({} as GameWorld)
    const wId = addEntity(w)
    // Build an all-passable grid so paths are always found
    const tiles: GridSystem.Tile[][] = Array.from({ length: GridSystem.ROWS }, () =>
      Array.from({ length: GridSystem.COLS }, () => ({ type: 'passable' as GridSystem.TileType })),
    )
    GridSystem.Grid[wId] = { tiles }
    addComponent(w, wId, GridSystem.Grid)
    return { world: w, worldEid: wId }
  }

  it('writes a non-empty path for a reachable destination', () => {
    const { world } = makePassableWorld()
    const eid = addEntity(world)
    addPositionComponent(world, eid, 0, 0)
    addMovementComponent(world, eid)

    requestPath(world, eid, 5, 5)
    expect(Movement.path[eid]!.length).toBeGreaterThan(0)
    expect(Movement.path[eid]!.at(-1)).toEqual({ col: 5, row: 5 })
  })

  it('does not update path when destination is an obstacle', () => {
    const { world } = makePassableWorld()
    const wId = addEntity(world) // second entity just for reference — grid is on the first
    void wId

    const w2 = createWorld<GameWorld>({} as GameWorld)
    const wId2 = addEntity(w2)
    const tiles: GridSystem.Tile[][] = Array.from({ length: GridSystem.ROWS }, () =>
      Array.from({ length: GridSystem.COLS }, () => ({ type: 'passable' as GridSystem.TileType })),
    )
    tiles[3]![3] = { type: 'obstacle' }
    GridSystem.Grid[wId2] = { tiles }
    addComponent(w2, wId2, GridSystem.Grid)

    const eid = addEntity(w2)
    addPositionComponent(w2, eid, 0, 0)
    addMovementComponent(w2, eid)

    requestPath(w2, eid, 3, 3) // obstacle destination
    expect(Movement.path[eid]!.length).toBe(0) // path stays empty
  })
})
