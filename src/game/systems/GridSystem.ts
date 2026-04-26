import type { World } from 'bitecs'
import type { GameWorld } from './types'
import { addComponent } from 'bitecs'

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

// --- Component ---

export interface GridData {
  tiles: Tile[][]
}

export const Grid: GridData[] = []

// --- System functions ---

export function create(world: World<GameWorld>, worldEid: number): void {
  addComponent(world, worldEid, Grid)
  const rows: Tile[][] = []
  for (let row = 0; row < ROWS; row++) {
    const cols: Tile[] = []
    for (let col = 0; col < COLS; col++) {
      const isObstacle = Math.random() < OBSTACLE_DENSITY
      cols.push({ type: isObstacle ? 'obstacle' : 'passable' })
    }
    rows.push(cols)
  }
  Grid[worldEid] = { tiles: rows }
}

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
