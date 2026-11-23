import { useEffect, useState } from 'react'
import { poseOf, type Character, type Frame } from './cast'

/** 登場人物の絵を読み込む。読み込めたものだけ、url → 絵 で返す */
export function useImages(urls: string[]): Map<string, HTMLImageElement> {
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(new Map())
  const key = urls.join('\n')
  useEffect(() => {
    let alive = true
    for (const url of urls) {
      const img = new Image()
      img.onload = () => alive && setImages((m) => new Map(m).set(url, img))
      img.src = url
    }
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return images
}

/** 今の動きから、どのこまを出すか */
/**
 * 歩く・走るの 6 こまの、何こま目か（0〜5）。6 こまの絵（walk1〜walk6・run1〜run6）が無ければ -1。
 * 1 歩を 3 こま（足が開く → すれ違う → 蹴って浮く）で出し、2 歩で 1 周する。
 * stride は歩数（足音が鳴るたびに 1 つ増える）、phase は、その 1 歩の中の進み具合（0〜1）
 */
export function cycleFrame(ch: Character, kind: 'walk' | 'run', stride: number, phase: number): number {
  if (!ch.poses[`${kind}6`]) return -1
  return (stride % 2) * 3 + Math.min(2, Math.max(0, Math.floor(phase * 3)))
}

/**
 * 今の動きから、どのこまを出すか。
 * stride は、歩いた・走った歩数（足音が鳴るたびに 1 つ増える）、phase は、その 1 歩の中の進み具合（0〜1）。
 * - 6 こまの絵（walk1〜walk6・run1〜run6）があれば、順に出す
 * - 2 こまの絵（walk1・walk2、run1・run2）だけなら、歩数に合わせて交互に出す
 * - どれも無ければ、stand・walk・run を時間で切りかえる
 */
export function poseFor(ch: Character, a: { moving: boolean; running: boolean; z: number }, t: number, emote?: string, stride = 0, phase = 0): Frame {
  if (emote) return poseOf(ch, emote)
  if (a.z > 0) return poseOf(ch, 'jump')
  if (!a.moving) return poseOf(ch, 'stand')
  const kind = a.running ? 'run' : 'walk'
  const six = cycleFrame(ch, kind, stride, phase)
  if (six >= 0) return ch.poses[`${kind}${six + 1}`] ?? ch.poses[`${kind}1`]
  if (ch.poses[`${kind}1`] && ch.poses[`${kind}2`]) return ch.poses[`${kind}${stride % 2 ? 2 : 1}`]
  if (a.running) return poseOf(ch, Math.floor(t * 9) % 2 ? 'walk' : 'run')
  return poseOf(ch, Math.floor(t * 5) % 2 ? 'stand' : 'walk')
}

/** 人を描く。x・y は足もと（中の単位） */
export function drawActor(
  c: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  ch: Character,
  frame: Frame,
  x: number,
  y: number,
  opts: { face: 1 | -1; z?: number; bob?: number },
) {
  const height = ch.height ?? 62
  const s = height / ch.poses.stand[3]
  const w = frame[2] * s
  const h = frame[3] * s
  const z = opts.z ?? 0
  c.fillStyle = 'rgba(40,30,20,0.22)'
  c.beginPath()
  c.ellipse(x, y, Math.max(8, 15 - z * 0.1), Math.max(2, 4 - z * 0.03), 0, 0, Math.PI * 2)
  c.fill()
  if (!img) return
  c.save()
  c.translate(x, y - z - (opts.bob ?? 0))
  if (opts.face < 0) c.scale(-1, 1)
  c.imageSmoothingEnabled = true
  c.imageSmoothingQuality = 'high'
  c.drawImage(img, frame[0], frame[1], frame[2], frame[3], -w / 2, -h + 2, w, h)
  c.restore()
}
