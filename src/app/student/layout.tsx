import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SideNav } from "@/components/SideNav";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.status !== "APPROVED") redirect("/pending");

  return (
    <div className="min-h-screen">
      <SiteHeader user={user} />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <SideNav role="STUDENT" />
        <div>{children}</div>
      </div>
    </div>
  );
}
