import { voteHelpful } from "~/services/reviews.server";

export async function action({
  params,
  request,
}: {
  params: { id: string };
  request: Request;
}) {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const review = await voteHelpful(params.id);
  if (!review) {
    return Response.json({ error: "review_not_found" }, { status: 404 });
  }
  return Response.json({ review });
}
