import type {
  BenchmarkGateStatus,
  BenchmarkMetaResponse,
  BenchmarkReleaseGate,
  BenchmarkRunEvaluation,
  BenchmarkRunHistoryItem,
  BenchmarkSuiteSummary,
} from "./types";

const PASS_PASS_RATE = 80;
const WATCH_PASS_RATE = 60;
const PASS_AVERAGE_SCORE = 80;
const WATCH_AVERAGE_SCORE = 70;
const WATCH_STALE_HOURS = 168;
const BLOCK_STALE_HOURS = 336;
const WATCH_PASS_RATE_DELTA = -10;
const BLOCK_PASS_RATE_DELTA = -20;
const WATCH_SCORE_DELTA = -8;
const BLOCK_SCORE_DELTA = -15;

function toRoundedHours(value: number) {
  return Number(value.toFixed(1));
}

function getHoursSince(createdAt: string, now = new Date()) {
  const createdAtMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdAtMs)) {
    return Number.POSITIVE_INFINITY;
  }

  return toRoundedHours((now.getTime() - createdAtMs) / 3_600_000);
}

function getBenchmarkGateStatus(passRate: number, averageScore: number): BenchmarkGateStatus {
  if (passRate >= PASS_PASS_RATE && averageScore >= PASS_AVERAGE_SCORE) {
    return "pass";
  }

  if (passRate >= WATCH_PASS_RATE && averageScore >= WATCH_AVERAGE_SCORE) {
    return "watch";
  }

  return "blocked";
}

function getBenchmarkGateLabel(status: BenchmarkGateStatus) {
  if (status === "pass") return "release açık";
  if (status === "watch") return "izle";
  return "bloklu";
}

function degradeGateStatus(
  current: BenchmarkGateStatus,
  minimum: BenchmarkGateStatus,
): BenchmarkGateStatus {
  const priority: BenchmarkGateStatus[] = ["pass", "watch", "blocked"];
  const currentIndex = priority.indexOf(current);
  const minimumIndex = priority.indexOf(minimum);
  return currentIndex >= minimumIndex ? current : minimum;
}

function buildRunEvaluation(
  run: BenchmarkRunHistoryItem,
  previousComparableRun: BenchmarkRunHistoryItem | null,
  latestAtlasRunId: string | null,
  now = new Date(),
): BenchmarkRunEvaluation {
  const freshnessHours = getHoursSince(run.createdAt, now);
  const passRateDelta = previousComparableRun
    ? Number((run.passRate - previousComparableRun.passRate).toFixed(1))
    : null;
  const averageScoreDelta = previousComparableRun
    ? Number((run.averageScore - previousComparableRun.averageScore).toFixed(1))
    : null;

  let gateStatus = getBenchmarkGateStatus(run.passRate, run.averageScore);

  if (freshnessHours > BLOCK_STALE_HOURS) {
    gateStatus = degradeGateStatus(gateStatus, "blocked");
  } else if (freshnessHours > WATCH_STALE_HOURS) {
    gateStatus = degradeGateStatus(gateStatus, "watch");
  }

  if (
    passRateDelta !== null
    && averageScoreDelta !== null
    && (passRateDelta <= BLOCK_PASS_RATE_DELTA || averageScoreDelta <= BLOCK_SCORE_DELTA)
  ) {
    gateStatus = degradeGateStatus(gateStatus, "blocked");
  } else if (
    passRateDelta !== null
    && averageScoreDelta !== null
    && (passRateDelta <= WATCH_PASS_RATE_DELTA || averageScoreDelta <= WATCH_SCORE_DELTA)
  ) {
    gateStatus = degradeGateStatus(gateStatus, "watch");
  }

  return {
    gateStatus,
    gateLabel: getBenchmarkGateLabel(gateStatus),
    isReleaseAnchor: run.id === latestAtlasRunId,
    freshnessHours,
    passRateDelta,
    averageScoreDelta,
  };
}

export function evaluateBenchmarkHistory(
  recentRuns: BenchmarkRunHistoryItem[],
  suites: BenchmarkSuiteSummary[],
  now = new Date(),
): Pick<BenchmarkMetaResponse, "recentRuns" | "health"> {
  const atlasRuns = recentRuns.filter((run) => run.suiteSource === "atlas_internal");
  const latestAtlasRun = atlasRuns[0] ?? null;
  const previousAtlasRun = latestAtlasRun
    ? atlasRuns.find((run) => run.suiteId === latestAtlasRun.suiteId && run.id !== latestAtlasRun.id) ?? null
    : null;

  const enrichedRuns = recentRuns.map((run) => {
    const comparableRuns = recentRuns.filter((candidate) => candidate.suiteId === run.suiteId);
    const currentIndex = comparableRuns.findIndex((candidate) => candidate.id === run.id);
    const previousComparableRun = currentIndex >= 0 ? comparableRuns[currentIndex + 1] ?? null : null;

    return {
      ...run,
      evaluation: buildRunEvaluation(run, previousComparableRun, latestAtlasRun?.id ?? null, now),
    };
  });

  if (!latestAtlasRun) {
    return {
      recentRuns: enrichedRuns,
      health: {
        status: "blocked",
        label: getBenchmarkGateLabel("blocked"),
        summary: "Release gate kapalı. AtlasOps için kalıcı benchmark sonucu yok.",
        reasons: [
          "Release kararı için en az bir AtlasOps benchmark koşusu gerekiyor.",
          `${suites.filter((suite) => suite.status === "ready").length} suite hazır olsa da kalite çıpası oluşmamış.`,
        ],
        latestAtlasRunId: null,
        freshnessHours: null,
        passRateDelta: null,
        averageScoreDelta: null,
      },
    };
  }

  const freshnessHours = getHoursSince(latestAtlasRun.createdAt, now);
  const passRateDelta = previousAtlasRun
    ? Number((latestAtlasRun.passRate - previousAtlasRun.passRate).toFixed(1))
    : null;
  const averageScoreDelta = previousAtlasRun
    ? Number((latestAtlasRun.averageScore - previousAtlasRun.averageScore).toFixed(1))
    : null;

  let status = getBenchmarkGateStatus(latestAtlasRun.passRate, latestAtlasRun.averageScore);
  const reasons: string[] = [
    `Son AtlasOps koşusu ${latestAtlasRun.passRate}% pass rate ve ${latestAtlasRun.averageScore} ortalama skor üretti.`,
    `${latestAtlasRun.completedTasks}/${latestAtlasRun.taskCount} görev başarıyla tamamlandı.`,
  ];

  if (freshnessHours > BLOCK_STALE_HOURS) {
    status = degradeGateStatus(status, "blocked");
    reasons.push(`Kalite çıpası ${freshnessHours} saat önce üretildi; release için fazla eski.`);
  } else if (freshnessHours > WATCH_STALE_HOURS) {
    status = degradeGateStatus(status, "watch");
    reasons.push(`Son benchmark ${freshnessHours} saat önce koştu; tazelemek gerekiyor.`);
  } else {
    reasons.push(`Benchmark tazeliği uygun (${freshnessHours} saat).`);
  }

  if (passRateDelta !== null && averageScoreDelta !== null) {
    if (passRateDelta <= BLOCK_PASS_RATE_DELTA || averageScoreDelta <= BLOCK_SCORE_DELTA) {
      status = degradeGateStatus(status, "blocked");
      reasons.push(`Bir önceki AtlasOps koşusuna göre sert regresyon var (${passRateDelta} puan pass rate, ${averageScoreDelta} skor).`);
    } else if (passRateDelta <= WATCH_PASS_RATE_DELTA || averageScoreDelta <= WATCH_SCORE_DELTA) {
      status = degradeGateStatus(status, "watch");
      reasons.push(`Bir önceki AtlasOps koşusuna göre anlamlı düşüş var (${passRateDelta} puan pass rate, ${averageScoreDelta} skor).`);
    } else {
      reasons.push(`Bir önceki koşuya göre stabil veya daha iyi (${passRateDelta} puan pass rate, ${averageScoreDelta} skor).`);
    }
  } else {
    reasons.push("Karşılaştırılacak daha eski AtlasOps koşusu henüz yok.");
  }

  const summary =
    status === "pass"
      ? "Release gate açık. Son AtlasOps koşusu kalite eşiğini geçti."
      : status === "watch"
        ? "Release gate izleme modunda. Çıkış kalitesi sınırda veya tazelik zayıf."
        : "Release gate kapalı. Benchmark kalitesi veya tazeliği yetersiz.";

  return {
    recentRuns: enrichedRuns,
    health: {
      status,
      label: getBenchmarkGateLabel(status),
      summary,
      reasons,
      latestAtlasRunId: latestAtlasRun.id,
      freshnessHours,
      passRateDelta,
      averageScoreDelta,
    },
  };
}
