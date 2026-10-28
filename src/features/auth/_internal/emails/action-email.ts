export interface ActionEmailCopy {
  subject: string;
  heading: string;
  intro: string;
  buttonLabel: string;
  ignoreNote: string;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatExpiry(expiresInHours: number): string {
  const unit = expiresInHours === 1 ? "hour" : "hours";
  return `This link expires in ${expiresInHours} ${unit}.`;
}

function buildActionHtml(
  copy: ActionEmailCopy,
  actionUrl: string,
  expiresInHours: number,
) {
  const url = escapeHtml(actionUrl);
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827">
  <h1 style="font-size:20px;margin:0 0 16px">${copy.heading}</h1>
  <p style="margin:0 0 24px;line-height:1.5">${copy.intro}.</p>
  <p style="margin:0 0 24px"><a href="${url}" style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px">${copy.buttonLabel}</a></p>
  <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.5">${formatExpiry(expiresInHours)} ${copy.ignoreNote}</p>
  <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all">${url}</p>
</div>`;
}

function buildActionText(
  copy: ActionEmailCopy,
  actionUrl: string,
  expiresInHours: number,
) {
  return `${copy.intro}:

${actionUrl}

${formatExpiry(expiresInHours)} ${copy.ignoreNote}`;
}

export function buildActionEmail(
  copy: ActionEmailCopy,
  actionUrl: string,
  expiresInHours: number,
): BuiltEmail {
  return {
    subject: copy.subject,
    html: buildActionHtml(copy, actionUrl, expiresInHours),
    text: buildActionText(copy, actionUrl, expiresInHours),
  };
}
