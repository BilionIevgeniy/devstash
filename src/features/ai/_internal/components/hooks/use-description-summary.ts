import { unstable_rethrow } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { useMountedRef } from "@/features/ai/_internal/components/hooks/use-mounted-ref";
import { generateSummary } from "@/features/ai/actions/summary";
import { AI_UNAVAILABLE_MESSAGE } from "@/features/ai/domain/messages";

const SUMMARY_READY_MESSAGE = "Summary ready";

// The summary of one form. It only changes the form when accepted, so nothing
// here is saved and nothing is optimistic. A new answer replaces the last one.
export function useDescriptionSummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Counts the answers, so the preview takes the focus once per answer.
  const [answerId, setAnswerId] = useState(0);
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useMountedRef();

  function generate(title: string, content: string) {
    startTransition(async () => {
      try {
        const result = await generateSummary({ title, content });
        if (!mountedRef.current) return;
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setSummary(result.data);
        setAnnouncement(SUMMARY_READY_MESSAGE);
        setAnswerId((current) => current + 1);
      } catch (error) {
        // A signed-out caller's redirect arrives here too, and must go on.
        unstable_rethrow(error);
        if (mountedRef.current) toast.error(AI_UNAVAILABLE_MESSAGE);
      }
    });
  }

  function clear() {
    setSummary(null);
    setAnnouncement("");
  }

  return {
    summary,
    announcement,
    answerId,
    isPending,
    buttonRef,
    generate,
    clear,
  };
}
