import { addComponent, addEntity } from 'bitecs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TILE_SIZE } from '../GridSystem'
import { addPositionComponent, Position, PositionSystem } from '../PositionSystem'
import { createWorld } from '../types'
import { UnitRendererSystem, UnitSprite } from '../UnitRendererSystem'

// Mock Phaser before importing modules that depend on it
vi.mock('phaser', () => {
  class EventEmitter {}

  class Graphics {
    fillStyle = vi.fn().mockReturnThis()
    fillRect = vi.fn().mockReturnThis()
    generateTexture = vi.fn()
    destroy = vi.fn()
  }

  class Image {
    setPosition = vi.fn().mockReturnThis()
    destroy = vi.fn()
  }

  class Scene {
    add = {
      graphics: vi.fn(() => new Graphics()),
      image: vi.fn(() => new Image()),
    }
  }

  return { Scene, Events: { EventEmitter } }
})

afterEach(() => {
  UnitSprite.length = 0
})

function makeWorld(entityCount = 3): {
  world: ReturnType<typeof createWorld>
  eids: number[]
  system: UnitRendererSystem
  addImageMock: ReturnType<typeof vi.fn>
  addGraphicsMock: ReturnType<typeof vi.fn>
  gfxInstance: { fillStyle: ReturnType<typeof vi.fn>, fillRect: ReturnType<typeof vi.fn>, generateTexture: ReturnType<typeof vi.fn>, destroy: ReturnType<typeof vi.fn> }
} {
  const gfxInstance = {
    fillStyle: vi.fn().mockReturnThis(),
    fillRect: vi.fn().mockReturnThis(),
    generateTexture: vi.fn(),
    destroy: vi.fn(),
  }

  const addGraphicsMock = vi.fn(() => gfxInstance)

  const addImageMock = vi.fn(() => ({
    setPosition: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  }))

  const mockScene = {
    add: {
      graphics: addGraphicsMock,
      image: addImageMock,
    },
  } as unknown as Parameters<typeof createWorld>[0]

  const world = createWorld(mockScene)
  world.installSystem(new PositionSystem())
  const system = new UnitRendererSystem()
  world.installSystem(system)

  const eids: number[] = []
  for (let i = 0; i < entityCount; i++) {
    const eid = addEntity(world)
    addPositionComponent(world, eid, i + 1, i + 1)
    eids.push(eid)
  }

  return { world, eids, system, addImageMock, addGraphicsMock, gfxInstance }
}

describe('unitRendererSystem.install', () => {
  it('calls add.graphics() once to build the shared texture', () => {
    const { addGraphicsMock } = makeWorld()
    expect(addGraphicsMock).toHaveBeenCalledOnce()
  })

  it('calls generateTexture("unit", ...) on the temporary graphics', () => {
    const { gfxInstance } = makeWorld()
    expect(gfxInstance.generateTexture).toHaveBeenCalledOnce()
    expect(gfxInstance.generateTexture).toHaveBeenCalledWith('unit', expect.any(Number), expect.any(Number))
  })

  it('destroys the temporary graphics after generating the texture', () => {
    const { gfxInstance } = makeWorld()
    expect(gfxInstance.destroy).toHaveBeenCalledOnce()
  })
})

describe('unitRendererSystem.create', () => {
  it('calls add.image() when an entity gets the component', () => {
    const { world, addImageMock } = makeWorld(0)
    const eid = addEntity(world)
    addPositionComponent(world, eid, 1, 1)
    addComponent(world, eid, UnitRendererSystem)
    expect(addImageMock).toHaveBeenCalledOnce()
  })

  it('calls add.image() once per unit entity', () => {
    const entityCount = 4
    const { world, addImageMock } = makeWorld(0)
    for (let i = 0; i < entityCount; i++) {
      const eid = addEntity(world)
      addPositionComponent(world, eid, i + 1, i + 1)
      addComponent(world, eid, UnitRendererSystem)
    }
    expect(addImageMock).toHaveBeenCalledTimes(entityCount)
  })

  it('creates each image at the correct pixel coordinates', () => {
    const { world, addImageMock } = makeWorld(0)
    const eids: number[] = []
    for (let i = 0; i < 3; i++) {
      const eid = addEntity(world)
      addPositionComponent(world, eid, i + 1, i + 1)
      addComponent(world, eid, UnitRendererSystem)
      eids.push(eid)
    }

    for (let i = 0; i < eids.length; i++) {
      const eid = eids[i]!
      const call = addImageMock.mock.calls[i]!
      expect(call[0]).toBe(Position.pixelX[eid])
      expect(call[1]).toBe(Position.pixelY[eid])
      expect(call[2]).toBe('unit')
    }
  })
})

describe('unitRendererSystem.update', () => {
  it('calls setPosition() on the sprite with current pixel coordinates', () => {
    const { world, eids, system } = makeWorld()
    addComponent(world, eids[0]!, UnitRendererSystem)

    // Move entity to a new position
    Position.pixelX[eids[0]!] = 999
    Position.pixelY[eids[0]!] = 888

    system.update(world, eids[0]!, 16)

    const { sprite } = UnitSprite[eids[0]!]!
    expect(sprite.setPosition).toHaveBeenLastCalledWith(999, 888)
  })

  it('repositions sprite to match current pixel coordinates', () => {
    const entityCount = 3
    const { world, eids, system } = makeWorld(entityCount)
    for (const eid of eids) {
      addComponent(world, eid, UnitRendererSystem)
    }

    for (const eid of eids) {
      Position.pixelX[eid] = eid * 10
      Position.pixelY[eid] = eid * 20
    }

    for (const eid of eids) {
      system.update(world, eid, 16)
    }

    for (const eid of eids) {
      const { sprite } = UnitSprite[eid]!
      expect(sprite.setPosition).toHaveBeenLastCalledWith(eid * 10, eid * 20)
    }
  })
})

describe('unitRendererSystem.destroy', () => {
  it('calls sprite.destroy() for the entity', () => {
    const { world, system } = makeWorld(0)
    const eid = addEntity(world)
    addPositionComponent(world, eid, 1, 1)
    addComponent(world, eid, UnitRendererSystem)

    const sprite = UnitSprite[eid]!.sprite
    system.destroy(world, eid)
    expect(sprite.destroy).toHaveBeenCalledOnce()
  })

  it('clears the UnitSprite store entry after destroying', () => {
    const { world, system } = makeWorld(0)
    const eid = addEntity(world)
    addPositionComponent(world, eid, 1, 1)
    addComponent(world, eid, UnitRendererSystem)

    system.destroy(world, eid)
    expect(UnitSprite[eid]).toBeUndefined()
  })

  it('pixel coordinates are correct when image is first created', () => {
    const { world } = makeWorld(0)
    const eid = addEntity(world)
    addPositionComponent(world, eid, 3, 5)
    addComponent(world, eid, UnitRendererSystem)
    const { sprite } = UnitSprite[eid]!
    // sprite was created with correct initial position
    expect(sprite).toBeDefined()
    expect(Position.pixelX[eid]).toBe(3 * TILE_SIZE + TILE_SIZE / 2)
    expect(Position.pixelY[eid]).toBe(5 * TILE_SIZE + TILE_SIZE / 2)
  })
})
