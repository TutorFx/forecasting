export interface Range {
  start: Date
  end: Date
}

export type Period = 'daily' | 'weekly' | 'monthly'

type DataRecord = { x: number, y: number }
