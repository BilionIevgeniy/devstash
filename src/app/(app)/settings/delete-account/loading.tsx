import { Skeleton } from "@/components/ui/skeleton";

// The size of DeletionNotice with its title, two lines of text and a button.
export default function DeleteAccountLoading() {
  return <Skeleton className="h-48 max-w-xl rounded-lg" />;
}
