import type { World } from 'bitecs'
import type { GameObjects } from 'phaser'
import type { GameWorld } from './types'
import { query } from 'bitecs'
import { TILE_SIZE } from './GridSystem'
import { Position } from './PositionSystem'

// --- Constants ---

const UNIT_SIZE = TILE_SIZE - 6

// --- Component ---

export interface UnitSpriteData {
  sprite: GameObjects.Image
}

export const UnitSprite: UnitSpriteData[] = []

// --- Internal state ---

let initialized = false
let unitEids: number[] = []

// --- System functions ---

export function update(world: World<GameWorld>): void {
  if (!initialized) {
    // Generate the shared 'unit' texture from a temporary Graphics object
    const gfx = world.scene.add.graphics()
    gfx.fillStyle(0xFFD700, 1)
    gfx.fillRect(0, 0, UNIT_SIZE, UNIT_SIZE)
    gfx.generateTexture('unit', UNIT_SIZE, UNIT_SIZE)
    gfx.destroy()

    // Create one Image per unit entity
    unitEids = Array.from(query(world, [Position]))
    for (const eid of unitEids) {
      const sprite = world.scene.add.image(
        Position.pixelX[eid]!,
        Position.pixelY[eid]!,
        'unit',
      )
      UnitSprite[eid] = { sprite }
    }

    initialized = true
  }
  else {
    // Reposition all unit sprites to match current Position data
    for (const eid of unitEids) {
      UnitSprite[eid]?.sprite.setPosition(
        Position.pixelX[eid]!,
        Position.pixelY[eid]!,
      )
    }
  }
}

export function destroySystems(_world: World<GameWorld>): void {
  for (const eid of unitEids) {
    UnitSprite[eid]?.sprite.destroy()
  }
  UnitSprite.length = 0
  unitEids = []
  initialized = false
}

// Expose for testing
export function _reset(): void {
  UnitSprite.length = 0
  unitEids = []
  initialized = false
}
