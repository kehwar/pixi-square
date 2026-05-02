import type { GameWorld } from './World'
import { requestPath } from '../utils/pathfinding'
import { ComponentSystem } from './ComponentSystem'
import { GridSystem, randomPassableTile } from './GridSystem'
import { MovementSystem } from './MovementSystem'
import { PositionSystem } from './PositionSystem'

// --- System class ---

export class WanderingSystem extends ComponentSystem<object> {
  private _onPathEmpty: ((eid: number) => void) | null = null

  override install(world: GameWorld): void {
    this._onPathEmpty = (eid: number) => {
      const [gridEid] = world.query([GridSystem])
      if (gridEid === undefined)
        return
      const gridData = world.getComponent(GridSystem, gridEid)
      const movStorage = world.getComponentStorage(MovementSystem)
      const posStorage = world.getComponentStorage(PositionSystem)
      const { col, row } = randomPassableTile(gridData)
      requestPath(gridData, movStorage, posStorage, eid, col, row)
    }
    world.events.on('movement:path-empty', this._onPathEmpty)
  }

  override uninstall(world: GameWorld): void {
    if (this._onPathEmpty) {
      world.events.off('movement:path-empty', this._onPathEmpty)
      this._onPathEmpty = null
    }
  }

  override create(world: GameWorld, eid: number): void {
    const movStorage = world.getComponentStorage(MovementSystem)
    if (movStorage?.path?.[eid]?.length)
      return // unit already has an active path — let it finish before wandering takes over
    const [gridEid] = world.query([GridSystem])
    if (gridEid === undefined)
      return
    const gridData = world.getComponent(GridSystem, gridEid)
    const posStorage = world.getComponentStorage(PositionSystem)
    const { col, row } = randomPassableTile(gridData)
    requestPath(gridData, movStorage, posStorage, eid, col, row)
  }
}

// Legacy alias for call sites that use `Wandering` as the component token
export const Wandering = WanderingSystem
