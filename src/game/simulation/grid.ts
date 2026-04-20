export type TileType = 'passable' | 'obstacle'

export interface Tile {
  type: TileType
}

export class Grid {
  static readonly COLS = 200
  static readonly ROWS = 200
  static readonly OBSTACLE_DENSITY = 0.1

  private readonly tiles: readonly (readonly Tile[])[]

  constructor() {
    const rows: Tile[][] = []
    for (let row = 0; row < Grid.ROWS; row++) {
      const cols: Tile[] = []
      for (let col = 0; col < Grid.COLS; col++) {
        const isObstacle = Math.random() < Grid.OBSTACLE_DENSITY
        cols.push({ type: isObstacle ? 'obstacle' : 'passable' })
      }
      rows.push(cols)
    }
    this.tiles = rows
  }

  isPassable(col: number, row: number): boolean {
    if (col < 0 || col >= Grid.COLS || row < 0 || row >= Grid.ROWS) {
      return false
    }
    return (this.tiles[row] as readonly Tile[])[col]!.type === 'passable'
  }

  getTile(col: number, row: number): Tile | null {
    if (col < 0 || col >= Grid.COLS || row < 0 || row >= Grid.ROWS) {
      return null
    }
    return (this.tiles[row] as readonly Tile[])[col] ?? null
  }
}
