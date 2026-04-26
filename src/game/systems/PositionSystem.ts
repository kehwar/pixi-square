import type { GameWorld } from './World'
import { ComponentSystem } from './ComponentSystem'
import { TILE_SIZE } from './GridSystem'

// --- Types ---

export interface PositionData {
  col: number
  row: number
  pixelX: number
  pixelY: number
}

// --- SoA storage type ---

export interface PositionStorage {
  col: number[]
  row: number[]
  pixelX: number[]
  pixelY: number[]
}

// --- System class ---

export class PositionSystem extends ComponentSystem<PositionData, PositionStorage> {
  override install(world: GameWorld): void {
    const storage: PositionStorage = { col: [], row: [], pixelX: [], pixelY: [] }
    world.setupComponentStorage(PositionSystem, storage)
  }

  override create(world: GameWorld, eid: number): void {
    const s = this.getComponentStorage(world)
    s.col[eid] = 0
    s.row[eid] = 0
    s.pixelX[eid] = 0
    s.pixelY[eid] = 0
  }

  override getComponent(world: GameWorld, eid: number): PositionData {
    const s = this.getComponentStorage(world)
    return {
      col: s.col[eid]!,
      row: s.row[eid]!,
      pixelX: s.pixelX[eid]!,
      pixelY: s.pixelY[eid]!,
    }
  }

  setPosition(world: GameWorld, eid: number, col: number, row: number): void {
    const s = this.getComponentStorage(world)
    s.col[eid] = col
    s.row[eid] = row
    s.pixelX[eid] = col * TILE_SIZE + TILE_SIZE / 2
    s.pixelY[eid] = row * TILE_SIZE + TILE_SIZE / 2
  }

  setPixelPosition(world: GameWorld, eid: number, pixelX: number, pixelY: number): void {
    const s = this.getComponentStorage(world)
    s.pixelX[eid] = pixelX
    s.pixelY[eid] = pixelY
  }
}
