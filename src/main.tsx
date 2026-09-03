import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import '@/index.css'

/**
 * App entry point. Everything the whole app needs is switched on here, once:
 *
 *   StrictMode          React's development-only double-check for unsafe patterns
 *   QueryClientProvider makes the data cache available to every screen
 *   RouterProvider      renders whichever screen matches the current URL
 */
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('No #root element found in index.html')

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
