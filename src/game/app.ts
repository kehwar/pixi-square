import { Application } from 'pixi.js'

import { GameScene } from './renderer/game-scene'

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

  gameScene = new GameScene(app)
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
