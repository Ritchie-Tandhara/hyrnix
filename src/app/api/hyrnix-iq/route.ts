import { NextResponse } from "next/server";
import { askHyrnixIq, supportedQuestionPatterns } from "@/lib/hyrnixIq";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const history = await prisma.hyrnixQuery.findMany({
    orderBy: { timestamp: "desc" },
    take: 50,
    include: { askedBy: true },
  });
  return NextResponse.json({ history, supportedQuestions: supportedQuestionPatterns() });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.question || typeof body.question !== "string") {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }
  const answer = await askHyrnixIq(body.question, body.askedById || undefined);
  return NextResponse.json({ answer });
}
