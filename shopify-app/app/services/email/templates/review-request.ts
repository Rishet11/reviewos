// Phase 6 Slice C: pure template function, no I/O. Minimal inline-styled
// HTML (no <style> blocks - most email clients strip them), one CTA button,
// plain-text fallback, unsubscribe link in the footer.

export type ReviewRequestEmailArgs = {
  shopName: string;
  customerName?: string | null;
  productTitle: string;
  deepLinkUrl: string;
  unsubscribeUrl: string;
  cohort: string;
};

export function buildReviewRequestEmail({
  shopName,
  customerName,
  productTitle,
  deepLinkUrl,
  unsubscribeUrl,
  cohort,
}: ReviewRequestEmailArgs): { subject: string; html: string; text: string } {
  const name = customerName?.trim() || "there";

  const subject =
    cohort === "repeat"
      ? `You're back, how's the ${productTitle}?`
      : `How was your first order, ${name}?`;

  const greeting =
    cohort === "repeat"
      ? `Thanks for shopping with ${shopName} again.`
      : `Thanks for your first order with ${shopName}.`;

  const html = `
<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a;">
  <p style="font-size:16px;">Hi ${escapeHtml(name)},</p>
  <p style="font-size:16px;">${escapeHtml(greeting)} We'd love to hear what you think of:</p>
  <p style="font-size:18px;font-weight:600;">${escapeHtml(productTitle)}</p>
  <p style="margin:28px 0;">
    <a href="${deepLinkUrl}" style="background:#111827;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:15px;display:inline-block;">
      Write a review
    </a>
  </p>
  <p style="font-size:13px;color:#6b7280;">It only takes a minute, and your review helps other shoppers.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
  <p style="font-size:12px;color:#9ca3af;">
    Sent by ${escapeHtml(shopName)}.
    <a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe from review request emails</a>.
  </p>
</div>`.trim();

  const text = [
    `Hi ${name},`,
    "",
    `${greeting} We'd love to hear what you think of: ${productTitle}`,
    "",
    `Write a review: ${deepLinkUrl}`,
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
