import type { Metadata } from "next";
// Primer design tokens (CSS custom properties). `primitives.css` covers
// size/typography/spacing; the theme files define the color tokens
// (--bgColor-default, --fgColor-muted, ...) scoped to [data-color-mode].
import "@primer/primitives/dist/css/primitives.css";
import "@primer/primitives/dist/css/functional/themes/light.css";
import "@primer/primitives/dist/css/functional/themes/dark.css";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "GitPager",
  description: "GitHub-flavoured on-call scheduling & incident response",
};

// Applies the persisted color-mode preference to <html> before first paint to
// avoid a flash of the wrong theme. Falls back to "auto" (follows the OS).
const NO_FLASH_SCRIPT = `(function(){try{var m=localStorage.getItem('gitpager-color-mode');if(m==='day')m='light';if(m==='night')m='dark';document.documentElement.setAttribute('data-color-mode',(m==='light'||m==='dark')?m:'auto');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-color-mode="auto"
      data-light-theme="light"
      data-dark-theme="dark"
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
