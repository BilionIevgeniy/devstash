import { ItemDrawerProvider } from "@/features/items/components/drawer/ItemDrawerProvider";
import { typePagePath } from "@/features/item-types/domain/item-type";

// The provider wraps both slots: the list's cards open items by URL, and the
// intercepted drawer in @drawer hides a deleted card through the same context.
export default async function ItemsByTypeLayout({
  params,
  children,
  drawer,
}: LayoutProps<"/items/[type]">) {
  const { type } = await params;

  return (
    <ItemDrawerProvider basePath={typePagePath(type)}>
      {children}
      {drawer}
    </ItemDrawerProvider>
  );
}
