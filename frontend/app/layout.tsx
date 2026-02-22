import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./components/AuthProvider";

export const metadata: Metadata = {
  title: "DevDrill",
  description: "Интерактивная платформа практики для разработчиков",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initThemeScript = `
    (function() {
      try {
        var saved = localStorage.getItem('devdrill-theme-mode');
        var theme = saved === 'light' || saved === 'dark' ? saved : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  `;

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initThemeScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
