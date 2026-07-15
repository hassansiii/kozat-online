"use client";

import { PreferencesProvider } from "@/components/PreferencesProvider";
import { SiteTheme } from "@/components/SiteTheme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <SiteTheme />
      {children}
    </PreferencesProvider>
  );
}
