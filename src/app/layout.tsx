import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "كوزات أونلاين | Kozat Online",
  description: "منصة الاختبارات الإلكترونية للطلاب والدكاترة",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('kozat_lang')||'ar';var t=localStorage.getItem('kozat_theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var d=document.documentElement;d.lang=l;d.dir=l==='en'?'ltr':'rtl';d.dataset.theme=t;if(t==='dark')d.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
