import type { TileCoord } from './pathfinder'

export interface Unit {
  readonly id: string
  controller: 'p1' | 'p2' | null
  idleMs: number
  col: number
  row: number
  pixelX: number
  pixelY: number
  readonly speed: number // tiles per second
  path: TileCoord[]
}
