import type { Application } from 'pixi.js'

import type { World } from '../simulation/world'
import { CameraController } from './camera-controller'
import { GridRenderer } from './grid-renderer'
import { UnitRenderer } from './unit-renderer'

export class GameScene {
  private readonly app: Application
  private readonly world: World
  private gridRenderer: GridRenderer | null = null
  private unitRenderer: UnitRenderer | null = null
  private cameraController: CameraController | null = null

  constructor(app: Application, world: World) {
    this.app = app
    this.world = world
  }

  start(): void {
    this.gridRenderer = new GridRenderer(this.world.getGrid())
    this.app.stage.addChild(this.gridRenderer)

    this.unitRenderer = new UnitRenderer(this.world)
    this.app.stage.addChild(this.unitRenderer)

    this.cameraController = new CameraController(this.app, this.world)
    this.cameraController.centerOnPlayer()
    this.cameraController.attachEvents()
  }

  stop(): void {
    this.cameraController?.detachEvents()
    this.cameraController = null

    if (this.unitRenderer !== null) {
      this.app.stage.removeChild(this.unitRenderer)
      this.unitRenderer.destroy({ children: true })
      this.unitRenderer = null
    }

    if (this.gridRenderer !== null) {
      this.app.stage.removeChild(this.gridRenderer)
      this.gridRenderer.destroy({ children: true })
      this.gridRenderer = null
    }
  }
}
