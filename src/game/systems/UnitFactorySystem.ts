import type { World } from 'bitecs'
import type { GameWorld } from './types'
import { addComponent, addEntity } from 'bitecs'
import { randomPassableTile } from './GridSystem'
import { addMovementComponent } from './MovementSystem'
import { Pathfinding, requestPath } from './PathfindingSystem'
import { addPositionComponent } from './PositionSystem'
import { Wandering } from './WanderingSystem'

// --- Constants ---

export const UNIT_COUNT = 200

// --- System functions ---

export function create(world: World<GameWorld>, worldEid: number): void {
  for (let i = 0; i < UNIT_COUNT; i++) {
    const eid = addEntity(world)
    const { col, row } = randomPassableTile(worldEid)
    addPositionComponent(world, eid, col, row)
    addMovementComponent(world, eid)
    addComponent(world, eid, Pathfinding)
    addComponent(world, eid, Wandering)
    const { col: destCol, row: destRow } = randomPassableTile(worldEid)
    requestPath(world, eid, destCol, destRow)
  }
}
