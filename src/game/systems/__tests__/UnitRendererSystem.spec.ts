import type { GameWorld } from '../types'
import { addComponent, addEntity, createWorld } from 'bitecs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Position } from '../PositionSystem'
import { TILE_SIZE } from '../GridSystem'
import * as UnitRendererSystem from '../UnitRendererSystem'

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

function makeWorld(entityCount = 3): {
  world: ReturnType<typeof createWorld<GameWorld>>
  eids: number[]
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
  } as unknown as GameWorld['scene']

  const world = createWorld<GameWorld>({ scene: mockScene } as GameWorld)

  const eids: number[] = []
  for (let i = 0; i < entityCount; i++) {
    const eid = addEntity(world)
    addComponent(world, eid, Position)
    Position.col[eid] = i + 1
    Position.row[eid] = i + 1
    Position.pixelX[eid] = (i + 1) * TILE_SIZE + TILE_SIZE / 2
    Position.pixelY[eid] = (i + 1) * TILE_SIZE + TILE_SIZE / 2
    eids.push(eid)
  }

  return { world, eids, addImageMock, addGraphicsMock, gfxInstance }
}

describe('unitRendererSystem', () => {
  beforeEach(() => {
    UnitRendererSystem._reset()
  })

  describe('first call to update()', () => {
    it('calls add.graphics() once to build the shared texture', () => {
      const { world, addGraphicsMock } = makeWorld()
      UnitRendererSystem.update(world)
      expect(addGraphicsMock).toHaveBeenCalledOnce()
    })

    it('calls generateTexture("unit", ...) on the temporary graphics', () => {
      const { world, gfxInstance } = makeWorld()
      UnitRendererSystem.update(world)
      expect(gfxInstance.generateTexture).toHaveBeenCalledOnce()
      expect(gfxInstance.generateTexture).toHaveBeenCalledWith('unit', expect.any(Number), expect.any(Number))
    })

    it('destroys the temporary graphics after generating the texture', () => {
      const { world, gfxInstance } = makeWorld()
      UnitRendererSystem.update(world)
      expect(gfxInstance.destroy).toHaveBeenCalledOnce()
    })

    it('calls add.image() once per unit entity', () => {
      const entityCount = 4
      const { world, addImageMock } = makeWorld(entityCount)
      UnitRendererSystem.update(world)
      expect(addImageMock).toHaveBeenCalledTimes(entityCount)
    })

    it('creates each image at the correct pixel coordinates', () => {
      const { world, eids, addImageMock } = makeWorld()
      UnitRendererSystem.update(world)

      for (let i = 0; i < eids.length; i++) {
        const eid = eids[i]!
        const call = addImageMock.mock.calls[i]!
        expect(call[0]).toBe(Position.pixelX[eid])
        expect(call[1]).toBe(Position.pixelY[eid])
        expect(call[2]).toBe('unit')
      }
    })

    it('does not call add.graphics() again on the second call', () => {
      const { world, addGraphicsMock } = makeWorld()
      UnitRendererSystem.update(world)
      UnitRendererSystem.update(world)
      expect(addGraphicsMock).toHaveBeenCalledOnce()
    })
  })

  describe('subsequent calls to update()', () => {
    it('calls setPosition() on each sprite with current pixel coordinates', () => {
      const { world, eids } = makeWorld()

      // First call: initialize sprites
      UnitRendererSystem.update(world)

      // Move each unit to a new position
      for (const eid of eids) {
        Position.pixelX[eid] = Position.pixelX[eid]! + 10
        Position.pixelY[eid] = Position.pixelY[eid]! + 20
      }

      // Second call: should reposition
      UnitRendererSystem.update(world)

      for (const eid of eids) {
        const { sprite } = UnitRendererSystem.UnitSprite[eid]!
        expect(sprite.setPosition).toHaveBeenLastCalledWith(
          Position.pixelX[eid],
          Position.pixelY[eid],
        )
      }
    })

    it('calls setPosition() on every unit entity each subsequent call', () => {
      const entityCount = 5
      const { world, eids } = makeWorld(entityCount)

      UnitRendererSystem.update(world)
      UnitRendererSystem.update(world)

      for (const eid of eids) {
        const { sprite } = UnitRendererSystem.UnitSprite[eid]!
        expect(sprite.setPosition).toHaveBeenCalledOnce()
      }
    })
  })

  describe('destroySystems()', () => {
    it('calls sprite.destroy() for each unit entity', () => {
      const entityCount = 4
      const { world, eids } = makeWorld(entityCount)

      UnitRendererSystem.update(world)

      const sprites = eids.map(eid => UnitRendererSystem.UnitSprite[eid]!.sprite)

      UnitRendererSystem.destroySystems(world)

      for (const sprite of sprites) {
        expect(sprite.destroy).toHaveBeenCalledOnce()
      }
    })

    it('clears the UnitSprite store after destroying', () => {
      const { world } = makeWorld()
      UnitRendererSystem.update(world)
      UnitRendererSystem.destroySystems(world)
      expect(UnitRendererSystem.UnitSprite.length).toBe(0)
    })

    it('is safe to call without a prior update()', () => {
      const { world } = makeWorld()
      expect(() => UnitRendererSystem.destroySystems(world)).not.toThrow()
    })
  })
})
