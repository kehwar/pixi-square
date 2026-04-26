import type { GameWorld } from './World'
import { ComponentSystem } from './ComponentSystem'

// --- Constants ---

export const COLS = 200
export const ROWS = 200
export const TILE_SIZE = 32
export const OBSTACLE_DENSITY = 0.1

// --- Types ---

export type TileType = 'passable' | 'obstacle'

export interface Tile {
  type: TileType
}

export interface TileCoord {
  col: number
  row: number
}

// --- Data type ---

export interface GridData {
  tiles: Tile[][]
}

// --- System class ---

export class GridSystem extends ComponentSystem<GridData> {
  override install(world: GameWorld): void {
    const grid: GridData[] = []
    world.setupComponentStorage(GridSystem, grid)
  }

  override create(world: GameWorld, eid: number): void {
    const rows: Tile[][] = []
    for (let row = 0; row < ROWS; row++) {
      const cols: Tile[] = []
      for (let col = 0; col < COLS; col++) {
        const isObstacle = Math.random() < OBSTACLE_DENSITY
        cols.push({ type: isObstacle ? 'obstacle' : 'passable' })
      }
      rows.push(cols)
    }
    this.setComponent(world, eid, { tiles: rows })
  }
}

// --- Pure utility functions ---

export function isPassable(gridData: GridData, col: number, row: number): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) {
    return false
  }
  return gridData.tiles[row]![col]!.type === 'passable'
}

export function randomPassableTile(gridData: GridData): TileCoord {
  let col: number
  let row: number
  do {
    col = Math.floor(Math.random() * COLS)
    row = Math.floor(Math.random() * ROWS)
  } while (!isPassable(gridData, col, row))
  return { col, row }
}
