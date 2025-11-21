/**
 * Shared layout component.
 */

'use client';

import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Layout component with header and main content area.
 * TODO: Add navigation, header, and footer
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <Header />
      <main className="main-content">{children}</main>
      {/* TODO: Add Footer component */}
    </div>
  );
}
