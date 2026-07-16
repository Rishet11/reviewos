import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { type EntryContext, type HandleErrorFunction } from "react-router";
import { isbot } from "isbot";
import * as Sentry from "@sentry/react-router";
import { addDocumentResponseHeaders } from "./shopify.server";

// Server-only error reporting. A missing/empty SENTRY_DSN is a complete
// no-op: Sentry is never initialized and captureException is never called.
const SENTRY_DSN = process.env.SENTRY_DSN || "";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0,
  });
}

export const handleError: HandleErrorFunction = (error, { request }) => {
  if (!request.signal.aborted) {
    if (SENTRY_DSN) {
      Sentry.captureException(error);
    }
    console.error(error);
  }
};

export const streamTimeout = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext
) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? '')
    ? "onAllReady"
    : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
      />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (SENTRY_DSN) {
            Sentry.captureException(error);
          }
          console.error(error);
        },
      }
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}
