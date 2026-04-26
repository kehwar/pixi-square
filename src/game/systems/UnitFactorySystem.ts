import type { GameWorld } from './World'
import { ComponentSystem } from './ComponentSystem'
import { GridSystem, randomPassableTile } from './GridSystem'
import { MovementSystem } from './MovementSystem'
import { PathfindingSystem } from './PathfindingSystem'
import { PositionSystem } from './PositionSystem'
import { UnitRendererSystem } from './UnitRendererSystem'
import { WanderingSystem } from './WanderingSystem'

// --- Constants ---

export const UNIT_COUNT = 200

// --- System class ---

export class UnitFactorySystem extends ComponentSystem<object> {
  override create(world: GameWorld, eid: number): void {
    const gridData = world.getComponent(GridSystem, eid)
    for (let i = 0; i < UNIT_COUNT; i++) {
      const unitEid = world.addEntity()
      const { col, row } = randomPassableTile(gridData)
      world.addComponent(PositionSystem, unitEid, (w, sys, e) => sys.setPosition(w, e, col, row))
      world.addComponent(MovementSystem, unitEid)
      world.addComponent(PathfindingSystem, unitEid)
      world.addComponent(UnitRendererSystem, unitEid)
      world.addComponent(WanderingSystem, unitEid)
    }
  }
}
