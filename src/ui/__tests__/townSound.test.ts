import { describe, expect, it } from 'vitest'
import { createTownSound, TOWN_SOUND_FILES } from '../townSound'

describe('町の音を鳴らす道具', () => {
  it('音を出せないところ（AudioContext が無い）でも、こわれない', () => {
    const sound = createTownSound({ url: (name) => `/sound/${name}.mp3` })
    expect(() => {
      sound.preload()
      sound.play({ name: 'enter', area: 'yokocho', scene: 'street' })
      sound.play({ name: 'step', run: true })
      sound.play({ name: 'clear' })
      sound.play({ name: 'pause' })
      sound.play({ name: 'resume' })
      sound.play({ name: 'leave' })
    }).not.toThrow()
  })
  it('置く素材の名前は 13 個', () => {
    expect(new Set(TOWN_SOUND_FILES).size).toBe(13)
  })
})
