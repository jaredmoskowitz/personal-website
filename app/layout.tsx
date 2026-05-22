import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import BootSequence from '@/app/(site)/_components/BootSequence';

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://jaredmoskowitz.com'),
  title: 'Jared Moskowitz',
  description: 'Senior iOS engineer. Building at Hinge + Moskowitz Labs.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scheme="amber" data-theme="light" className={jetBrainsMono.variable}>
      <head>
        {/* Prevent flash of wrong theme by reading localStorage before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var p = JSON.parse(localStorage.getItem('tm-prefs') || '{}');
            if (p.scheme) document.documentElement.setAttribute('data-scheme', p.scheme);
            if (p.theme)  document.documentElement.setAttribute('data-theme', p.theme);
          } catch(e) {}
        `}} />
      </head>
      <body>
        <ThemeProvider>
          <BootSequence />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
