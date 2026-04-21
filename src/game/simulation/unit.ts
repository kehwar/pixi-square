export type UnitType = 'player' | 'ai'

export interface Unit {
  readonly id: string
  readonly type: UnitType
  col: number
  row: number
  pixelX: number
  pixelY: number
  readonly speed: number // tiles per second
}
