import { AUTO, Game, Scale } from 'phaser'

import { Boot } from './scenes/Boot'
import { GameOver } from './scenes/GameOver'
import { GameScene } from './scenes/GameScene'
import { MainMenu } from './scenes/MainMenu'
import { Preloader } from './scenes/Preloader'

export function StartGame(parent: string): Game {
  return new Game({
    type: AUTO,
    parent,
    backgroundColor: '#1a1a2e',
    scale: {
      mode: Scale.RESIZE,
      autoCenter: Scale.CENTER_BOTH,
    },
    scene: [Boot, Preloader, MainMenu, GameScene, GameOver],
  })
}
