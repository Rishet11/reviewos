// Slice 5: minimal channel abstraction so review-requests-dispatch.server.ts
// can send through email or WhatsApp (or a future channel) without branching
// on provider internals. Only WhatsApp implements this today - email keeps
// using sendEmail directly since its call shape (subject/html/text) doesn't
// fit this interface and there was no need to force it through one.
export interface ChannelProvider {
  key: string;
  send(args: {
    shop: string;
    to: string;
    customerName: string;
    productName: string;
    reviewUrl: string;
    unsubscribeUrl: string;
  }): Promise<{ ok: boolean; error?: string }>;
}
