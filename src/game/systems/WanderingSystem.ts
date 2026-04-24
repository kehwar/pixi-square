import type { World } from 'bitecs'
import type { GameWorld } from './types'
import { addComponent } from 'bitecs'
import { randomPassableTile } from './GridSystem'
import { requestPath } from './PathfindingSystem'

// --- Component ---

export const Wandering: object = {}

// --- System functions ---

export function create(world: World<GameWorld>, worldEid: number): void {
  world.events.on('movement:path-empty', (eid: number) => {
    const { col, row } = randomPassableTile(worldEid)
    requestPath(world, eid, col, row)
  })
}

// Exposed for testing — suppress unused-component warning
export function _addWanderingComponent(world: World<GameWorld>, eid: number): void {
  addComponent(world, eid, Wandering)
}
