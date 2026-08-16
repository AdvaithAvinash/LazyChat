import type { Metadata } from 'next';

import Providers from '@/app/providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'LazyChat',
  description: 'Real-time messaging, voice and video calls.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
