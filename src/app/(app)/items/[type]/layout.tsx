import { TypeDrawerProvider } from "@/app/(app)/items/[type]/_components/TypeDrawerProvider";

// The provider wraps both slots: the list's cards open items by URL, and the
// intercepted drawer in @drawer hides a deleted card through the same context.
export default function ItemsByTypeLayout({
  children,
  drawer,
}: LayoutProps<"/items/[type]">) {
  return (
    <TypeDrawerProvider>
      {children}
      {drawer}
    </TypeDrawerProvider>
  );
}
