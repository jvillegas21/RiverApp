import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { GaugeReading } from '../services/usgs'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  data: GaugeReading[]
}

export function TrendModal({ open, onClose, title, data }: Props) {
  if (!open) return null
  const chartData = data.map((d) => ({
    value: d.gageHeight,
    ts: new Date(d.timestamp).toLocaleTimeString(),
  }))

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="ts" hide />
              <YAxis domain={['auto', 'auto']} width={40} />
              <Tooltip formatter={(v: number) => v.toFixed(2)} />
              <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  )
}