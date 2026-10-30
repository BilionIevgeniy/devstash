import { ItemRouteDrawer } from "@/features/items/components/ItemRouteDrawer";

export default function ItemDrawerLayout({
  children,
}: LayoutProps<"/items/[type]/[id]">) {
  return <ItemRouteDrawer>{children}</ItemRouteDrawer>;
}
