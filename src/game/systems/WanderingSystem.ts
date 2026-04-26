import type { World } from 'bitecs'
import type { GameWorld } from './types'
import { addComponent } from 'bitecs'
import { requestPath } from '../utils/pathfinding'
import { Grid, randomPassableTile } from './GridSystem'
import { Movement } from './MovementSystem'
import { Position } from './PositionSystem'

// --- Component ---

export const Wandering: object = {}

// --- System functions ---

export function create(world: World<GameWorld>, worldEid: number): void {
  world.events.on('movement:path-empty', (eid: number) => {
    const gridData = Grid[worldEid]!
    const { col, row } = randomPassableTile(gridData)
    requestPath(gridData, Movement, Position, eid, col, row)
  })
}

// Exposed for testing — suppress unused-component warning
export function _addWanderingComponent(world: World<GameWorld>, eid: number): void {
  addComponent(world, eid, Wandering)
}
