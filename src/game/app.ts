import { Application } from 'pixi.js'

import { GameScene } from './renderer/game-scene'
import { WorldFactory } from './simulation/world'

let app: Application | null = null
let gameScene: GameScene | null = null

export async function initApp(container: HTMLElement): Promise<void> {
  if (app !== null) {
    return
  }

  app = new Application()
  await app.init({
    resizeTo: container,
    autoDensity: true,
    antialias: false,
    preference: 'webgl',
  })

  container.appendChild(app.canvas)

  const world = WorldFactory.create()
  gameScene = new GameScene(app, world)
  gameScene.start()
}

export function destroyApp(): void {
  if (app === null) {
    return
  }

  gameScene?.stop()
  gameScene = null

  app.destroy(
    { removeView: true, releaseGlobalResources: true },
    { children: true },
  )
  app = null
}
