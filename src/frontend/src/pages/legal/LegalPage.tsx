// v1.6.1 — Wrapper genérico que renderiza un markdown legal desde
// docs/legal/. Usa Vite ?raw imports para cargar el contenido al build,
// + react-markdown con remark-gfm para soportar tablas y autolinks.

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Footer } from '../../components/Footer'

interface Props {
  slug: 'privacy' | 'terms' | 'cookies'
  title: string
}

export function LegalPage({ slug, title }: Props) {
  const [content, setContent] = useState<string>('Cargando...')
  const nav = useNavigate()

  useEffect(() => {
    // Vite resuelve ?raw imports en build. Si el archivo no existe, fallback.
    import(/* @vite-ignore */ `../../../../../docs/legal/${slug}.md?raw`)
      .then((m: any) => setContent(m.default ?? 'No se pudo cargar.'))
      .catch(() => setContent('No se pudo cargar el documento. Contacta soporte.'))
  }, [slug])

  return (
    <div className="min-h-screen bg-[#0f0a1e] text-white">
      <header className="sticky top-0 z-10 bg-[rgba(15,10,30,0.95)] backdrop-blur-md border-b border-brd-subtle px-4 py-3 flex items-center gap-3">
        <button onClick={() => nav(-1)} aria-label="Atrás" className="text-white/80 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </header>
      <article className="max-w-2xl mx-auto px-4 py-6 prose prose-invert prose-sm prose-headings:text-white prose-strong:text-white prose-a:text-amber-400 prose-table:text-xs prose-th:text-white prose-th:bg-white/5 prose-td:border-white/10 prose-th:border-white/20">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </article>
      <Footer />
    </div>
  )
}
