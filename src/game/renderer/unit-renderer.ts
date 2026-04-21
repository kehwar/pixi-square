import type { World } from '../simulation/world'

import { Container, Graphics } from 'pixi.js'
import { Grid } from '../simulation/grid'

const COLOR_PLAYER = 0xFFD700 // gold
const COLOR_AI = 0x4169E1 // royal blue
const UNIT_SCALE = 0.6 // fraction of tile size

export class UnitRenderer extends Container {
  private readonly world: World
  private readonly glyphs = new Map<string, Graphics>()

  constructor(world: World) {
    super()
    this.world = world
    this.sync()
  }

  update(): void {
    this.sync()
  }

  private sync(): void {
    const { units } = this.world.getState()
    const ts = Grid.TILE_SIZE
    const size = ts * UNIT_SCALE
    const half = size / 2

    for (const unit of units) {
      let g = this.glyphs.get(unit.id)
      if (!g) {
        g = new Graphics()
        const color = unit.type === 'player' ? COLOR_PLAYER : COLOR_AI
        g.rect(-half, -half, size, size)
        g.fill(color)
        this.glyphs.set(unit.id, g)
        this.addChild(g)
      }
      g.x = unit.pixelX
      g.y = unit.pixelY
    }
  }
}
