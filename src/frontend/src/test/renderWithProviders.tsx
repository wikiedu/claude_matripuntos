import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string                    // p.ej. "/home/activities/abc"
  path?: string                     // p.ej. "/home/activities/:id" — cuando el componente usa useParams
  queryClient?: QueryClient
}

export function renderWithProviders(ui: ReactElement, opts: Options = {}) {
  const {
    route = '/',
    path,
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    }),
    ...rtlOpts
  } = opts

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {path ? (
          <Routes>
            <Route path={path} element={children} />
          </Routes>
        ) : (
          children
        )}
      </MemoryRouter>
    </QueryClientProvider>
  )

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...rtlOpts }) }
}
