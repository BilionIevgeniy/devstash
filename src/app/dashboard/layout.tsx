import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return <DashboardShell sidebar={<Sidebar />}>{children}</DashboardShell>;
}
