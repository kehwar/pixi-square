import { afterEach, describe, expect, it, vi } from 'vitest'
import { GridSystem, isPassable, TILE_SIZE } from '../GridSystem'
import { MovementSystem } from '../MovementSystem'
import { PathfindingSystem } from '../PathfindingSystem'
import { PositionSystem } from '../PositionSystem'
import { UNIT_COUNT, UnitFactorySystem } from '../UnitFactorySystem'
import { UnitRendererSystem } from '../UnitRendererSystem'
import { WanderingSystem } from '../WanderingSystem'
import { createWorld } from '../World'

vi.mock('phaser', () => {
  class EventEmitter {
    on = vi.fn().mockReturnThis()
    off = vi.fn().mockReturnThis()
    emit = vi.fn()
  }
  return { Events: { EventEmitter } }
})

function makeFakeScene() {
  const image = { setPosition: vi.fn().mockReturnThis(), destroy: vi.fn() }
  const gfx = {
    fillStyle: vi.fn().mockReturnThis(),
    fillRect: vi.fn().mockReturnThis(),
    generateTexture: vi.fn(),
    destroy: vi.fn(),
  }
  return {
    add: {
      graphics: vi.fn(() => gfx),
      image: vi.fn(() => ({ ...image })),
    },
  } as unknown as Parameters<typeof createWorld>[0]
}

function makeWorld(): {
  world: ReturnType<typeof createWorld>
  worldEid: number
} {
  const world = createWorld(makeFakeScene())
  world.installSystem(new GridSystem())
  world.installSystem(new PositionSystem())
  world.installSystem(new MovementSystem())
  world.installSystem(new PathfindingSystem())
  world.installSystem(new UnitRendererSystem())
  world.installSystem(new WanderingSystem())
  world.installSystem(new UnitFactorySystem())
  const worldEid = world.addEntity()
  world.addComponent(GridSystem, worldEid)
  return { world, worldEid }
}

afterEach(() => {
  // storage is per-world; no global cleanup needed
})

describe('unitFactorySystem', () => {
  it('creates exactly 200 unit entities', () => {
    const { world, worldEid } = makeWorld()
    world.addComponent(UnitFactorySystem, worldEid)
    expect(UNIT_COUNT).toBe(200)
    const entities = Array.from(world.query([PositionSystem, MovementSystem]))
    expect(entities.length).toBe(200)
  })

  it('query(world, [PositionSystem, MovementSystem]) returns 200 entities', () => {
    const { world, worldEid } = makeWorld()
    world.addComponent(UnitFactorySystem, worldEid)
    const entities = Array.from(world.query([PositionSystem, MovementSystem]))
    expect(entities.length).toBe(200)
  })

  it('all units spawn on passable tiles', () => {
    const { world, worldEid } = makeWorld()
    world.addComponent(UnitFactorySystem, worldEid)
    const entities = Array.from(world.query([PositionSystem, MovementSystem]))
    const gridData = world.getComponent(GridSystem, worldEid)
    const posStorage = world.getComponentStorage(PositionSystem)
    for (const eid of entities) {
      expect(isPassable(gridData, posStorage.col[eid]!, posStorage.row[eid]!)).toBe(true)
    }
  })

  it('unit pixel positions are at tile centres', () => {
    const { world, worldEid } = makeWorld()
    world.addComponent(UnitFactorySystem, worldEid)
    const entities = Array.from(world.query([PositionSystem, MovementSystem]))
    const posStorage = world.getComponentStorage(PositionSystem)
    for (const eid of entities) {
      expect(posStorage.pixelX[eid]).toBe(posStorage.col[eid]! * TILE_SIZE + TILE_SIZE / 2)
      expect(posStorage.pixelY[eid]).toBe(posStorage.row[eid]! * TILE_SIZE + TILE_SIZE / 2)
    }
  })

  it('all units have WanderingSystem component attached', () => {
    const { world, worldEid } = makeWorld()
    world.addComponent(UnitFactorySystem, worldEid)
    const entities = Array.from(world.query([PositionSystem, MovementSystem]))
    const wanderers = Array.from(world.query([WanderingSystem]))
    expect(wanderers.length).toBe(entities.length)
  })
})
