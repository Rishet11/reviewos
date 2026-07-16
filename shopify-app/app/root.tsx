import type { ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// Outermost boundary: anything that escapes a route boundary lands here. Without
// this, React Router's default component renders a bare "${status} ${statusText}",
// which surfaced as a bold "200" in the embedded admin.
export function ErrorBoundary() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Something went wrong while loading the app.";

  return (
    <div style={{ padding: "2rem", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
        {"ReviewOS couldn't load"}
      </h1>
      <p style={{ color: "#616161" }}>{detail}</p>
      <p style={{ color: "#616161" }}>
        Try reloading. If it keeps happening, reopen the app from your Shopify
        admin.
      </p>
    </div>
  );
}
