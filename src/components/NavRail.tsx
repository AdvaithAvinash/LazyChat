'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';

const links = [
  { href: '/chats', icon: '💬', label: 'Chats' },
  { href: '/new-chat', icon: '👥', label: 'New chat' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function NavRail() {
  const { profile } = useAuth();
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-16 shrink-0 flex-col items-center justify-between border-r border-border bg-surface py-5">
      <div className="flex flex-col items-center gap-4">
        {links.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg transition ${
                active ? 'bg-primary-muted' : 'hover:bg-surface-alt'
              }`}
            >
              {link.icon}
            </Link>
          );
        })}
      </div>

      {profile ? (
        <Link href="/profile" title="Profile">
          <Avatar name={profile.displayName} photoURL={profile.photoURL} size={36} />
        </Link>
      ) : null}
    </nav>
  );
}
