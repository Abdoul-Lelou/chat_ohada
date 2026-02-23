import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OHADA Legal Advisor - Thiam & Associés',
  description: 'AI-powered OHADA legal assistant for Guinea legal documentation and case matching.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased h-full overflow-hidden" suppressHydrationWarning>{children}</body>
    </html>
  );
}
