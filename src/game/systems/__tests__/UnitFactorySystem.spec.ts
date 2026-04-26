import { addComponent, addEntity, query } from 'bitecs'
import { describe, expect, it, vi } from 'vitest'
import { Grid, GridSystem, isPassable, TILE_SIZE } from '../GridSystem'
import { Movement } from '../MovementSystem'
import { Position } from '../PositionSystem'
import { createWorld } from '../types'
import * as UnitFactorySystem from '../UnitFactorySystem'

vi.mock('phaser', () => {
  class EventEmitter {}
  return { Events: { EventEmitter } }
})

const fakeScene = {} as Parameters<typeof createWorld>[0]

function makeWorld(): {
  world: ReturnType<typeof createWorld>
  worldEid: number
} {
  const world = createWorld(fakeScene)
  world.installSystem(new GridSystem())
  const worldEid = addEntity(world)
  addComponent(world, worldEid, GridSystem)
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
    const gridData = Grid[worldEid]!
    for (const eid of entities) {
      expect(isPassable(gridData, Position.col[eid]!, Position.row[eid]!)).toBe(true)
    }
  })

  it('unit pixel positions are at tile centres', () => {
    const { world, worldEid } = makeWorld()
    UnitFactorySystem.create(world, worldEid)
    const entities = Array.from(query(world, [Position, Movement]))
    for (const eid of entities) {
      expect(Position.pixelX[eid]).toBe(Position.col[eid]! * TILE_SIZE + TILE_SIZE / 2)
      expect(Position.pixelY[eid]).toBe(Position.row[eid]! * TILE_SIZE + TILE_SIZE / 2)
    }
  })
})
