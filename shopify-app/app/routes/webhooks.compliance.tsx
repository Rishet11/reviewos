import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  collectCustomerData,
  redactCustomer,
  redactShop,
} from "../services/gdpr.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      await collectCustomerData(shop, {
        email: (payload as any)?.customer?.email,
      });
      break;
    case "CUSTOMERS_REDACT":
      await redactCustomer(shop, {
        email: (payload as any)?.customer?.email,
      });
      break;
    case "SHOP_REDACT":
      await redactShop(shop);
      break;
  }

  return new Response();
};
