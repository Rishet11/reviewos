// Public, unauthenticated privacy policy page served at /privacy.
// Content mirrors docs/PRIVACY.md. Self-contained (inline styles) so it does not
// depend on Polaris/App Bridge, which are only for the embedded admin.

export const meta = () => [
  { title: "ReviewOS — Privacy Policy" },
  { name: "robots", content: "index" },
];

const wrap: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "3rem 1.25rem 5rem",
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  color: "#202223",
  lineHeight: 1.6,
};
const h1: React.CSSProperties = { fontSize: "1.9rem", margin: "0 0 0.25rem" };
const h2: React.CSSProperties = { fontSize: "1.2rem", margin: "2rem 0 0.5rem" };
const muted: React.CSSProperties = { color: "#6d7175", fontSize: "0.9rem" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", margin: "0.5rem 0", fontSize: "0.95rem" };
const th: React.CSSProperties = { textAlign: "left", borderBottom: "2px solid #e1e3e5", padding: "0.5rem 0.6rem", verticalAlign: "top" };
const td: React.CSSProperties = { borderBottom: "1px solid #e1e3e5", padding: "0.5rem 0.6rem", verticalAlign: "top" };

export default function Privacy() {
  return (
    <main style={wrap}>
      <h1 style={h1}>ReviewOS Privacy Policy</h1>
      <p style={muted}>Last updated: 2026-07-17</p>
      <p>
        This document explains what personal data ReviewOS collects when installed on a
        merchant&apos;s Shopify store, why, who else can see it, and how data subjects can
        exercise their rights.
      </p>

      <h2 style={h2}>1. Who this applies to</h2>
      <p>
        ReviewOS is a Shopify app installed by merchants (&quot;merchant,&quot; &quot;you&quot;) to collect and
        display product reviews. This policy covers personal data belonging to the merchant&apos;s
        customers (&quot;shoppers,&quot; &quot;reviewers&quot;) that passes through ReviewOS while the app operates
        on the merchant&apos;s store. ReviewOS is operated by a single developer with no employees;
        the contact below reaches the operator directly.
      </p>

      <h2 style={h2}>2. What we collect and why</h2>
      <table style={table}>
        <thead>
          <tr><th style={th}>Data</th><th style={th}>Source</th><th style={th}>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td style={td}>Customer email</td><td style={td}>Shopify order webhooks (<code>order.email</code> / <code>order.customer.email</code>)</td><td style={td}>Match a submitted review to a real order (&quot;verified buyer&quot; badge); send a post-purchase review-request email</td></tr>
          <tr><td style={td}>Shopify customer ID</td><td style={td}>Shopify order webhooks</td><td style={td}>Internal reference key for matching reviews to orders</td></tr>
          <tr><td style={td}>Order &amp; fulfillment state</td><td style={td}><code>orders/paid</code>, <code>orders/fulfilled</code>, <code>orders/cancelled</code> webhooks</td><td style={td}>Time review-request emails to send only after fulfillment, and determine eligibility</td></tr>
          <tr><td style={td}>Reviewer name, rating, review text</td><td style={td}>Submitted by the reviewer through the review form</td><td style={td}>Displayed as the review; the name shown is whatever the reviewer typed, not pulled from Shopify records</td></tr>
          <tr><td style={td}>Review images</td><td style={td}>Uploaded by the reviewer through the review form</td><td style={td}>Displayed alongside the review</td></tr>
        </tbody>
      </table>
      <p>
        Email and customer ID are the only protected customer data fields ReviewOS reads from
        Shopify. ReviewOS does not collect phone numbers, physical addresses, or payment data, and
        has no access to them. Review text is sent to Groq (see Sub-processors) to generate a
        cached AI summary, generated once and stored, not regenerated on every page view. ReviewOS
        does not sell personal data and does not use it for automated decisions with legal or
        similarly significant effects.
      </p>

      <h2 style={h2}>3. Legal basis and purpose limitation</h2>
      <p>
        Data is processed only to run the reviews feature the merchant has installed: verifying
        reviewers as real buyers, sending review-request emails the merchant configured, and
        displaying reviews and summaries on the merchant&apos;s storefront. The basis is the
        merchant&apos;s need to perform the service under its own agreement with its customers, and
        (for review-request emails) the customer&apos;s transactional relationship with the merchant,
        combined with an unsubscribe mechanism. Only the fields listed above are read from Shopify.
      </p>

      <h2 style={h2}>4. Sub-processors</h2>
      <table style={table}>
        <thead><tr><th style={th}>Sub-processor</th><th style={th}>What it handles</th></tr></thead>
        <tbody>
          <tr><td style={td}>Render</td><td style={td}>Hosts the ReviewOS web application</td></tr>
          <tr><td style={td}>Neon</td><td style={td}>Managed PostgreSQL in production; stores reviews, order-matching data, cached summaries. Encrypts at rest with automated encrypted backups</td></tr>
          <tr><td style={td}>Cloudflare R2</td><td style={td}>Stores review images. Encrypts at rest</td></tr>
          <tr><td style={td}>Resend</td><td style={td}>Delivers transactional review-request emails</td></tr>
          <tr><td style={td}>Groq</td><td style={td}>Receives review text to generate AI summaries; summaries are cached, not regenerated per page load</td></tr>
        </tbody>
      </table>
      <p>All data in transit between ReviewOS and these providers, and between ReviewOS and Shopify, moves over HTTPS/TLS.</p>

      <h2 style={h2}>5. Data subject rights</h2>
      <p>
        Shoppers can exercise their rights through Shopify&apos;s standard GDPR/CCPA compliance
        mechanism, which ReviewOS implements at <code>/webhooks/compliance</code>:
      </p>
      <ul>
        <li><strong>Access request</strong> (<code>customers/data_request</code>): ReviewOS locates stored data tied to the customer and returns it per the webhook contract.</li>
        <li><strong>Customer redaction</strong> (<code>customers/redact</code>): ReviewOS deletes or anonymizes the customer&apos;s email, customer ID, and any personal data tied to that customer.</li>
        <li><strong>Shop redaction</strong> (<code>shop/redact</code>): sent after uninstall plus the required waiting period; ReviewOS deletes the shop&apos;s stored data.</li>
      </ul>
      <p>
        Shoppers who no longer want review-request emails can opt out via the signed unsubscribe
        link in every email, handled at <code>/api/review-requests/unsubscribe</code>. Requests can
        also be sent directly to the contact below.
      </p>

      <h2 style={h2}>6. Data retention</h2>
      <p>
        Reviewer content is kept while the review is published and the app remains installed;
        email/customer-ID data used for verification and review requests is kept only as long as
        needed for that purpose and is deleted on redaction request; all categories are purged on
        the relevant Shopify compliance webhook.
      </p>

      <h2 style={h2}>7. Merchant data processing terms</h2>
      <ul>
        <li><strong>Roles.</strong> The merchant is the data controller; ReviewOS acts as a data processor, processing personal data only to provide the reviews service as configured by the merchant.</li>
        <li><strong>Instructions.</strong> ReviewOS processes personal data solely to operate the features the merchant has installed (review collection, verified-buyer matching, review-request emails, AI summaries, widget display), and for no other purpose.</li>
        <li><strong>Sub-processors.</strong> ReviewOS uses the sub-processors in Section 4; the merchant consents to their use for these purposes.</li>
        <li><strong>Deletion.</strong> ReviewOS deletes shop data on <code>shop/redact</code> and a specific customer&apos;s data on <code>customers/redact</code>.</li>
        <li><strong>Security.</strong> Encryption in transit and at rest; access limited to the app operator.</li>
      </ul>

      <h2 style={h2}>8. Contact</h2>
      <p>
        Privacy questions, access requests, or deletion requests:{" "}
        <a href="mailto:rishetmehra11@gmail.com">rishetmehra11@gmail.com</a>.
      </p>
    </main>
  );
}
