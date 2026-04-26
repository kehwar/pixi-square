import type { World } from 'bitecs'
import type { TileCoord } from './GridSystem'
import type { GameWorld } from './types'
import { addComponent, query } from 'bitecs'
import { TILE_SIZE } from './GridSystem'
import { Position } from './PositionSystem'

// --- Constants ---

export const DEFAULT_SPEED = 6 // tiles per second

// --- Component ---

export const Movement = {
  speed: [] as number[],
  path: [] as TileCoord[][],
}

// --- System functions ---

export function addMovementComponent(
  world: World<GameWorld>,
  eid: number,
  speed: number = DEFAULT_SPEED,
): void {
  addComponent(world, eid, Movement)
  Movement.speed[eid] = speed
  Movement.path[eid] = []
}

export function update(world: World<GameWorld>, delta: number): void {
  const eids = query(world, [Position, Movement])
  for (const eid of eids) {
    const path = Movement.path[eid]
    if (!path || path.length === 0)
      continue

    const next = path[0]!
    const targetX = next.col * TILE_SIZE + TILE_SIZE / 2
    const targetY = next.row * TILE_SIZE + TILE_SIZE / 2

    const dx = targetX - Position.pixelX[eid]!
    const dy = targetY - Position.pixelY[eid]!
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = Movement.speed[eid]! * TILE_SIZE * (delta / 1000)

    if (step >= dist) {
      // Arrived at or overshot waypoint — snap to tile centre
      Position.pixelX[eid] = targetX
      Position.pixelY[eid] = targetY
      Position.col[eid] = next.col
      Position.row[eid] = next.row
      path.shift()
      if (path.length === 0) {
        world.events.emit('movement:path-empty', eid)
      }
    }
    else {
      // Advance toward target
      Position.pixelX[eid] = Position.pixelX[eid]! + dx * (step / dist)
      Position.pixelY[eid] = Position.pixelY[eid]! + dy * (step / dist)
    }
  }
}
