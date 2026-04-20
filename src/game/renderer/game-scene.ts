import type { Application } from 'pixi.js'

import { Grid } from '../simulation/grid'
import { GridRenderer } from './grid-renderer'

export class GameScene {
  private readonly app: Application
  private gridRenderer: GridRenderer | null = null

  constructor(app: Application) {
    this.app = app
  }

  start(): void {
    const grid = new Grid()
    this.gridRenderer = new GridRenderer(grid)
    this.app.stage.addChild(this.gridRenderer)
  }

  stop(): void {
    if (this.gridRenderer !== null) {
      this.app.stage.removeChild(this.gridRenderer)
      this.gridRenderer.destroy({ children: true })
      this.gridRenderer = null
    }
  }
}
