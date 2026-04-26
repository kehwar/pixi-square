import type { GameWorld } from '../types'
import { addEntity, createWorld, query } from 'bitecs'
import { describe, expect, it } from 'vitest'
import * as GridSystem from '../GridSystem'
import { Movement } from '../MovementSystem'
import { Position } from '../PositionSystem'
import * as UnitFactorySystem from '../UnitFactorySystem'

function makeWorld(): {
  world: ReturnType<typeof createWorld<GameWorld>>
  worldEid: number
} {
  const world = createWorld<GameWorld>({} as GameWorld)
  const worldEid = addEntity(world)
  GridSystem.create(world, worldEid)
  return { world, worldEid }
}

describe('unitFactorySystem', () => {
  it('creates exactly 200 unit entities', () => {
    const { world, worldEid } = makeWorld()
    UnitFactorySystem.create(world, worldEid)
    expect(UnitFactorySystem.UNIT_COUNT).toBe(200)
    const entities = Array.from(query(world, [Position, Movement]))
    expect(entities.length).toBe(200)
  })

  it('query(world, [Position, Movement]) returns 200 entities', () => {
    const { world, worldEid } = makeWorld()
    UnitFactorySystem.create(world, worldEid)
    const entities = Array.from(query(world, [Position, Movement]))
    expect(entities.length).toBe(200)
  })

  it('all units spawn on passable tiles', () => {
    const { world, worldEid } = makeWorld()
    UnitFactorySystem.create(world, worldEid)
    const entities = Array.from(query(world, [Position, Movement]))
    const gridData = GridSystem.Grid[worldEid]!
    for (const eid of entities) {
      expect(GridSystem.isPassable(gridData, Position.col[eid]!, Position.row[eid]!)).toBe(true)
    }
  })

  it('unit pixel positions are at tile centres', () => {
    const { world, worldEid } = makeWorld()
    UnitFactorySystem.create(world, worldEid)
    const entities = Array.from(query(world, [Position, Movement]))
    for (const eid of entities) {
      expect(Position.pixelX[eid]).toBe(Position.col[eid]! * GridSystem.TILE_SIZE + GridSystem.TILE_SIZE / 2)
      expect(Position.pixelY[eid]).toBe(Position.row[eid]! * GridSystem.TILE_SIZE + GridSystem.TILE_SIZE / 2)
    }
  })
})
