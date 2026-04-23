import { describe, expect, it } from 'vitest'

import { Grid } from '../grid'

describe('grid', () => {
  it('isPassable returns a boolean for every valid coordinate', () => {
    const grid = new Grid()
    for (let row = 0; row < Grid.ROWS; row++) {
      for (let col = 0; col < Grid.COLS; col++) {
        expect(typeof grid.isPassable(col, row)).toBe('boolean')
      }
    }
  })

  it('obstacle count is within ±50% of expected density', () => {
    const grid = new Grid()
    let obstacleCount = 0
    for (let row = 0; row < Grid.ROWS; row++) {
      for (let col = 0; col < Grid.COLS; col++) {
        if (!grid.isPassable(col, row)) {
          obstacleCount++
        }
      }
    }
    const expected = Grid.COLS * Grid.ROWS * Grid.OBSTACLE_DENSITY
    expect(obstacleCount).toBeGreaterThanOrEqual(expected * 0.5)
    expect(obstacleCount).toBeLessThanOrEqual(expected * 1.5)
  })

  it('returns true for a passable tile', () => {
    const grid = new Grid()
    let passableCol = -1
    let passableRow = -1
    let found = false
    for (let row = 0; row < Grid.ROWS && !found; row++) {
      for (let col = 0; col < Grid.COLS && !found; col++) {
        if (grid.isPassable(col, row)) {
          passableCol = col
          passableRow = row
          found = true
        }
      }
    }
    expect(passableCol).toBeGreaterThanOrEqual(0)
    expect(grid.isPassable(passableCol, passableRow)).toBe(true)
  })

  it('returns false for an obstacle tile', () => {
    const grid = new Grid()
    let obstacleCol = -1
    let obstacleRow = -1
    let found = false
    for (let row = 0; row < Grid.ROWS && !found; row++) {
      for (let col = 0; col < Grid.COLS && !found; col++) {
        if (!grid.isPassable(col, row)) {
          obstacleCol = col
          obstacleRow = row
          found = true
        }
      }
    }
    expect(obstacleCol).toBeGreaterThanOrEqual(0)
    expect(grid.isPassable(obstacleCol, obstacleRow)).toBe(false)
  })

  it('returns false for out-of-bounds coordinates', () => {
    const grid = new Grid()
    expect(grid.isPassable(-1, 0)).toBe(false)
    expect(grid.isPassable(0, -1)).toBe(false)
    expect(grid.isPassable(Grid.COLS, 0)).toBe(false)
    expect(grid.isPassable(0, Grid.ROWS)).toBe(false)
  })

  it('getTile returns null for out-of-bounds coordinates', () => {
    const grid = new Grid()
    expect(grid.getTile(-1, 0)).toBeNull()
    expect(grid.getTile(0, -1)).toBeNull()
    expect(grid.getTile(Grid.COLS, 0)).toBeNull()
    expect(grid.getTile(0, Grid.ROWS)).toBeNull()
  })

  it('getTile returns a tile for valid coordinates', () => {
    const grid = new Grid()
    const tile = grid.getTile(0, 0)
    expect(tile).not.toBeNull()
    expect(['passable', 'obstacle']).toContain(tile!.type)
  })
})
