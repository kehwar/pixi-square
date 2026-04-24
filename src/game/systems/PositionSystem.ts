import type { World } from 'bitecs'
import type { GameWorld } from './types'
import { addComponent } from 'bitecs'
import { TILE_SIZE } from './GridSystem'

// --- Component ---

export const Position = {
  col: [] as number[],
  row: [] as number[],
  pixelX: [] as number[],
  pixelY: [] as number[],
}

// --- System functions ---

export function addPositionComponent(
  world: World<GameWorld>,
  eid: number,
  col: number,
  row: number,
): void {
  addComponent(world, eid, Position)
  Position.col[eid] = col
  Position.row[eid] = row
  Position.pixelX[eid] = col * TILE_SIZE + TILE_SIZE / 2
  Position.pixelY[eid] = row * TILE_SIZE + TILE_SIZE / 2
}
