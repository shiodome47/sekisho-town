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
 * 今の動きから、どのこまを出すか。
 * stride は、歩いた・走った歩数（足音が鳴るたびに 1 つ増える）。横から見た絵（walk1・walk2、run1・run2）があれば、
 * 歩数に合わせて、左足が前・右足が前を交互に出す。無ければ、stand・walk・run を時間で切りかえる
 */
export function poseFor(ch: Character, a: { moving: boolean; running: boolean; z: number }, t: number, emote?: string, stride = 0): Frame {
  if (emote) return poseOf(ch, emote)
  if (a.z > 0) return poseOf(ch, 'jump')
  if (!a.moving) return poseOf(ch, 'stand')
  const side = stride % 2 ? '2' : '1'
  if (a.running) {
    if (ch.poses.run1 && ch.poses.run2) return ch.poses[`run${side}`]
    return poseOf(ch, Math.floor(t * 9) % 2 ? 'walk' : 'run')
  }
  if (ch.poses.walk1 && ch.poses.walk2) return ch.poses[`walk${side}`]
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
