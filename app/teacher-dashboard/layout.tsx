import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import TeacherSidebar from "@/components/TeacherSidebar";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen">
      <div className="flex min-h-screen">
        <TeacherSidebar user={session.user || {}} />
        <main className="ml-72 flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
