import { createBrowserRouter } from 'react-router'
import { RootLayout } from '@/layouts/root-layout'
import { HomeRoute } from '@/routes/home'

/**
 * The route table — the app's list of screens and the layouts they sit in.
 *
 * This is React Router in "library mode": routes are plain data, and the app
 * builds to static files with no server behind it. That is the shape a native
 * wrapper needs when this is packaged for the App Store later.
 *
 * To add a screen: make a file in src/routes/, then add an entry to children.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [{ index: true, Component: HomeRoute }],
  },
])
