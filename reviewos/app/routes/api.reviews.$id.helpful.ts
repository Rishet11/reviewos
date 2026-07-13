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
  return Response.json({ review });
}
