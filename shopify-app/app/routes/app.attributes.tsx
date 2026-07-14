import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { prisma } from "../services/db.server";
import {
  createAttributeDefinition,
  deleteAttributeDefinition,
  listAttributeDefinitions,
  updateAttributeDefinition,
} from "../services/attributes.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const definitions = await listAttributeDefinitions(session.shop);
  const categoryRows = await prisma.product.findMany({
    where: { shop: session.shop },
    select: { category: true },
    distinct: ["category"],
  });
  const categories = categoryRows.map((c) => c.category);

  return { definitions, categories };
};

function parseOptions(raw: string): string[] {
  return raw
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Prisma unique-constraint violation (P2002) — surfaced as a friendly error
// instead of an unhandled 500 (AttributeDefinition is @@unique on category+key).
function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const form = await request.formData();
  const intent = String(form.get("intent"));

  switch (intent) {
    case "attr-create": {
      const productCategory = String(form.get("productCategory") ?? "").trim();
      const key = String(form.get("key") ?? "").trim();
      const label = String(form.get("label") ?? "").trim();
      const options = parseOptions(String(form.get("options") ?? ""));
      const display = form.get("display") === "on";

      if (!productCategory || !key || !label) {
        return { error: "Category, key, and label are required" };
      }

      try {
        await createAttributeDefinition(session.shop, {
          productCategory,
          key,
          label,
          options,
          display,
        });
      } catch (e) {
        if (isUniqueViolation(e)) {
          return { error: `An attribute "${key}" already exists for category "${productCategory}"` };
        }
        throw e;
      }
      return { ok: true };
    }
    case "attr-update": {
      const id = String(form.get("id"));
      const productCategory = String(form.get("productCategory") ?? "").trim();
      const key = String(form.get("key") ?? "").trim();
      const label = String(form.get("label") ?? "").trim();
      const options = parseOptions(String(form.get("options") ?? ""));
      const display = form.get("display") === "on";

      if (!productCategory || !key || !label) {
        return { error: "Category, key, and label are required" };
      }

      try {
        const updated = await updateAttributeDefinition(session.shop, id, {
          productCategory,
          key,
          label,
          options,
          display,
        });
        if (!updated) return { error: "Attribute not found" };
      } catch (e) {
        if (isUniqueViolation(e)) {
          return { error: `An attribute "${key}" already exists for category "${productCategory}"` };
        }
        throw e;
      }
      return { ok: true };
    }
    case "attr-delete": {
      const id = String(form.get("id"));
      const deleted = await deleteAttributeDefinition(session.shop, id);
      if (!deleted) return { error: "Attribute not found" };
      return { ok: true };
    }
    default:
      return { error: `Unknown intent: ${intent}` };
  }
};

type Definition = Awaited<ReturnType<typeof listAttributeDefinitions>>[number];

function AttributeRow({ def }: { def: Definition }) {
  const [editing, setEditing] = useState(false);
  const updateFetcher = useFetcher<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (updateFetcher.data && "ok" in updateFetcher.data && updateFetcher.data.ok) {
      shopify.toast.show("Attribute saved");
      setEditing(false);
    }
  }, [updateFetcher.data, shopify]);

  useEffect(() => {
    if (deleteFetcher.data && "ok" in deleteFetcher.data && deleteFetcher.data.ok) {
      shopify.toast.show("Attribute deleted");
    }
  }, [deleteFetcher.data, shopify]);

  if (editing) {
    return (
      <s-box padding="base" borderWidth="base" borderRadius="base">
        <updateFetcher.Form method="post">
          <input type="hidden" name="intent" value="attr-update" />
          <input type="hidden" name="id" value={def.id} />
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Product category"
              name="productCategory"
              defaultValue={def.productCategory}
              required
            ></s-text-field>
            <s-text-field label="Key" name="key" defaultValue={def.key} required></s-text-field>
            <s-text-field
              label="Label"
              name="label"
              defaultValue={def.label}
              required
            ></s-text-field>
            <s-text-area
              label="Options (one per line or comma-separated)"
              name="options"
              rows={3}
              defaultValue={def.options.join("\n")}
            ></s-text-area>
            <s-checkbox label="Show in filters" name="display" defaultChecked={def.display}></s-checkbox>
            <s-stack direction="inline" gap="base">
              <s-button
                variant="primary"
                type="submit"
                {...(updateFetcher.state !== "idle" ? { loading: true } : {})}
              >
                Save
              </s-button>
              <s-button variant="tertiary" onClick={() => setEditing(false)}>
                Cancel
              </s-button>
            </s-stack>
          </s-stack>
        </updateFetcher.Form>
      </s-box>
    );
  }

  return (
    <s-box
      padding="base"
      borderWidth="base"
      borderRadius="base"
      background="subdued"
    >
      <s-stack direction="block" gap="small">
        <s-stack direction="inline" gap="base" alignItems="center">
          <s-badge tone="info">{def.productCategory}</s-badge>
          <s-text type="strong">{def.label}</s-text>
          <s-text color="subdued">({def.key})</s-text>
          {!def.display && <s-badge tone="warning">hidden</s-badge>}
        </s-stack>
        <s-text color="subdued">
          Options: {def.options.length > 0 ? def.options.join(", ") : "—"}
        </s-text>
        <s-stack direction="inline" gap="base">
          <s-button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </s-button>
          <deleteFetcher.Form method="post">
            <input type="hidden" name="intent" value="attr-delete" />
            <input type="hidden" name="id" value={def.id} />
            <s-button
              variant="secondary"
              tone="critical"
              type="submit"
              {...(deleteFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Delete
            </s-button>
          </deleteFetcher.Form>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

export default function Attributes() {
  const { definitions, categories } = useLoaderData<typeof loader>();
  const createFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (createFetcher.data && "ok" in createFetcher.data && createFetcher.data.ok) {
      shopify.toast.show("Attribute created");
    }
  }, [createFetcher.data, shopify]);

  return (
    <s-page heading="Attributes">
      <s-section heading="Attribute definitions">
        <s-stack direction="block" gap="base">
          {definitions.length === 0 && (
            <s-paragraph color="subdued">No attributes defined yet.</s-paragraph>
          )}
          {definitions.map((def) => (
            <AttributeRow key={def.id} def={def} />
          ))}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="New attribute">
        <createFetcher.Form method="post">
          <input type="hidden" name="intent" value="attr-create" />
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Product category"
              name="productCategory"
              placeholder={categories[0] ?? "e.g. apparel"}
              required
            ></s-text-field>
            <s-text-field
              label="Key"
              name="key"
              placeholder="e.g. fit"
              required
            ></s-text-field>
            <s-text-field
              label="Label"
              name="label"
              placeholder="e.g. Fit"
              required
            ></s-text-field>
            <s-text-area
              label="Options (one per line or comma-separated)"
              name="options"
              rows={3}
              placeholder={"Runs small\nTrue to size\nRuns large"}
            ></s-text-area>
            <s-checkbox label="Show in filters" name="display" defaultChecked></s-checkbox>
            <s-button
              variant="primary"
              type="submit"
              {...(createFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Add attribute
            </s-button>
          </s-stack>
        </createFetcher.Form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
