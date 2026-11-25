import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTripStore, tripAfterReport } from '../trip'
import { TripReturn } from '../TripReturn'

beforeEach(() => localStorage.clear())

describe('おでかけの覚え', () => {
  it('出る・戻る。出るたびに、大きいボタンから始まり、さそいは消える', () => {
    const trip = createTripStore()
    expect(trip.get()).toMatchObject({ away: false, from: 'town' })
    trip.leave()
    trip.setSmall(true)
    trip.setDone('「青」をくり返す', true)
    expect(trip.get()).toMatchObject({ away: true, from: 'town', small: true, doneItem: '「青」をくり返す', doneGate: true })
    trip.leave('course')
    expect(trip.get()).toMatchObject({ away: true, from: 'course', small: false, doneItem: null, doneGate: false })
    // 町から出ていないのに、町の画面を開いても、戻ったことにしない
    trip.arrive('town')
    expect(trip.get().away).toBe(true)
    trip.arrive('course')
    expect(trip.get().away).toBe(false)
  })

  it('storageKey を渡すと、出ていること・戻る先・小さくしたことを覚える（さそいは覚えない）', () => {
    const a = createTripStore({ storageKey: 'trip' })
    a.leave('course')
    a.setSmall(true)
    a.setDone('x')
    const b = createTripStore({ storageKey: 'trip' })
    expect(b.get()).toEqual({ away: true, from: 'course', small: true, doneItem: null, doneGate: false })
    localStorage.setItem('trip', '{こわれている')
    expect(createTripStore({ storageKey: 'trip' }).get().away).toBe(false)
  })
})

describe('練習が 1 つ進んだあと、何をするか', () => {
  const town = { away: true, from: 'town' as const }
  const course = { away: true, from: 'course' as const }
  const home = { away: false, from: 'town' as const }
  it('出ていないとき（ふつうの練習）: 止めない・さそわない。関所をこえたら、その場で演出', () => {
    expect(tripAfterReport(home, { reachedTitle: 'a', gateCleared: false })).toEqual({ pause: false, done: null, celebrateHere: false })
    expect(tripAfterReport(home, { reachedTitle: 'a', gateCleared: true })).toEqual({ pause: false, done: null, celebrateHere: true })
  })
  it('回数に届いていなければ、何もしない', () => {
    expect(tripAfterReport(town, { reachedTitle: null, gateCleared: false })).toEqual({ pause: false, done: null, celebrateHere: false })
  })
  it('町から出て、項目の回数に届いた: 止めて、さそう', () => {
    expect(tripAfterReport(town, { reachedTitle: 'a', gateCleared: false })).toEqual({ pause: true, done: { title: 'a', gate: false }, celebrateHere: false })
  })
  it('町から出て、関所をこえた: 止めて、「町で印を」とさそう。その場では演出を出さない', () => {
    expect(tripAfterReport(town, { reachedTitle: 'a', gateCleared: true })).toEqual({ pause: true, done: { title: 'a', gate: true }, celebrateHere: false })
  })
  it('コースの画面から出て、関所をこえた: 止めて、その場で演出（さそいは出さない）', () => {
    expect(tripAfterReport(course, { reachedTitle: 'a', gateCleared: true })).toEqual({ pause: true, done: null, celebrateHere: true })
    expect(tripAfterReport(course, { reachedTitle: 'a', gateCleared: false })).toEqual({ pause: true, done: { title: 'a', gate: false }, celebrateHere: false })
  })
})

describe('<TripReturn>', () => {
  it('出ていないとき・戻る先の画面にいるときは、何も出さない', () => {
    const trip = createTripStore()
    const { container, rerender } = render(<TripReturn trip={trip} here={null} onBack={() => {}} />)
    expect(container).toBeEmptyDOMElement()
    act(() => trip.leave('town'))
    expect(screen.getByRole('button', { name: /町にもどる$/ })).toBeInTheDocument()
    rerender(<TripReturn trip={trip} here="town" onBack={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('× で小さくなり（消えない）、‹ で大きく戻る。押すと、出たところへ戻る', () => {
    const trip = createTripStore()
    const onBack = vi.fn()
    render(<TripReturn trip={trip} here={null} onBack={onBack} />)
    act(() => trip.leave('course'))
    fireEvent.click(screen.getByRole('button', { name: '関所にもどるボタンを小さくする' }))
    fireEvent.click(screen.getByRole('button', { name: '関所にもどる' }))
    expect(onBack).toHaveBeenLastCalledWith('course')
    fireEvent.click(screen.getByRole('button', { name: '関所にもどるボタンを大きくする' }))
    expect(screen.getByRole('button', { name: /📜 関所にもどる/ })).toBeInTheDocument()
  })

  it('回数に届いたら、さそいを出す（小さくしていても）。関所をこえたときは「町で印を」。「もう少し練習する」で消える', () => {
    const trip = createTripStore()
    const onBack = vi.fn()
    render(<TripReturn trip={trip} here={null} onBack={onBack} />)
    act(() => {
      trip.leave('town')
      trip.setSmall(true)
      trip.setDone('「青」をくり返す', true)
    })
    const prompt = screen.getByRole('status')
    expect(prompt).toHaveTextContent('「青」をくり返す: できた！')
    expect(prompt).toHaveTextContent('町にもどって、印をおしてもらおう')
    fireEvent.click(screen.getByRole('button', { name: /町にもどる$/ }))
    expect(onBack).toHaveBeenLastCalledWith('town')
    fireEvent.click(screen.getByRole('button', { name: 'もう少し練習する' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', { name: '町にもどる' })).toBeInTheDocument()
  })
})
