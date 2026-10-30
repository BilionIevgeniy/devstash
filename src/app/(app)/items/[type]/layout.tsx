import { ItemDrawerProvider } from "@/features/items/components/ItemDrawerProvider";

// The provider wraps both slots: the list's cards open items by URL, and the
// intercepted drawer in @drawer hides a deleted card through the same context.
export default async function ItemsByTypeLayout({
  params,
  children,
  drawer,
}: LayoutProps<"/items/[type]">) {
  const { type } = await params;

  return (
    <ItemDrawerProvider basePath={`/items/${type}`}>
      {children}
      {drawer}
    </ItemDrawerProvider>
  );
}
