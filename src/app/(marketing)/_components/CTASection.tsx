import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
} from "@/features/billing/domain/limits";

import { ScrollFadeIn } from "./ScrollFadeIn";

export function CTASection() {
  return (
    <section className="marketing-section text-center">
      <ScrollFadeIn className="marketing-container">
        <h2 className="marketing-h2 gradient-text mx-auto w-fit">
          Ready to Organize Your Knowledge?
        </h2>
        <p className="marketing-lead mt-4 mb-8">
          Start free with {FREE_ITEM_LIMIT} items and {FREE_COLLECTION_LIMIT}{" "}
          collections.
        </p>
        <Button asChild size="lg" className="h-11 px-5 text-[15px]">
          <Link href="/register">Get Started Free</Link>
        </Button>
      </ScrollFadeIn>
    </section>
  );
}
