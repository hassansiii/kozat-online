import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { PendingContent } from "@/components/PendingContent";

export default async function PendingPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.status === "APPROVED") redirect("/student");

  return (
    <div className="min-h-screen">
      <SiteHeader user={user} />
      <PendingContent
        firstName={user.fullName.split(" ")[0]}
        department={user.department}
        stage={user.stage}
      />
    </div>
  );
}
