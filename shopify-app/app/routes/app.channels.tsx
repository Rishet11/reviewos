// Slice 5: merchant-facing WhatsApp channel setup. Pro-gated (enabling the
// channel or setting channelPreference="whatsapp" requires an active plan) -
// free merchants can still fill in connection details but can't turn it on.

import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getPlan } from "../services/entitlements.server";
import { getSetting, setSetting } from "../services/settings.server";
import { prisma } from "../services/db.server";
import { encryptSecret, deriveVerifyToken } from "../services/crypto.server";
import { sendWhatsApp } from "../services/channels/whatsapp.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  const [plan, connection, channelPreference] = await Promise.all([
    getPlan(billing),
    prisma.whatsAppConnection.findUnique({ where: { shop } }),
    getSetting(shop, "channelPreference"),
  ]);

  const appUrl = process.env.SHOPIFY_APP_URL || "";

  return {
    plan,
    channelPreference: channelPreference ?? "email",
    webhookUrl: `${appUrl}/webhooks/whatsapp`,
    verifyToken: deriveVerifyToken(shop),
    connection: connection
      ? {
          phoneNumberId: connection.phoneNumberId,
          wabaId: connection.wabaId,
          appId: connection.appId,
          templateName: connection.templateName,
          templateLanguage: connection.templateLanguage,
          templateVarOrder: connection.templateVarOrder,
          enabled: connection.enabled,
          // Secrets are never echoed back - the form just shows they're set.
          hasAppSecret: true,
          hasAccessToken: true,
        }
      : null,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  const form = await request.formData();
  const intent = String(form.get("intent"));

  switch (intent) {
    case "save-connection": {
      const phoneNumberId = String(form.get("phoneNumberId") ?? "").trim();
      const wabaId = String(form.get("wabaId") ?? "").trim();
      const appId = String(form.get("appId") ?? "").trim();
      const appSecret = String(form.get("appSecret") ?? "").trim();
      const accessToken = String(form.get("accessToken") ?? "").trim();
      const templateName = String(form.get("templateName") ?? "").trim();
      const templateLanguage = String(form.get("templateLanguage") ?? "en").trim() || "en";
      const templateVarOrder = String(form.get("templateVarOrder") ?? "").trim();

      if (!phoneNumberId || !wabaId || !appId || !templateName || !templateVarOrder) {
        return { error: "All connection fields are required" };
      }
      try {
        JSON.parse(templateVarOrder);
      } catch {
        return { error: "Template variable order must be valid JSON, e.g. [\"customerName\"]" };
      }

      const existing = await prisma.whatsAppConnection.findUnique({ where: { shop } });
      if (!existing && (!appSecret || !accessToken)) {
        return { error: "App secret and access token are required for a new connection" };
      }

      await prisma.whatsAppConnection.upsert({
        where: { shop },
        update: {
          phoneNumberId,
          wabaId,
          appId,
          templateName,
          templateLanguage,
          templateVarOrder,
          ...(appSecret ? { appSecretEnc: encryptSecret(appSecret) } : {}),
          ...(accessToken ? { accessTokenEnc: encryptSecret(accessToken) } : {}),
        },
        create: {
          shop,
          phoneNumberId,
          wabaId,
          appId,
          templateName,
          templateLanguage,
          templateVarOrder,
          appSecretEnc: encryptSecret(appSecret),
          accessTokenEnc: encryptSecret(accessToken),
        },
      });

      return { ok: true };
    }
    case "set-enabled": {
      const enabled = form.get("enabled") === "true";
      if (enabled) {
        const plan = await getPlan(billing);
        if (plan !== "pro") {
          return { error: "WhatsApp is a Pro plan feature" };
        }
      }
      const updated = await prisma.whatsAppConnection.updateMany({ where: { shop }, data: { enabled } });
      if (updated.count === 0) {
        return { error: "Save your WhatsApp connection before enabling it" };
      }
      return { ok: true };
    }
    case "set-preference": {
      const preference = String(form.get("channelPreference") ?? "email");
      if (preference === "whatsapp") {
        const plan = await getPlan(billing);
        if (plan !== "pro") {
          return { error: "WhatsApp is a Pro plan feature" };
        }
      }
      await setSetting(shop, "channelPreference", preference);
      return { ok: true };
    }
    case "test-send": {
      const plan = await getPlan(billing);
      if (plan !== "pro") {
        return { error: "WhatsApp is a Pro plan feature" };
      }
      const to = String(form.get("testPhone") ?? "").trim();
      if (!to) return { error: "Enter a phone number to test" };
      const result = await sendWhatsApp({
        shop,
        to,
        customerName: "Test customer",
        productName: "Test product",
        reviewUrl: `https://${shop}/products/test-product`,
        unsubscribeUrl: `https://${shop}/unsubscribe`,
      });
      return { testResult: result };
    }
    default:
      return { error: `Unknown intent: ${intent}` };
  }
};

export default function Channels() {
  const { plan, channelPreference, webhookUrl, verifyToken, connection } =
    useLoaderData<typeof loader>();
  const isPro = plan === "pro";
  const shopify = useAppBridge();

  const connectionFetcher = useFetcher<typeof action>();
  const enabledFetcher = useFetcher<typeof action>();
  const preferenceFetcher = useFetcher<typeof action>();
  const testFetcher = useFetcher<typeof action>();

  useEffect(() => {
    if (connectionFetcher.data && "ok" in connectionFetcher.data && connectionFetcher.data.ok) {
      shopify.toast.show("WhatsApp connection saved");
    }
    if (connectionFetcher.data && "error" in connectionFetcher.data) {
      shopify.toast.show(connectionFetcher.data.error as string, { isError: true });
    }
  }, [connectionFetcher.data, shopify]);

  useEffect(() => {
    if (enabledFetcher.data && "error" in enabledFetcher.data) {
      shopify.toast.show(enabledFetcher.data.error as string, { isError: true });
    }
  }, [enabledFetcher.data, shopify]);

  useEffect(() => {
    if (preferenceFetcher.data && "error" in preferenceFetcher.data) {
      shopify.toast.show(preferenceFetcher.data.error as string, { isError: true });
    }
  }, [preferenceFetcher.data, shopify]);

  return (
    <s-page heading="Channels">
      <s-section heading="WhatsApp (BYO Meta Cloud API)">
        <s-stack direction="block" gap="base">
          <s-paragraph color="subdued">
            Getting customer opt-in/consent for WhatsApp messages is your responsibility as the
            merchant. Only customers who shared a phone number with an order are ever messaged,
            and anyone who replies STOP or UNSUBSCRIBE is suppressed automatically.
          </s-paragraph>

          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="base">
              <s-text type="strong">Webhook callback URL (paste into Meta App Dashboard)</s-text>
              <s-text>{webhookUrl}</s-text>
              <s-text type="strong">Verify token</s-text>
              <s-text>{verifyToken}</s-text>
            </s-stack>
          </s-box>

          <connectionFetcher.Form method="post">
            <input type="hidden" name="intent" value="save-connection" />
            <s-stack direction="block" gap="base">
              <s-text-field
                label="Phone number ID"
                name="phoneNumberId"
                defaultValue={connection?.phoneNumberId ?? ""}
                required
              ></s-text-field>
              <s-text-field
                label="WABA ID"
                name="wabaId"
                defaultValue={connection?.wabaId ?? ""}
                required
              ></s-text-field>
              <s-text-field
                label="Meta app ID"
                name="appId"
                defaultValue={connection?.appId ?? ""}
                required
              ></s-text-field>
              <s-text-field
                label={connection?.hasAppSecret ? "App secret (saved, enter to replace)" : "App secret"}
                name="appSecret"
                placeholder={connection?.hasAppSecret ? "••••••••" : ""}
              ></s-text-field>
              <s-text-field
                label={connection?.hasAccessToken ? "Access token (saved, enter to replace)" : "Access token"}
                name="accessToken"
                placeholder={connection?.hasAccessToken ? "••••••••" : ""}
              ></s-text-field>
              <s-text-field
                label="Template name"
                name="templateName"
                defaultValue={connection?.templateName ?? ""}
                required
              ></s-text-field>
              <s-text-field
                label="Template language"
                name="templateLanguage"
                defaultValue={connection?.templateLanguage ?? "en"}
              ></s-text-field>
              <s-text-field
                label="Template variable order (JSON array)"
                name="templateVarOrder"
                defaultValue={connection?.templateVarOrder ?? ""}
                placeholder='["customerName","productName","reviewUrl"]'
                required
              ></s-text-field>
              <s-button
                variant="primary"
                type="submit"
                {...(connectionFetcher.state !== "idle" ? { loading: true } : {})}
              >
                Save connection
              </s-button>
            </s-stack>
          </connectionFetcher.Form>

          {connection && (
            <enabledFetcher.Form method="post">
              <input type="hidden" name="intent" value="set-enabled" />
              <input type="hidden" name="enabled" value={connection.enabled ? "false" : "true"} />
              <s-stack direction="inline" gap="base" alignItems="center">
                <s-badge tone={connection.enabled ? "success" : "neutral"}>
                  {connection.enabled ? "Enabled" : "Disabled"}
                </s-badge>
                <s-button
                  variant="secondary"
                  type="submit"
                  disabled={!isPro}
                  {...(enabledFetcher.state !== "idle" ? { loading: true } : {})}
                >
                  {connection.enabled ? "Disable" : "Enable"}
                </s-button>
                {!isPro && (
                  <s-paragraph color="subdued">Upgrade to Pro to enable WhatsApp.</s-paragraph>
                )}
              </s-stack>
            </enabledFetcher.Form>
          )}

          <preferenceFetcher.Form method="post">
            <input type="hidden" name="intent" value="set-preference" />
            <s-stack direction="inline" gap="base" alignItems="end">
              <s-select
                label="Preferred channel for new review requests"
                name="channelPreference"
                value={channelPreference}
                disabled={!isPro}
              >
                <s-option value="email">Email</s-option>
                <s-option value="whatsapp">WhatsApp (falls back to email without a phone)</s-option>
              </s-select>
              <s-button
                variant="secondary"
                type="submit"
                disabled={!isPro}
                {...(preferenceFetcher.state !== "idle" ? { loading: true } : {})}
              >
                Save preference
              </s-button>
            </s-stack>
            {!isPro && (
              <s-paragraph color="subdued">Upgrade to Pro to send review requests over WhatsApp.</s-paragraph>
            )}
          </preferenceFetcher.Form>

          {connection && (
            <testFetcher.Form method="post">
              <input type="hidden" name="intent" value="test-send" />
              <s-stack direction="inline" gap="base" alignItems="end">
                <s-text-field label="Test phone number (E.164)" name="testPhone" placeholder="+15551234567"></s-text-field>
                <s-button
                  variant="secondary"
                  type="submit"
                  {...(testFetcher.state !== "idle" ? { loading: true } : {})}
                >
                  Send test message
                </s-button>
              </s-stack>
              {testFetcher.data && "testResult" in testFetcher.data && testFetcher.data.testResult && (
                <s-paragraph>
                  {testFetcher.data.testResult.ok
                    ? "Sent."
                    : `Failed: ${testFetcher.data.testResult.error}`}
                </s-paragraph>
              )}
            </testFetcher.Form>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
