import { getSession } from "@/lib/auth";
import { StudentHome } from "@/components/StudentHome";

export default async function StudentHomePage() {
  const user = await getSession();

  return (
    <StudentHome
      firstName={user?.fullName.split(" ")[0] || ""}
      department={user?.department}
      stage={user?.stage}
    />
  );
}
