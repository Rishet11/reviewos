import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>ReviewOS</h1>
        <p className={styles.text}>
          AI-first product reviews for Shopify: filter-aware summaries,
          merchant-defined review attributes, and marketplace trust badges.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Filter-aware AI summaries</strong>. The review summary
            rewrites itself for the cohort a shopper selects, powered by your
            own custom review attributes.
          </li>
          <li>
            <strong>Marketplace trust badges</strong>. Show your Amazon,
            Flipkart, or Nykaa ratings on your own store, with link-outs.
          </li>
          <li>
            <strong>Verified reviews on autopilot</strong>. Post-purchase
            review requests, verified-buyer badges, photo and video uploads,
            and a full moderation queue.
          </li>
        </ul>
      </div>
    </div>
  );
}
