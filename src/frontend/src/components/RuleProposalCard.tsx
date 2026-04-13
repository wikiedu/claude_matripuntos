// src/frontend/src/components/RuleProposalCard.tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'
import type { RuleProposal } from '../types'

interface Props {
  proposal: RuleProposal
  currentUserId: string
}

export function RuleProposalCard({ proposal, currentUserId }: Props) {
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')
  const [showReject, setShowReject] = useState(false)
  const isOwnProposal = proposal.proposedById === currentUserId

  const payload = (() => { try { return JSON.parse(proposal.payload) } catch { return {} } })()
  const description = payload.description || payload.name || `Cambio de ${proposal.type}`

  const respondMutation = useMutation({
    mutationFn: (status: 'accepted' | 'rejected') =>
      apiClient.rules.respond(proposal.id, { status, comment: comment || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] })
    }
  })

  return (
    <div className="rounded-xl p-3.5"
         style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
             style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)' }}>
          <span className="text-sm">👤</span>
        </div>
        <div>
          <p className="text-xs text-gray-300">
            <strong className="text-white">{proposal.proposedBy.name}</strong>{' '}
            propone {proposal.type === 'category' ? 'nueva categoría' : proposal.type === 'category_edit' ? 'cambio de categoría' : 'nueva regla'}
          </p>
        </div>
      </div>

      <p className="text-xs text-white leading-relaxed mb-2">{description}</p>

      {proposal.proposerComment && (
        <div className="rounded-lg px-2.5 py-2 mb-3 text-xs text-gray-400 italic"
             style={{ background: 'rgba(255,255,255,0.04)', borderLeft: '2px solid rgba(168,85,247,0.4)' }}>
          "{proposal.proposerComment}"
        </div>
      )}

      {!isOwnProposal && proposal.status === 'pending' && (
        <>
          {showReject && (
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Comentario opcional..."
              className="w-full text-xs rounded-lg px-2.5 py-2 mb-2 resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
              rows={2}
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => respondMutation.mutate('accepted')}
              disabled={respondMutation.isPending}
              className="flex-1 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              ✓ Aceptar
            </button>
            <button
              onClick={() => { if (showReject) { respondMutation.mutate('rejected') } else { setShowReject(true) } }}
              disabled={respondMutation.isPending}
              className="flex-1 py-2 rounded-lg text-xs disabled:opacity-50"
              style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              {showReject ? '✗ Confirmar rechazo' : '✗ Rechazar'}
            </button>
          </div>
        </>
      )}

      {isOwnProposal && proposal.status === 'pending' && (
        <p className="text-[10px] text-gray-500 text-center mt-1">Esperando respuesta de tu pareja…</p>
      )}

      {proposal.status !== 'pending' && (
        <div className={`text-xs text-center mt-1 font-semibold ${proposal.status === 'accepted' ? 'text-green-400' : 'text-red-400'}`}>
          {proposal.status === 'accepted' ? '✅ Aceptada' : '❌ Rechazada'}
          {proposal.responderComment && <span className="text-gray-400 font-normal"> · "{proposal.responderComment}"</span>}
        </div>
      )}
    </div>
  )
}
