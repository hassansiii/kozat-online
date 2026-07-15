import { SiteHeader } from "@/components/SiteHeader";
import { getSession } from "@/lib/auth";
import { HomeContent } from "@/components/HomeContent";
import { SiteTheme } from "@/components/SiteTheme";
import { getSiteSettings } from "@/lib/site-settings";

export default async function HomePage() {
  const user = await getSession();
  let settings = null;
  try {
    settings = await getSiteSettings();
  } catch {
    settings = null;
  }

  return (
    <div className="min-h-screen">
      <SiteTheme
        initial={
          settings
            ? {
                primaryColor: settings.primaryColor,
                primaryDark: settings.primaryDark,
                accentColor: settings.accentColor,
              }
            : null
        }
      />
      <SiteHeader user={user} />
      <HomeContent
        isLoggedIn={Boolean(user)}
        role={user?.role}
        status={user?.status}
        initialSettings={settings}
      />
    </div>
  );
}
