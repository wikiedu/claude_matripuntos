import { useState } from 'react'
import { useAchievementsMap } from '../hooks/useAchievementsMap'
import type { AchievementMapNode } from '../types'

const RARITY_COLORS = {
  common:    { fill: '#15803d', stroke: '#22c55e', badge: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  rare:      { fill: '#1d4ed8', stroke: '#60a5fa', badge: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  epic:      { fill: 'rgba(168,85,247,0.15)', stroke: '#a855f7', badge: '#c084fc', bg: 'rgba(168,85,247,0.12)' },
  legendary: { fill: 'rgba(245,158,11,0.15)', stroke: '#f59e0b', badge: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
}

const CATEGORIES = [
  { key: 'all',         label: 'Todo' },
  { key: 'constancia',  label: '🔥 Constancia' },
  { key: 'equilibrio',  label: '⚖️ Equilibrio' },
  { key: 'consenso',    label: '🤝 Consenso' },
  { key: 'rendimiento', label: '🏆 Rendimiento' },
  { key: 'pareja',      label: '💑 Pareja' },
  { key: 'secretos',    label: '🔮 Secretos' },
]

function NodeDetail({ node }: { node: AchievementMapNode }) {
  const colors = RARITY_COLORS[node.rarity]
  const rarityLabel = { common: 'COMÚN', rare: 'RARO', epic: 'ÉPICO', legendary: 'LEGENDARIO' }[node.rarity]
  return (
    <div className="rounded-xl p-3 mt-3 flex gap-3 items-start"
         style={{ background: 'rgba(26,16,53,0.9)', border: `1px solid ${colors.stroke}33` }}>
      <span className="text-3xl flex-shrink-0">{node.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white">{node.name}</div>
        <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{node.description}</div>
        <span className="inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: colors.bg, color: colors.badge, border: `1px solid ${colors.stroke}55` }}>
          ✦ {rarityLabel} · +{node.xpReward} XP
        </span>
        {node.progress && node.status === 'in_progress' && (
          <div className="mt-2">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-1.5 rounded-full"
                   style={{ width: `${node.progress.percentage}%`, background: `linear-gradient(90deg, ${colors.stroke}, ${colors.fill})` }} />
            </div>
            <div className="text-[9px] text-gray-500 mt-0.5">{node.progress.current} / {node.progress.target}</div>
          </div>
        )}
        {node.status === 'unlocked' && (
          <div className="text-[9px] text-green-400 mt-1">✓ Desbloqueado</div>
        )}
      </div>
    </div>
  )
}

function generatePositions(count: number): { cx: number; cy: number }[] {
  const positions: { cx: number; cy: number }[] = []
  const cols = 3
  const rowH = 80
  const margin = 60
  const width = 360

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols
    const isEvenRow = row % 2 === 0
    const x = isEvenRow
      ? margin + col * ((width - margin * 2) / (cols - 1))
      : width - margin - col * ((width - margin * 2) / (cols - 1))
    const y = 40 + row * rowH
    positions.push({ cx: Math.round(x), cy: y })
  }
  return positions
}

export function AchievementsMap() {
  const { data: nodes, isLoading } = useAchievementsMap()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedNode, setSelectedNode] = useState<AchievementMapNode | null>(null)

  if (isLoading || !nodes) {
    return <div className="h-64 rounded-xl bg-white/5 animate-pulse" />
  }

  const filtered = selectedCategory === 'all' ? nodes : nodes.filter(n => n.category === selectedCategory)
  const positions = generatePositions(filtered.length)
  const svgHeight = positions.length > 0 ? (positions[positions.length - 1].cy + 50) : 200

  return (
    <div className="rounded-xl p-4" style={{ background: 'linear-gradient(160deg,#0d0a1a,#0f0a1e,#12103a)' }}>
      <div className="text-center text-[10px] uppercase tracking-widest text-gray-400 mb-4">🗺️ Mapa de Logros</div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap justify-center mb-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => { setSelectedCategory(cat.key); setSelectedNode(null) }}
            className="px-3 py-1 rounded-full text-[10px] font-bold border transition-colors"
            style={selectedCategory === cat.key
              ? { background: 'rgba(245,158,11,0.12)', borderColor: '#f59e0b', color: '#f59e0b' }
              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#6b7280' }
            }
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* SVG map */}
      <svg viewBox={`0 0 360 ${svgHeight}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
        {/* Path lines */}
        {positions.map((pos, i) => {
          if (i === 0) return null
          const prev = positions[i - 1]
          const prevNode = filtered[i - 1]
          const currNode = filtered[i]
          const isActive = prevNode.status === 'unlocked' &&
            (currNode.status === 'unlocked' || currNode.status === 'in_progress')
          return (
            <line
              key={`line-${i}`}
              x1={prev.cx} y1={prev.cy} x2={pos.cx} y2={pos.cy}
              stroke={isActive ? '#7c3aed' : 'rgba(168,85,247,0.2)'}
              strokeWidth="2.5"
              strokeDasharray={isActive ? undefined : '6,4'}
            />
          )
        })}

        {/* Nodes */}
        {filtered.map((node, i) => {
          const { cx, cy } = positions[i]
          const colors = RARITY_COLORS[node.rarity]
          const r = node.rarity === 'legendary' ? 26 : 22

          return (
            <g
              key={node.id}
              onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
              style={{ cursor: 'pointer' }}
            >
              {node.status === 'in_progress' && (
                <circle cx={cx} cy={cy} r={r + 8} fill="none"
                        stroke={colors.stroke} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
              )}
              <circle
                cx={cx} cy={cy} r={r}
                fill={node.status === 'locked' ? 'rgba(255,255,255,0.04)' : colors.fill}
                stroke={node.status === 'locked' ? 'rgba(255,255,255,0.1)' : colors.stroke}
                strokeWidth="2"
              />
              <text x={cx} y={cy + 7} textAnchor="middle" fontSize={node.rarity === 'legendary' ? 20 : 18}>
                {node.status === 'locked' ? '🔒' : node.icon}
              </text>
              <text x={cx} y={cy + r + 14} textAnchor="middle"
                    fill={node.status === 'locked' ? '#374151' : '#6b7280'} fontSize="8">
                {node.status === 'locked' ? '???' : (node.name.length > 10 ? node.name.slice(0, 10) + '…' : node.name)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Selected node detail */}
      {selectedNode && <NodeDetail node={selectedNode} />}
    </div>
  )
}
