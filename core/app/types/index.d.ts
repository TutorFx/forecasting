interface DataRecord {
  date: Date
  amount: number
  forecast?: {
    yhatUpper: number
    yhatLower: number
  }
}

interface DataSegment {
  name: string
  data: DataRecord[]
  color: string
}

interface LineChartProps {
  data: DataSegment[]
}
