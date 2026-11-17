import { ItemRouteDrawer } from "@/features/items/components/drawer/ItemRouteDrawer";

export default function ItemDrawerLayout({
  children,
}: LayoutProps<"/items/[type]/[id]">) {
  return <ItemRouteDrawer>{children}</ItemRouteDrawer>;
}
