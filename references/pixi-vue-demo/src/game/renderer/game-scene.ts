import type { Application, Ticker } from 'pixi.js'

import type { World } from '../simulation/world'
import { Grid } from '../simulation/grid'
import { CameraController } from './camera-controller'
import { GridRenderer } from './grid-renderer'
import { UnitRenderer } from './unit-renderer'

export class GameScene {
  private readonly app: Application
  private readonly world: World
  private gridRenderer: GridRenderer | null = null
  private unitRenderer: UnitRenderer | null = null
  private cameraController: CameraController | null = null
  private readonly onTickBound: (ticker: Ticker) => void
  private readonly onClickBound: (event: MouseEvent) => void

  constructor(app: Application, world: World) {
    this.app = app
    this.world = world
    this.onTickBound = this.onTick.bind(this)
    this.onClickBound = this.onClick.bind(this)
  }

  start(): void {
    this.gridRenderer = new GridRenderer(this.world.getGrid())
    this.app.stage.addChild(this.gridRenderer)

    this.unitRenderer = new UnitRenderer(this.world)
    this.app.stage.addChild(this.unitRenderer)

    this.cameraController = new CameraController(this.app, this.world)
    this.cameraController.centerOnPlayer()
    this.cameraController.attachEvents()

    this.app.ticker.add(this.onTickBound)
    this.app.canvas.addEventListener('click', this.onClickBound)
  }

  stop(): void {
    this.app.canvas.removeEventListener('click', this.onClickBound)
    this.app.ticker.remove(this.onTickBound)

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

  private onTick(ticker: Ticker): void {
    this.world.tick(ticker.deltaMS)
    this.unitRenderer?.update()
    this.cameraController?.followPlayer(ticker.deltaMS)
  }

  private onClick(event: MouseEvent): void {
    const stage = this.app.stage
    const ts = Grid.TILE_SIZE
    const worldX = (event.offsetX - stage.x) / stage.scale.x
    const worldY = (event.offsetY - stage.y) / stage.scale.y
    const col = Math.floor(worldX / ts)
    const row = Math.floor(worldY / ts)
    this.world.moveUnit(this.world.playerUnitId, col, row)
  }
}
