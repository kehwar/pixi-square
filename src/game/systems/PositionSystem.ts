import type { GameWorld } from './types'
import { addComponent } from 'bitecs'
import { ComponentSystem } from './ComponentSystem'
import { TILE_SIZE } from './GridSystem'

// --- Types ---

export interface PositionData {
  col: number
  row: number
  pixelX: number
  pixelY: number
}

// --- SoA storage ---

export const Position = {
  col: [] as number[],
  row: [] as number[],
  pixelX: [] as number[],
  pixelY: [] as number[],
}

// --- System class ---

export class PositionSystem extends ComponentSystem<PositionData, typeof Position> {
  override install(world: GameWorld): void {
    world.setupComponentStorage(PositionSystem, Position)
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
}

// --- Call-site helper ---

export function addPositionComponent(
  world: GameWorld,
  eid: number,
  col: number,
  row: number,
): void {
  addComponent(world, eid, PositionSystem)
  // Override zero-defaults from create:
  Position.col[eid] = col
  Position.row[eid] = row
  Position.pixelX[eid] = col * TILE_SIZE + TILE_SIZE / 2
  Position.pixelY[eid] = row * TILE_SIZE + TILE_SIZE / 2
}
