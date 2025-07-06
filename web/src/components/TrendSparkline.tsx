import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { GaugeReading } from '../services/usgs'

interface Props {
  data: GaugeReading[]
  color?: string
}

export function TrendSparkline({ data, color = '#8884d8' }: Props) {
  const chartData = data.map((d) => ({ value: d.gageHeight }))
  return (
    <div style={{ width: 120, height: 40 }}>
      <ResponsiveContainer>
        <LineChart data={chartData}> 
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}