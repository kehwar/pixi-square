import type { GameWorld } from './types'
import { query } from 'bitecs'
import { requestPath } from '../utils/pathfinding'
import { ComponentSystem } from './ComponentSystem'
import { Grid, GridSystem, randomPassableTile } from './GridSystem'
import { Movement } from './MovementSystem'
import { Position } from './PositionSystem'

// --- System class ---

export class WanderingSystem extends ComponentSystem<object> {
  private _onPathEmpty: ((eid: number) => void) | null = null

  override install(world: GameWorld): void {
    this._onPathEmpty = (eid: number) => {
      const [gridEid] = query(world, [GridSystem])
      if (gridEid === undefined)
        return
      const gridData = Grid[gridEid]!
      const { col, row } = randomPassableTile(gridData)
      requestPath(gridData, Movement, Position, eid, col, row)
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
    const [gridEid] = query(world, [GridSystem])
    if (gridEid === undefined)
      return
    const gridData = Grid[gridEid]!
    const { col, row } = randomPassableTile(gridData)
    requestPath(gridData, Movement, Position, eid, col, row)
  }
}

// Legacy alias for call sites that use `Wandering` as the component token
export const Wandering = WanderingSystem
