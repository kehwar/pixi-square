import type { GameWorld } from './World'
import { ComponentSystem } from './ComponentSystem'
import { TILE_SIZE } from './GridSystem'
import { PositionSystem } from './PositionSystem'

// --- Constants ---

export const DEFAULT_SPEED = 6 // tiles per second

// --- Types ---

export interface MovementData {
  speed: number
  path: { col: number, row: number }[]
}

// --- SoA storage type ---

export interface MovementStorage {
  speed: number[]
  path: { col: number, row: number }[][]
}

// --- System class ---

export class MovementSystem extends ComponentSystem<MovementData, MovementStorage> {
  override install(world: GameWorld): void {
    const storage: MovementStorage = { speed: [], path: [] }
    world.setupComponentStorage(MovementSystem, storage)
  }

  override create(world: GameWorld, eid: number): void {
    const s = this.getComponentStorage(world)
    s.speed[eid] = DEFAULT_SPEED
    s.path[eid] = []
  }

  override getComponent(world: GameWorld, eid: number): MovementData {
    const s = this.getComponentStorage(world)
    return {
      speed: s.speed[eid]!,
      path: s.path[eid]!,
    }
  }

  override update(world: GameWorld, eid: number, delta: number): void {
    const movStorage = this.getComponentStorage(world)
    const posStorage = world.getComponentStorage(PositionSystem)
    const posSystem = world.systems.get(PositionSystem) as PositionSystem

    const path = movStorage.path[eid]
    if (!path || path.length === 0)
      return

    const next = path[0]!
    const targetX = next.col * TILE_SIZE + TILE_SIZE / 2
    const targetY = next.row * TILE_SIZE + TILE_SIZE / 2

    const dx = targetX - posStorage.pixelX[eid]!
    const dy = targetY - posStorage.pixelY[eid]!
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = movStorage.speed[eid]! * TILE_SIZE * (delta / 1000)

    if (step >= dist) {
      // Arrived at or overshot waypoint — snap to tile centre
      posSystem.setPosition(world, eid, next.col, next.row)
      path.shift()
      if (path.length === 0) {
        world.events.emit('movement:path-empty', eid)
      }
    }
    else {
      // Advance toward target
      posSystem.setPixelPosition(
        world,
        eid,
        posStorage.pixelX[eid]! + dx * (step / dist),
        posStorage.pixelY[eid]! + dy * (step / dist),
      )
    }
  }
}
