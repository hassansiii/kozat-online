import { prisma } from "@/lib/prisma";

export async function gradeAndSubmitAttempt(
  attemptId: string,
  reason: "manual" | "timeout" | "violations" = "timeout"
) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: true,
      exam: { include: { questions: { include: { choices: true } } } },
    },
  });

  if (!attempt) return null;
  if (attempt.status !== "IN_PROGRESS") return attempt;

  let score = 0;
  const maxScore = attempt.exam.questions.reduce((s, q) => s + q.points, 0);

  for (const question of attempt.exam.questions) {
    const answer = attempt.answers.find((a) => a.questionId === question.id);
    const correct = question.choices.find((c) => c.isCorrect);
    if (answer?.choiceId && correct && answer.choiceId === correct.id) {
      score += question.points;
    }
  }

  const status =
    reason === "timeout" || reason === "violations"
      ? "AUTO_SUBMITTED"
      : "SUBMITTED";

  return prisma.attempt.update({
    where: { id: attempt.id },
    data: {
      status,
      score,
      maxScore,
      submittedAt: new Date(),
    },
  });
}

export async function autoSubmitIfExpired(attemptId: string) {
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.status !== "IN_PROGRESS") return attempt;
  if (new Date() <= attempt.endsAt) return attempt;
  return gradeAndSubmitAttempt(attemptId, "timeout");
}

export async function ensureAttemptStillOpen(attemptId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { exam: true },
  });
  if (!attempt) return { attempt: null, closed: true as const, reason: "missing" };
  if (attempt.status !== "IN_PROGRESS") {
    return { attempt, closed: true as const, reason: "already" };
  }
  if (new Date() > attempt.endsAt) {
    const closed = await gradeAndSubmitAttempt(attemptId, "timeout");
    return { attempt: closed, closed: true as const, reason: "timeout" };
  }
  if (attempt.violationCount >= attempt.exam.maxViolations) {
    const closed = await gradeAndSubmitAttempt(attemptId, "violations");
    return { attempt: closed, closed: true as const, reason: "violations" };
  }
  return { attempt, closed: false as const, reason: null };
}

/** Deterministic shuffle from a seed string */
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type QuestionOrderItem = {
  questionId: string;
  choiceIds: string[];
};
