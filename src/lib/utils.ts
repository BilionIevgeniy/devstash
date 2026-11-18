export { cn } from "cn";

// Names in the order a person reads them, case and accents aside. An explicit
// locale: the order must not depend on where the code runs.
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
