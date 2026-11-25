import type { SoundEvent } from './sound'

/**
 * 関所めぐりの町の音を鳴らす道具（Web Audio）。0.14.0。
 *
 * 部品は、音の素材（mp3）を持たない（素材の使ってよい条件は、アプリごとにちがうので）。
 * アプリは、素材を自分のところに置き、その場所を url で渡す:
 *
 *   const sound = createTownSound({ url: (name) => `/sound/town/${name}.mp3` })
 *   <SekishoTown muted={!on} onSound={sound.play} />
 *
 * 置く素材の名前（TOWN_SOUND_FILES）: step・jump・talk・found・stamp・jingle-clear・castle-gate・music-castle・
 * ambience-street・ambience-river・temple-bell・music-town・music-kanki。無い素材は、鳴らないだけ（ゲームは止まらない）
 *
 * Web Audio（AudioContext）で鳴らす:
 * - iPhone の Safari は、指でさわった「その場」でしか <audio> を鳴らせない。足音や「関所を見つけた」は、
 *   さわった場ではなく、画面を描く流れの中で鳴るので、<audio> では鳴らない。Web Audio は、いちど
 *   さわったときに「鳴らしてよい」状態にしておけば（unlock）、あとはどこからでも鳴らせる
 * - 音のファイルは、まるごと読み込んでおく（一部だけ読む読み方をしないので、サービスワーカーともぶつからない）
 *
 * 曲（通りで流れる曲）だけは、長いので、<audio> で少しずつ読みながら流し、大きさは Web Audio で決める
 * （iPhone は <audio> の大きさを変えられないため）。
 *
 * createSoundPlayer（sound.ts）は、<audio> だけのかんたんな道具。こちらは、町のために作りこんだもの
 */

/** 置く素材の名前（拡張子なし） */
export const TOWN_SOUND_FILES = [
  'step', 'jump', 'talk', 'found', 'stamp', 'jingle-clear', 'castle-gate', 'music-castle',
  'ambience-street', 'ambience-river', 'temple-bell', 'music-town', 'music-kanki',
] as const

export interface TownSoundOptions {
  /** 素材の名前（'step' など）→ URL */
  url: (name: string) => string
  /** 曲が流れる通り（通りの id → 素材の名前）。無ければ、茶屋横丁に町の曲、城内に歓喜の曲 */
  musicAreas?: Record<string, string>
}

export interface TownSound {
  /** <SekishoTown onSound={sound.play} /> に渡す */
  play: (event: SoundEvent) => void
  /** 町に入る前に、短い音を読み込んでおく（はじめの 1 回が遅れないように） */
  preload: () => void
}

export function createTownSound(options: TownSoundOptions): TownSound {
  const url = options.url

  /** きっかけ → 音の名前と大きさ（0〜1） */
  const EFFECTS: Partial<Record<SoundEvent['name'], { file: string; volume: number }>> = {
    jump: { file: 'jump', volume: 0.6 },
    talk: { file: 'talk', volume: 0.5 }, // 話を 1 つ進めた
    found: { file: 'found', volume: 0.7 }, // 関所を見つけた（拍子木）
    clear: { file: 'stamp', volume: 1 }, // 関所をこえた（印の「ポン」。主役なので、いちばん大きく）
  }

  /**
   * 足音。何度も鳴るので小さく。走るときは、音を高く・小さくして、軽くする（もとの音は、歩く速さの重さ）。
   * 毎回、高さを少しだけ変える（同じ音が続いて、機械のように聞こえないように）
   */
  const STEP = { file: 'step', walk: { volume: 0.26, rate: 1.05 }, run: { volume: 0.17, rate: 1.32 }, vary: 0.05 }

  /** 通りの景色 → くり返して流す町の音と、通りに入ったときに 1 回鳴らす音 */
  const AMBIENCE: Record<string, { loop?: string; once?: string; volume: number }> = {
    street: { loop: 'ambience-street', volume: 0.22 }, // にぎやかな通り
    castle: { loop: 'ambience-street', volume: 0.1 }, // 城のまわりは、町の音が遠くに聞こえる
    river: { loop: 'ambience-river', volume: 0.28 }, // 川のせせらぎ
    temple: { once: 'temple-bell', volume: 0.45 }, // 寺町は静か。入ったときに、鐘が 1 つ
  }

  /**
   * 曲が流れる通りと、その曲。町ぜんたいには流さない（ほかの通りは、町の音だけ）。曲の流れる通りでは、町の音を小さくする
   * - 茶屋横丁（芝居小屋と茶屋のある通り）: 町の曲
   * - 城内（印を全部そろえて、大手門をくぐった先）: 歓喜の曲
   */
  const MUSIC_AREAS: Record<string, string> = options.musicAreas ?? { yokocho: 'music-town', shiro: 'music-kanki' }
  const AMBIENCE_UNDER_MUSIC = 0.08
  /** 曲の大きさ */
  const MUSIC_VOLUME = 0.3
  /** 関所をこえたときの短い曲（印の音に続けて鳴らす）と、城でのご褒美の曲。鳴っている間は、町の曲を小さくする */
  const JINGLE = { file: 'jingle-clear', volume: 0.5, seconds: 7.7 }
  /** 印の「ポン」が聞こえてから、短い曲を始めるまでの間（ミリ秒） */
  const JINGLE_DELAY = 650
  const CASTLE = { file: 'music-castle', volume: 0.7, seconds: 10 }

  let ctx: AudioContext | undefined
  /** 町を歩いているときの曲（<audio> を、Web Audio の大きさのつまみにつないだもの） */
  /** 作った曲（file → <audio> と、大きさのつまみ）と、いま流したい曲 */
  const tracks = new Map<string, { audio: HTMLAudioElement; gain: GainNode }>()
  let music: { file: string; audio: HTMLAudioElement; gain: GainNode; wanted: boolean } | undefined
  let duckTimer: number | undefined
  /** 城の門が開く音。門が開きはじめたとき（印が全部そろったあと、はじめて門の前に来たとき）に鳴らす */
  const CASTLE_GATE = { file: 'castle-gate', volume: 1 }
  const buffers = new Map<string, Promise<AudioBuffer | undefined>>()
  let ambience: { file: string; source: AudioBufferSourceNode; gain: GainNode } | undefined
  /** いま流したい町の音（読み込みが終わる前に、通りを移ったときのため） */
  let wanted: string | undefined

  function context(): AudioContext | undefined {
    if (ctx) return ctx
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return undefined
    ctx = new Ctor()
    return ctx
  }

  /** 画面にさわったとき・キーを押したときに、「鳴らしてよい」状態にする */
  function unlock() {
    const c = context()
    if (c && c.state !== 'running') void c.resume().catch(() => {})
    // さわる前に始めようとして、止められていた曲を、ここで始める
    if (music?.wanted && music.audio.paused) void music.audio.play().catch(() => {})
  }
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // 別のタブ・別のアプリから戻ってきたとき、ブラウザが音を止めていることがある。戻ってきたら、また用意する
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) unlock()
    })
    window.addEventListener('pageshow', unlock)
    for (const type of ['pointerdown', 'touchend', 'keydown', 'click']) window.addEventListener(type, unlock, { capture: true, passive: true })
  }

  function load(file: string): Promise<AudioBuffer | undefined> {
    let p = buffers.get(file)
    if (!p) {
      p = (async () => {
        const c = context()
        if (!c) return undefined
        try {
          const data = await (await fetch(url(file))).arrayBuffer()
          return await c.decodeAudioData(data)
        } catch {
          // 読めなくても、ゲームは止めない。次に鳴らすときに、また読みに行く
          buffers.delete(file)
          return undefined
        }
      })()
      buffers.set(file, p)
    }
    return p
  }

  /**
   * 音を 1 回鳴らす。
   * 音を出す用意ができていないとき（別のタブから戻ってきた直後・さわった直後で、まだ用意の途中 など）:
   * - wait が true（印・短い曲など、鳴らしそこねたくない音）: 用意ができるのを少し待ってから鳴らす
   * - wait が false（足音）: 鳴らさない（あとからまとめて鳴ると、おかしいので）
   */
  function playOnce(file: string, volume: number, rate = 1, wait = true) {
    void load(file).then(async (buffer) => {
      const c = ctx
      if (!c || !buffer) return
      if (c.state !== 'running') {
        if (!wait) return
        // 用意をたのんで、2 秒まで待つ
        await Promise.race([c.resume().catch(() => {}), new Promise((r) => window.setTimeout(r, 2000))])
        if ((c.state as string) !== 'running') return
      }
      const source = c.createBufferSource()
      const gain = c.createGain()
      gain.gain.value = volume
      source.buffer = buffer
      // rate を上げると、音が高く・短くなる
      source.playbackRate.value = rate
      source.connect(gain).connect(c.destination)
      source.start()
    })
  }

  function stopAmbience() {
    wanted = undefined
    if (!ambience) return
    const { source, gain } = ambience
    ambience = undefined
    const c = ctx
    try {
      // ぷつっと切れないよう、少しかけて小さくする
      if (c) gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.4)
      source.stop(c ? c.currentTime + 0.45 : 0)
    } catch {
      // もう止まっている
    }
  }

  function setAmbience(file: string | undefined, volume: number) {
    if (!file) return stopAmbience()
    if (ambience?.file === file) {
      // 同じ音のまま、大きさだけ変える（通り → 城のまわり）
      if (ctx) ambience.gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.6)
      wanted = file
      return
    }
    stopAmbience()
    wanted = file
    void load(file).then((buffer) => {
      const c = ctx
      if (!c || !buffer || wanted !== file || ambience?.file === file) return
      const source = c.createBufferSource()
      const gain = c.createGain()
      gain.gain.value = 0
      gain.gain.linearRampToValueAtTime(volume, c.currentTime + 0.8)
      source.buffer = buffer
      source.loop = true
      source.connect(gain).connect(c.destination)
      source.start()
      ambience = { file, source, gain }
    })
  }

  function startMusic(file: string) {
    const c = context()
    if (!c) return
    if (music && music.file !== file) {
      // 別の曲に替える。前の曲は止めて、次に流すときは、はじめから
      music.audio.pause()
      music.audio.currentTime = 0
      music = undefined
    }
    if (!music) {
      let track = tracks.get(file)
      if (!track) {
        const audio = new Audio(url(file))
        audio.loop = true
        audio.preload = 'auto'
        const gain = c.createGain()
        c.createMediaElementSource(audio).connect(gain).connect(c.destination)
        track = { audio, gain }
        tracks.set(file, track)
      }
      track.gain.gain.cancelScheduledValues(c.currentTime)
      track.gain.gain.value = MUSIC_VOLUME
      music = { file, ...track, wanted: true }
    }
    music.wanted = true
    // さわった「その場」でなければ、止められることがある。そのときは、次にさわったときに始める（unlock）
    if (music.audio.paused) void music.audio.play().catch(() => {})
  }

  /** 曲を止める。rewind が false なら、次にその通りへ来たとき、つづきから流れる */
  function stopMusic(rewind: boolean) {
    if (!music) return
    music.wanted = false
    music.audio.pause()
    if (rewind) music.audio.currentTime = 0
  }

  /** 短い曲を鳴らし、その間だけ、町の曲を小さくする */
  function playOver(piece: { file: string; volume: number; seconds: number }) {
    playOnce(piece.file, piece.volume)
    const c = ctx
    if (!c || !music) return
    const g = music.gain.gain
    g.cancelScheduledValues(c.currentTime)
    g.linearRampToValueAtTime(MUSIC_VOLUME * 0.15, c.currentTime + 0.3)
    window.clearTimeout(duckTimer)
    duckTimer = window.setTimeout(() => {
      if (ctx && music) music.gain.gain.linearRampToValueAtTime(MUSIC_VOLUME, ctx.currentTime + 1.2)
    }, piece.seconds * 1000)
  }

  /** 町に入る前に、短い音を読み込んでおく（はじめの 1 回が遅れないように） */
  function preload() {
    for (const e of Object.values(EFFECTS)) if (e) void load(e.file)
    void load(STEP.file)
    void load(JINGLE.file)
    void load(CASTLE_GATE.file)
  }

  function play(event: SoundEvent) {
    if (event.name === 'enter') {
      const a = AMBIENCE[event.scene ?? 'street'] ?? AMBIENCE.street
      const track = event.area ? MUSIC_AREAS[event.area] : undefined
      const withMusic = !!track
      setAmbience(a.loop, withMusic ? AMBIENCE_UNDER_MUSIC : a.volume)
      if (a.once) playOnce(a.once, a.volume)
      if (track) startMusic(track)
      else stopMusic(false)
      return
    }
    if (event.name === 'leave') {
      stopMusic(true)
      return stopAmbience()
    }
    // 止めている間（練習の画面を上に出している間）は、音を全部止める
    if (event.name === 'pause') {
      music?.audio.pause()
      return void ctx?.suspend().catch(() => {})
    }
    if (event.name === 'resume') {
      if (music?.wanted) void music.audio.play().catch(() => {})
      return void ctx?.resume().catch(() => {})
    }
    // 関所をこえた: 印の音に続けて、短い曲。城でのご褒美: ご褒美の曲
    if (event.name === 'clear') window.setTimeout(() => playOver(JINGLE), JINGLE_DELAY)
    if (event.name === 'finale') playOver(CASTLE)
    if (event.name === 'gateopen') return playOnce(CASTLE_GATE.file, CASTLE_GATE.volume)
    if (event.name === 'step') {
      const s = event.run ? STEP.run : STEP.walk
      return playOnce(STEP.file, s.volume, s.rate * (1 + (Math.random() * 2 - 1) * STEP.vary), false)
    }
    const effect = EFFECTS[event.name]
    if (effect) playOnce(effect.file, effect.volume)
  }

  return { play, preload }
}
