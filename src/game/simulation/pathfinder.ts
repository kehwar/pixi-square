export interface TileCoord {
  readonly col: number
  readonly row: number
}

interface Passable {
  isPassable: (col: number, row: number) => boolean
}

const SQRT2 = Math.SQRT2

const DIRS: ReadonlyArray<{ readonly dc: number, readonly dr: number, readonly cost: number }> = [
  { dc: 0, dr: -1, cost: 1 }, // N
  { dc: 1, dr: -1, cost: SQRT2 }, // NE
  { dc: 1, dr: 0, cost: 1 }, // E
  { dc: 1, dr: 1, cost: SQRT2 }, // SE
  { dc: 0, dr: 1, cost: 1 }, // S
  { dc: -1, dr: 1, cost: SQRT2 }, // SW
  { dc: -1, dr: 0, cost: 1 }, // W
  { dc: -1, dr: -1, cost: SQRT2 }, // NW
]

/** Octile distance heuristic for 8-directional A*. */
function octile(c1: number, r1: number, c2: number, r2: number): number {
  const dx = Math.abs(c2 - c1)
  const dy = Math.abs(r2 - r1)
  return Math.min(dx, dy) * SQRT2 + Math.abs(dx - dy)
}

/** Compact integer key: row * STRIDE + col. STRIDE must be > max col value. */
const STRIDE = 1024

function tileKey(col: number, row: number): number {
  return row * STRIDE + col
}

class MinHeap {
  private readonly items: Array<{ priority: number, key: number }> = []

  get size(): number {
    return this.items.length
  }

  push(priority: number, key: number): void {
    this.items.push({ priority, key })
    this.bubbleUp(this.items.length - 1)
  }

  pop(): number | undefined {
    if (this.items.length === 0)
      return undefined
    const top = this.items[0]!
    const last = this.items.pop()!
    if (this.items.length > 0) {
      this.items[0] = last
      this.sinkDown(0)
    }
    return top.key
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.items[parent]!.priority <= this.items[i]!.priority)
        break
      const tmp = this.items[parent]!
      this.items[parent] = this.items[i]!
      this.items[i] = tmp
      i = parent
    }
  }

  private sinkDown(i: number): void {
    const n = this.items.length
    for (;;) {
      let smallest = i
      const l = 2 * i + 1
      const r = 2 * i + 2
      if (l < n && this.items[l]!.priority < this.items[smallest]!.priority)
        smallest = l
      if (r < n && this.items[r]!.priority < this.items[smallest]!.priority)
        smallest = r
      if (smallest === i)
        break
      const tmp = this.items[smallest]!
      this.items[smallest] = this.items[i]!
      this.items[i] = tmp
      i = smallest
    }
  }
}

/**
 * A* pathfinder with 8-directional movement.
 *
 * Returns an ordered list of tile coordinates from source (exclusive) to
 * destination (inclusive), or null if the destination is impassable or
 * unreachable. Returns an empty array when source equals destination.
 */
export function findPath(
  grid: Passable,
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): TileCoord[] | null {
  if (!grid.isPassable(toCol, toRow))
    return null
  if (fromCol === toCol && fromRow === toRow)
    return []

  const startKey = tileKey(fromCol, fromRow)
  const endKey = tileKey(toCol, toRow)

  const gScore = new Map<number, number>([[startKey, 0]])
  const cameFrom = new Map<number, number>()
  const open = new MinHeap()
  open.push(octile(fromCol, fromRow, toCol, toRow), startKey)

  while (open.size > 0) {
    const currentKey = open.pop()!
    const currentCol = currentKey % STRIDE
    const currentRow = Math.floor(currentKey / STRIDE)

    if (currentKey === endKey) {
      // Reconstruct path (excludes source, includes destination)
      const path: TileCoord[] = []
      let k = currentKey
      while (k !== startKey) {
        path.push({ col: k % STRIDE, row: Math.floor(k / STRIDE) })
        k = cameFrom.get(k)!
      }
      path.reverse()
      return path
    }

    const currentG = gScore.get(currentKey)!

    for (const dir of DIRS) {
      const nc = currentCol + dir.dc
      const nr = currentRow + dir.dr
      if (!grid.isPassable(nc, nr))
        continue
      // Block diagonal moves that would clip through an obstacle corner
      if (dir.dc !== 0 && dir.dr !== 0) {
        if (!grid.isPassable(currentCol + dir.dc, currentRow) || !grid.isPassable(currentCol, currentRow + dir.dr))
          continue
      }

      const neighborKey = tileKey(nc, nr)
      const tentativeG = currentG + dir.cost

      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        gScore.set(neighborKey, tentativeG)
        cameFrom.set(neighborKey, currentKey)
        open.push(tentativeG + octile(nc, nr, toCol, toRow), neighborKey)
      }
    }
  }

  return null // destination unreachable
}
