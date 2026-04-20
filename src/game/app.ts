import { Application, Assets, Sprite } from 'pixi.js'

let app: Application | null = null

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

  const texture = await Assets.load<import('pixi.js').Texture>('/bunny.png')
  const bunny = new Sprite(texture)
  bunny.anchor.set(0.5)
  bunny.position.set(app.screen.width / 2, app.screen.height / 2)
  app.stage.addChild(bunny)

  app.ticker.add((time) => {
    bunny.rotation += 0.1 * time.deltaTime
  })
}

export function destroyApp(): void {
  if (app === null) {
    return
  }

  app.destroy(
    { removeView: true, releaseGlobalResources: true },
    { children: true },
  )
  app = null
}
