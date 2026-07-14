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
import { getAllSettings, setSetting } from "../services/settings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const settings = await getAllSettings();
  return { settings };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const form = await request.formData();
  const intent = String(form.get("intent"));

  switch (intent) {
    case "set-setting": {
      const key = String(form.get("key") ?? "").trim();
      const value = String(form.get("value") ?? "");
      if (!key) return { error: "Key is required" };
      await setSetting(key, value);
      return { ok: true };
    }
    default:
      return { error: `Unknown intent: ${intent}` };
  }
};

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const createFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (createFetcher.data && "ok" in createFetcher.data && createFetcher.data.ok) {
      shopify.toast.show("Setting saved");
    }
  }, [createFetcher.data, shopify]);

  return (
    <s-page heading="Settings">
      <s-section heading="Current settings">
        <s-stack direction="block" gap="base">
          {settings.length === 0 && (
            <s-paragraph color="subdued">No settings yet.</s-paragraph>
          )}
          {settings.map((setting) => (
            <SettingRow key={setting.id} settingKey={setting.key} value={setting.value} />
          ))}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Add or update a setting">
        <createFetcher.Form method="post">
          <input type="hidden" name="intent" value="set-setting" />
          <s-stack direction="block" gap="base">
            <s-text-field label="Key" name="key" required></s-text-field>
            <s-text-field label="Value" name="value"></s-text-field>
            <s-button
              variant="primary"
              type="submit"
              {...(createFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Save
            </s-button>
          </s-stack>
        </createFetcher.Form>
      </s-section>
    </s-page>
  );
}

function SettingRow({ settingKey, value }: { settingKey: string; value: string }) {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      shopify.toast.show("Setting saved");
    }
  }, [fetcher.data, shopify]);

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="set-setting" />
        <input type="hidden" name="key" value={settingKey} />
        <s-stack direction="inline" gap="base" alignItems="end">
          <s-text type="strong">{settingKey}</s-text>
          <s-text-field label="Value" labelAccessibilityVisibility="exclusive" name="value" defaultValue={value}></s-text-field>
          <s-button
            variant="secondary"
            type="submit"
            {...(fetcher.state !== "idle" ? { loading: true } : {})}
          >
            Update
          </s-button>
        </s-stack>
      </fetcher.Form>
    </s-box>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
