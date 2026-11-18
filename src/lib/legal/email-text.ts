import { escapeHtml } from "@/lib/html";
import type { LegalBlock, PlainLegalDocument } from "@/lib/legal/types";

function blockHtml(block: LegalBlock): string {
  if (typeof block === "string") {
    return `<p style="margin:0 0 8px;line-height:1.5">${escapeHtml(block)}</p>`;
  }
  const items = block.items
    .map((item) => `<li style="margin:0 0 4px">${escapeHtml(item)}</li>`)
    .join("");
  return `<ul style="margin:0 0 8px;padding-left:20px;line-height:1.5">${items}</ul>`;
}

// A filled legal text as the HTML part of an email: the full text, so the
// email itself is the durable medium (§ 312f BGB).
export function legalTextHtml(document: PlainLegalDocument): string {
  const sections = document.sections
    .map(
      (section) =>
        `<h3 style="font-size:15px;margin:16px 0 8px">${escapeHtml(section.heading)}</h3>${section.blocks.map(blockHtml).join("")}`,
    )
    .join("");
  return `<h2 style="font-size:17px;margin:24px 0 8px">${escapeHtml(document.title)}</h2>${sections}`;
}

function blockText(block: LegalBlock): string {
  return typeof block === "string"
    ? block
    : block.items.map((item) => `- ${item}`).join("\n");
}

// The same text for the plain part of the email.
export function legalTextPlain(document: PlainLegalDocument): string {
  const sections = document.sections.map(
    (section) =>
      `${section.heading}\n\n${section.blocks.map(blockText).join("\n\n")}`,
  );
  return [document.title.toUpperCase(), ...sections].join("\n\n");
}
