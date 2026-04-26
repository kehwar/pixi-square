import { addComponent, addEntity, query } from 'bitecs'
import { describe, expect, it, vi } from 'vitest'
import { Grid, GridSystem, isPassable, TILE_SIZE } from '../GridSystem'
import { MovementSystem } from '../MovementSystem'
import { PathfindingSystem } from '../PathfindingSystem'
import { Position, PositionSystem } from '../PositionSystem'
import { createWorld } from '../types'
import { UNIT_COUNT, UnitFactorySystem } from '../UnitFactorySystem'
import { WanderingSystem } from '../WanderingSystem'

vi.mock('phaser', () => {
  class EventEmitter {
    on = vi.fn().mockReturnThis()
    off = vi.fn().mockReturnThis()
    emit = vi.fn()
  }
  return { Events: { EventEmitter } }
})

const fakeScene = {} as Parameters<typeof createWorld>[0]

function makeWorld(): {
  world: ReturnType<typeof createWorld>
  worldEid: number
} {
  const world = createWorld(fakeScene)
  world.installSystem(new GridSystem())
  world.installSystem(new PositionSystem())
  world.installSystem(new MovementSystem())
  world.installSystem(new PathfindingSystem())
  world.installSystem(new WanderingSystem())
  world.installSystem(new UnitFactorySystem())
  const worldEid = addEntity(world)
  addComponent(world, worldEid, GridSystem)
  return { world, worldEid }
}

describe('unitFactorySystem', () => {
  it('creates exactly 200 unit entities', () => {
    const { world, worldEid } = makeWorld()
    addComponent(world, worldEid, UnitFactorySystem)
    expect(UNIT_COUNT).toBe(200)
    const entities = Array.from(query(world, [PositionSystem, MovementSystem]))
    expect(entities.length).toBe(200)
  })

  it('query(world, [PositionSystem, MovementSystem]) returns 200 entities', () => {
    const { world, worldEid } = makeWorld()
    addComponent(world, worldEid, UnitFactorySystem)
    const entities = Array.from(query(world, [PositionSystem, MovementSystem]))
    expect(entities.length).toBe(200)
  })

  it('all units spawn on passable tiles', () => {
    const { world, worldEid } = makeWorld()
    addComponent(world, worldEid, UnitFactorySystem)
    const entities = Array.from(query(world, [PositionSystem, MovementSystem]))
    const gridData = Grid[worldEid]!
    for (const eid of entities) {
      expect(isPassable(gridData, Position.col[eid]!, Position.row[eid]!)).toBe(true)
    }
  })

  it('unit pixel positions are at tile centres', () => {
    const { world, worldEid } = makeWorld()
    addComponent(world, worldEid, UnitFactorySystem)
    const entities = Array.from(query(world, [PositionSystem, MovementSystem]))
    for (const eid of entities) {
      expect(Position.pixelX[eid]).toBe(Position.col[eid]! * TILE_SIZE + TILE_SIZE / 2)
      expect(Position.pixelY[eid]).toBe(Position.row[eid]! * TILE_SIZE + TILE_SIZE / 2)
    }
  })

  it('all units have WanderingSystem component attached', () => {
    const { world, worldEid } = makeWorld()
    addComponent(world, worldEid, UnitFactorySystem)
    const entities = Array.from(query(world, [PositionSystem, MovementSystem]))
    const wanderers = Array.from(query(world, [WanderingSystem]))
    expect(wanderers.length).toBe(entities.length)
  })
})
