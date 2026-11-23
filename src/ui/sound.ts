/**
 * 音の差込口。部品は音の素材を持たない（素材の使ってよい条件は、アプリごとにちがうので）。
 * 部品は「いま、こういうことが起きた」（SoundEvent）を知らせるだけで、鳴らすのはアプリ。
 * かんたんに鳴らしたいときは、createSoundPlayer に音の URL を渡して、その play を onSound に渡す。
 */

/**
 * 音のきっかけ。
 * - step: 足音（歩く・走る。走るときは run が true）　- jump: とぶ
 * - talk: 話を 1 つ進めた（文字送り）
 * - found: 関所を見つけた　- gate: 関所の板を開いた　- locked: 開かない関所・門
 * - check: 項目が 1 つ進んだ　- clear: 関所をこえた（印）　- complete: 印が全部そろった（城の門が開く）
 * - finale: 城で、ご褒美が始まる
 * - enter: 通りに入った（area・scene。曲や町の音を切りかえるのに使う。ゲームを始めたときにも来る）
 * - pause・resume: 止めた・また動かした（アプリが上に練習の画面を出している間など）
 * - leave: 町を出た（はじめの画面に戻った・部品が消えた）。曲を止める
 */
export type SoundName =
  | 'step'
  | 'jump'
  | 'talk'
  | 'found'
  | 'gate'
  | 'locked'
  | 'check'
  | 'clear'
  | 'complete'
  | 'finale'
  | 'enter'
  | 'pause'
  | 'resume'
  | 'leave'

export interface SoundEvent {
  name: SoundName
  /** enter のとき: 通りの id（'honmachi' など）と、景色の種類（'street'・'river'・'temple'・'castle'） */
  area?: string
  scene?: string
  /** step のとき: 走っているか */
  run?: boolean
}

/** 鳴らすもの 1 つ（HTMLAudioElement のうち、使うところだけ） */
export interface AudioLike {
  play: () => Promise<void> | void
  pause: () => void
  loop: boolean
  volume: number
  currentTime: number
}

export interface SoundPlayerOptions {
  /** 効果音。きっかけ → 音の URL（無いきっかけは鳴らさない） */
  effects?: Partial<Record<SoundName, string>>
  /**
   * 曲・町の音（くり返して流す）。通りに入ったときに、areas（通りの id）→ scenes（景色の種類）→ default の順にさがす。
   * finale は、城でご褒美が始まるときの曲
   */
  music?: { default?: string; areas?: Record<string, string>; scenes?: Record<string, string>; finale?: string }
  /** 効果音の大きさ（0〜1。無ければ 0.8） */
  volume?: number
  /** 曲の大きさ（0〜1。無ければ 0.4） */
  musicVolume?: number
  /** 音を作るところを差し替える（テスト用。無ければ new Audio(url)） */
  createAudio?: (url: string) => AudioLike
}

export interface SoundPlayer {
  /** <SekishoTown onSound={player.play} /> に渡す */
  play: (event: SoundEvent) => void
  /** 曲を止める */
  stop: () => void
}

/**
 * 音の URL を渡すと、きっかけに合わせて鳴らす道具を作る。
 * ブラウザは、使う人が画面にさわるまで音を出さない。鳴らせなかったときは、だまって何もしない。
 */
export function createSoundPlayer(options: SoundPlayerOptions): SoundPlayer {
  const create = options.createAudio ?? ((url: string) => new Audio(url) as AudioLike)
  const effects = new Map<string, AudioLike>()
  let music: { url: string; audio: AudioLike } | undefined
  let paused = false

  const quiet = (run: () => Promise<void> | void) => {
    try {
      void Promise.resolve(run()).catch(() => {})
    } catch {
      // 鳴らせなくても、ゲームは止めない
    }
  }

  const setMusic = (url: string | undefined) => {
    if (music?.url === url) return
    music?.audio.pause()
    music = undefined
    if (!url) return
    const audio = create(url)
    audio.loop = true
    audio.volume = options.musicVolume ?? 0.4
    music = { url, audio }
    if (!paused) quiet(() => audio.play())
  }

  const stop = () => setMusic(undefined)

  const play = (event: SoundEvent) => {
    const m = options.music
    if (event.name === 'enter') setMusic((event.area && m?.areas?.[event.area]) || (event.scene && m?.scenes?.[event.scene]) || m?.default)
    else if (event.name === 'finale' && m?.finale) setMusic(m.finale)
    else if (event.name === 'leave') stop()
    else if (event.name === 'pause') {
      paused = true
      music?.audio.pause()
    } else if (event.name === 'resume') {
      paused = false
      if (music) quiet(() => music!.audio.play())
    }
    const url = options.effects?.[event.name]
    if (!url) return
    let audio = effects.get(url)
    if (!audio) {
      audio = create(url)
      audio.volume = options.volume ?? 0.8
      effects.set(url, audio)
    }
    const a = audio
    quiet(() => {
      a.currentTime = 0
      return a.play()
    })
  }

  return { play, stop }
}
