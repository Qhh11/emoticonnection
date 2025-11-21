/**
 * Header component with navigation.
 */

'use client';

import Link from 'next/link';

/**
 * Header component.
 * TODO: Add navigation links, user menu, and notifications
 */
export function Header() {
  return (
    <header className="header">
      <nav>
        <Link href="/">Home</Link>
        <Link href="/chat">Chat</Link>
        <Link href="/posts">Posts</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/gifts">Gifts</Link>
      </nav>
      {/* TODO: Add user menu */}
      {/* TODO: Add notification bell */}
    </header>
  );
}
