import type { GameWorld } from './types'
import { addComponent, addEntity } from 'bitecs'
import { ComponentSystem } from './ComponentSystem'
import { Grid, randomPassableTile } from './GridSystem'
import { addMovementComponent } from './MovementSystem'
import { PathfindingSystem } from './PathfindingSystem'
import { addPositionComponent } from './PositionSystem'
import { WanderingSystem } from './WanderingSystem'

// --- Constants ---

export const UNIT_COUNT = 200

// --- System class ---

export class UnitFactorySystem extends ComponentSystem<object> {
  override create(world: GameWorld, eid: number): void {
    const gridData = Grid[eid]!
    for (let i = 0; i < UNIT_COUNT; i++) {
      const unitEid = addEntity(world)
      const { col, row } = randomPassableTile(gridData)
      addPositionComponent(world, unitEid, col, row)
      addMovementComponent(world, unitEid)
      addComponent(world, unitEid, PathfindingSystem)
      addComponent(world, unitEid, WanderingSystem)
      // WanderingSystem.create fires automatically via observe, requesting initial path
    }
  }
}
