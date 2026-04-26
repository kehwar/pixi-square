import type { GridData } from '../../systems/GridSystem'
import type { MovementStore, PositionStore } from '../pathfinding'
import { describe, expect, it } from 'vitest'
import { findPath, requestPath } from '../pathfinding'

// --- Helpers ---

/** Build a PassableGrid-compatible object from a 2D boolean array. */
function makePassableGrid(rows: boolean[][]): { isPassable: (col: number, row: number) => boolean } {
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

function makeGridData(rows: boolean[][]): GridData {
  return {
    tiles: rows.map(row => row.map(passable => ({ type: passable ? 'passable' as const : 'obstacle' as const }))),
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
const grid5x5 = makePassableGrid([
  [T, T, T, T, T],
  [T, F, T, T, T],
  [T, T, T, T, T],
  [T, T, T, F, T],
  [T, T, T, T, T],
])

const gridData5x5 = makeGridData([
  [T, T, T, T, T],
  [T, F, T, T, T],
  [T, T, T, T, T],
  [T, T, T, F, T],
  [T, T, T, T, T],
])

// --- findPath tests ---

describe('pathfinding.findPath', () => {
  it('returns a non-null path between two passable tiles', () => {
    const path = findPath(grid5x5, 0, 0, 4, 4)
    expect(path).not.toBeNull()
    expect(path!.length).toBeGreaterThan(0)
  })

  it('returns null when the destination is an obstacle', () => {
    const path = findPath(grid5x5, 0, 0, 1, 1)
    expect(path).toBeNull()
  })

  it('returns an empty array when source equals destination', () => {
    const path = findPath(grid5x5, 2, 2, 2, 2)
    expect(path).toEqual([])
  })

  it('path includes no obstacle tiles', () => {
    const path = findPath(grid5x5, 0, 0, 4, 4)
    expect(path).not.toBeNull()
    for (const tile of path!) {
      expect(grid5x5.isPassable(tile.col, tile.row)).toBe(true)
    }
  })

  it('path ends at the destination', () => {
    const path = findPath(grid5x5, 0, 0, 4, 4)
    expect(path).not.toBeNull()
    expect(path!.at(-1)).toEqual({ col: 4, row: 4 })
  })

  it('path does not include the source tile', () => {
    const path = findPath(grid5x5, 0, 0, 4, 4)
    expect(path).not.toBeNull()
    expect(path![0]).not.toEqual({ col: 0, row: 0 })
  })

  it('uses diagonal moves when they shorten the path', () => {
    const simpleDiag = makePassableGrid([
      [T, T, T],
      [T, T, T],
      [T, T, T],
    ])
    const path = findPath(simpleDiag, 0, 0, 2, 2)
    expect(path).not.toBeNull()
    expect(path!.length).toBe(2)
    expect(path![0]).toEqual({ col: 1, row: 1 })
    expect(path![1]).toEqual({ col: 2, row: 2 })
  })

  it('returns null when destination is completely surrounded by obstacles', () => {
    const isolated = makePassableGrid([
      [T, T, T, T, T],
      [T, F, F, F, T],
      [T, F, T, F, T],
      [T, F, F, F, T],
      [T, T, T, T, T],
    ])
    const path = findPath(isolated, 0, 0, 2, 2)
    expect(path).toBeNull()
  })

  it('routes around an obstacle in the direct path', () => {
    const blockedMid = makePassableGrid([
      [T, T, T],
      [F, F, T],
      [T, T, T],
    ])
    const path = findPath(blockedMid, 0, 0, 0, 2)
    expect(path).not.toBeNull()
    for (const tile of path!) {
      expect(blockedMid.isPassable(tile.col, tile.row)).toBe(true)
    }
    expect(path!.at(-1)).toEqual({ col: 0, row: 2 })
  })

  it('does not cut corners through obstacle tiles diagonally', () => {
    const cornerGrid = makePassableGrid([
      [T, F],
      [F, T],
    ])
    const path = findPath(cornerGrid, 0, 0, 1, 1)
    expect(path).toBeNull()
  })

  it('allows diagonal when neither cardinal neighbour is an obstacle', () => {
    const open3x3 = makePassableGrid([
      [T, T, T],
      [T, T, T],
      [T, T, T],
    ])
    const path = findPath(open3x3, 0, 0, 2, 2)
    expect(path).not.toBeNull()
    expect(path!.length).toBe(2)
  })
})

// --- requestPath tests ---

describe('pathfinding.requestPath', () => {
  function makeStores(eid: number, col: number, row: number): {
    positionData: PositionStore
    movementData: MovementStore
  } {
    const positionData: PositionStore = { col: [], row: [] }
    positionData.col[eid] = col
    positionData.row[eid] = row
    const movementData: MovementStore = { path: [] }
    movementData.path[eid] = []
    return { positionData, movementData }
  }

  it('writes a non-empty path for a reachable destination', () => {
    const eid = 1
    const { positionData, movementData } = makeStores(eid, 0, 0)
    requestPath(gridData5x5, movementData, positionData, eid, 4, 4)
    expect(movementData.path[eid]!.length).toBeGreaterThan(0)
    expect(movementData.path[eid]!.at(-1)).toEqual({ col: 4, row: 4 })
  })

  it('does not update path when destination is an obstacle', () => {
    const eid = 1
    const { positionData, movementData } = makeStores(eid, 0, 0)
    requestPath(gridData5x5, movementData, positionData, eid, 1, 1) // obstacle
    expect(movementData.path[eid]!.length).toBe(0)
  })

  it('writes an empty path when source equals destination', () => {
    const eid = 1
    const { positionData, movementData } = makeStores(eid, 2, 2)
    movementData.path[eid] = [{ col: 0, row: 0 }] // pre-existing path
    requestPath(gridData5x5, movementData, positionData, eid, 2, 2)
    expect(movementData.path[eid]).toEqual([])
  })

  it('path ends at the requested destination', () => {
    const eid = 2
    const { positionData, movementData } = makeStores(eid, 0, 2)
    requestPath(gridData5x5, movementData, positionData, eid, 4, 2)
    const path = movementData.path[eid]!
    expect(path.length).toBeGreaterThan(0)
    expect(path.at(-1)).toEqual({ col: 4, row: 2 })
  })
})
