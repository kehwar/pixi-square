import type { GameWorld } from '../types'
import { addEntity, createWorld } from 'bitecs'
import { describe, expect, it } from 'vitest'
import * as GridSystem from '../GridSystem'
import { COLS, Grid, isPassable, OBSTACLE_DENSITY, randomPassableTile, ROWS } from '../GridSystem'

function makeWorld(): { world: ReturnType<typeof createWorld<GameWorld>>, worldEid: number } {
  const world = createWorld<GameWorld>({} as GameWorld)
  const worldEid = addEntity(world)
  GridSystem.create(world, worldEid)
  return { world, worldEid }
}

describe('gridSystem', () => {
  describe('tile generation', () => {
    it('isPassable returns a boolean for every valid coordinate', () => {
      const { worldEid } = makeWorld()
      const gridData = Grid[worldEid]!
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          expect(typeof isPassable(gridData, col, row)).toBe('boolean')
        }
      }
    })

    it('obstacle count is within ±50% of expected density', () => {
      const { worldEid } = makeWorld()
      const gridData = Grid[worldEid]!
      let obstacleCount = 0
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (!isPassable(gridData, col, row)) {
            obstacleCount++
          }
        }
      }
      const expected = COLS * ROWS * OBSTACLE_DENSITY
      expect(obstacleCount).toBeGreaterThanOrEqual(expected * 0.5)
      expect(obstacleCount).toBeLessThanOrEqual(expected * 1.5)
    })

    it('returns true for a passable tile', () => {
      const { worldEid } = makeWorld()
      const gridData = Grid[worldEid]!
      let passableCol = -1
      let passableRow = -1
      let found = false
      for (let row = 0; row < ROWS && !found; row++) {
        for (let col = 0; col < COLS && !found; col++) {
          if (isPassable(gridData, col, row)) {
            passableCol = col
            passableRow = row
            found = true
          }
        }
      }
      expect(passableCol).toBeGreaterThanOrEqual(0)
      expect(isPassable(gridData, passableCol, passableRow)).toBe(true)
    })

    it('returns false for an obstacle tile', () => {
      const { worldEid } = makeWorld()
      const gridData = Grid[worldEid]!
      let obstacleCol = -1
      let obstacleRow = -1
      let found = false
      for (let row = 0; row < ROWS && !found; row++) {
        for (let col = 0; col < COLS && !found; col++) {
          if (!isPassable(gridData, col, row)) {
            obstacleCol = col
            obstacleRow = row
            found = true
          }
        }
      }
      expect(obstacleCol).toBeGreaterThanOrEqual(0)
      expect(isPassable(gridData, obstacleCol, obstacleRow)).toBe(false)
    })

    it('grid[worldEid].tiles contains the correct number of rows and columns', () => {
      const { worldEid } = makeWorld()
      expect(Grid[worldEid]!.tiles.length).toBe(ROWS)
      expect(Grid[worldEid]!.tiles[0]!.length).toBe(COLS)
    })
  })

  describe('bounds checks', () => {
    it('returns false for out-of-bounds coordinates', () => {
      const { worldEid } = makeWorld()
      const gridData = Grid[worldEid]!
      expect(isPassable(gridData, -1, 0)).toBe(false)
      expect(isPassable(gridData, 0, -1)).toBe(false)
      expect(isPassable(gridData, COLS, 0)).toBe(false)
      expect(isPassable(gridData, 0, ROWS)).toBe(false)
    })
  })

  describe('randomPassableTile', () => {
    it('returns a tile within bounds', () => {
      const { worldEid } = makeWorld()
      const gridData = Grid[worldEid]!
      const tile = randomPassableTile(gridData)
      expect(tile.col).toBeGreaterThanOrEqual(0)
      expect(tile.col).toBeLessThan(COLS)
      expect(tile.row).toBeGreaterThanOrEqual(0)
      expect(tile.row).toBeLessThan(ROWS)
    })

    it('returns a passable tile', () => {
      const { worldEid } = makeWorld()
      const gridData = Grid[worldEid]!
      const tile = randomPassableTile(gridData)
      expect(isPassable(gridData, tile.col, tile.row)).toBe(true)
    })

    it('returns different tiles across multiple calls (not always the same)', () => {
      const { worldEid } = makeWorld()
      const gridData = Grid[worldEid]!
      const coords = new Set<string>()
      for (let i = 0; i < 20; i++) {
        const t = randomPassableTile(gridData)
        coords.add(`${t.col},${t.row}`)
      }
      // With a 200×200 grid and 20 attempts, we should get at least a few distinct results
      expect(coords.size).toBeGreaterThan(1)
    })
  })
})
