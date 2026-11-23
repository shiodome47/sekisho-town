import { createSoundPlayer, type AudioLike } from '../sound'

function setup(options: Parameters<typeof createSoundPlayer>[0] = {}) {
  const made: (AudioLike & { url: string; plays: number; pauses: number })[] = []
  const player = createSoundPlayer({
    ...options,
    createAudio: (url) => {
      const a = { url, plays: 0, pauses: 0, loop: false, volume: 1, currentTime: 5, play: () => void a.plays++, pause: () => void a.pauses++ }
      made.push(a)
      return a
    },
  })
  return { player, made }
}

describe('音を鳴らす道具', () => {
  it('きっかけに合う効果音を鳴らす（同じ音は、頭から鳴らし直す）', () => {
    const { player, made } = setup({ effects: { jump: '/jump.mp3' }, volume: 0.5 })
    player.play({ name: 'jump' })
    player.play({ name: 'jump' })
    player.play({ name: 'talk' })
    expect(made).toHaveLength(1)
    expect(made[0]).toMatchObject({ url: '/jump.mp3', plays: 2, volume: 0.5, currentTime: 0, loop: false })
  })
  it('通りに入ると、通り → 景色 → ふつう、の順に曲をさがして、くり返して流す', () => {
    const { player, made } = setup({ music: { default: '/town.mp3', scenes: { river: '/river.mp3' }, areas: { shiro: '/castle.mp3' } } })
    player.play({ name: 'enter', area: 'honmachi', scene: 'street' })
    player.play({ name: 'enter', area: 'kido', scene: 'street' })
    expect(made.map((a) => a.url)).toEqual(['/town.mp3'])
    expect(made[0]).toMatchObject({ loop: true, plays: 1 })
    player.play({ name: 'enter', area: 'kawabata', scene: 'river' })
    player.play({ name: 'enter', area: 'shiro', scene: 'castle' })
    expect(made.map((a) => a.url)).toEqual(['/town.mp3', '/river.mp3', '/castle.mp3'])
    expect(made[0].pauses).toBe(1)
  })
  it('止める・また動かす・町を出る', () => {
    const { player, made } = setup({ music: { default: '/town.mp3', finale: '/finale.mp3' } })
    player.play({ name: 'enter', area: 'kido', scene: 'street' })
    player.play({ name: 'pause' })
    player.play({ name: 'resume' })
    expect(made[0]).toMatchObject({ plays: 2, pauses: 1 })
    player.play({ name: 'finale' })
    expect(made[1]).toMatchObject({ url: '/finale.mp3', plays: 1 })
    player.play({ name: 'leave' })
    expect(made[1].pauses).toBe(1)
  })
  it('鳴らせなくても、止まらない', () => {
    const player = createSoundPlayer({
      effects: { jump: '/x.mp3' },
      createAudio: () => ({ loop: false, volume: 1, currentTime: 0, pause: () => {}, play: () => Promise.reject(new Error('NotAllowedError')) }),
    })
    expect(() => player.play({ name: 'jump' })).not.toThrow()
  })
})
