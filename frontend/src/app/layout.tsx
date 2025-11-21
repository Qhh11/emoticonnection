/**
 * Root layout component for EmotiConnect.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EmotiConnect',
  description: 'Emotion-aware social communication platform',
};

/**
 * Root layout wrapper.
 *
 * TODO:
 * - Add global styles
 * - Add context providers (Auth, Emotion, Chat)
 * - Add global navigation
 * - Add notification system
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* TODO: Wrap with context providers */}
        {/* TODO: Add Header component */}
        <main>{children}</main>
        {/* TODO: Add Footer component */}
      </body>
    </html>
  );
}
