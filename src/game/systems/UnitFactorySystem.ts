import type { World } from 'bitecs'
import type { GameWorld } from './types'
import { addEntity } from 'bitecs'
import { randomPassableTile } from './GridSystem'
import { addPositionComponent } from './PositionSystem'

// --- Constants ---

export const UNIT_COUNT = 200

// --- System functions ---

export function create(world: World<GameWorld>, worldEid: number): void {
  for (let i = 0; i < UNIT_COUNT; i++) {
    const eid = addEntity(world)
    const { col, row } = randomPassableTile(worldEid)
    addPositionComponent(world, eid, col, row)
  }
}
