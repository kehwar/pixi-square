import type { World } from 'bitecs'
import type { GameWorld } from './types'
import { addComponent, addEntity } from 'bitecs'
import { requestPath } from '../utils/pathfinding'
import { Grid, randomPassableTile } from './GridSystem'
import { addMovementComponent, Movement } from './MovementSystem'
import { Pathfinding } from './PathfindingSystem'
import { addPositionComponent, Position } from './PositionSystem'
import { Wandering } from './WanderingSystem'

// --- Constants ---

export const UNIT_COUNT = 200

// --- System functions ---

export function create(world: World<GameWorld>, worldEid: number): void {
  const gridData = Grid[worldEid]!
  for (let i = 0; i < UNIT_COUNT; i++) {
    const eid = addEntity(world)
    const { col, row } = randomPassableTile(gridData)
    addPositionComponent(world, eid, col, row)
    addMovementComponent(world, eid)
    addComponent(world, eid, Pathfinding)
    addComponent(world, eid, Wandering)
    const { col: destCol, row: destRow } = randomPassableTile(gridData)
    requestPath(gridData, Movement, Position, eid, destCol, destRow)
  }
}
