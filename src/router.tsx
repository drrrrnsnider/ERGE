import { createBrowserRouter } from 'react-router'
import { RootLayout } from '@/layouts/root-layout'
import { ExploreRoute } from '@/routes/explore'
import { NotBuiltRoute } from '@/routes/not-built'

/**
 * The route table — the app's list of screens and the layouts they sit in.
 *
 * This is React Router in "library mode": routes are plain data, and the app
 * builds to static files with no server behind it. That is the shape a native
 * wrapper needs when this is packaged for the App Store later.
 *
 * Explore is the only built screen. Everything else resolves to NotBuilt,
 * which shows the route and its filters — so a link like Popular Nearby's
 * `/search?near=me` visibly arrives somewhere with `near=me` set, rather than
 * dead-ending on a 404. Replacing one of these with a real screen is a
 * one-line change here, and every existing link keeps working.
 *
 * To add a screen: make a file in src/routes/, then add an entry to children.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: ExploreRoute },
      { path: '*', Component: NotBuiltRoute },
    ],
  },
])
