import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Unmount anything a test rendered, so one test's DOM can't leak into the next.
afterEach(cleanup)
