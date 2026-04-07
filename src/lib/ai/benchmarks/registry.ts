import fs from "node:fs";
import path from "node:path";
import { createAtlasOpsBenchmarkSuite } from "./atlas-ops";
import type {
  BenchmarkSuite,
  BenchmarkSuiteSource,
  BenchmarkSuiteSummary,
  BenchmarkTask,
} from "./types";

type ExternalSuiteDefinition = {
  id: string;
  name: string;
  description: string;
  source: BenchmarkSuiteSource;
  envVar: string;
  bundledFixtureName: string;
  configurationHint: string;
};

type ExternalFixture = {
  name?: string;
  description?: string;
  tasks: Array<Partial<BenchmarkTask> & Pick<BenchmarkTask, "id" | "title" | "description">>;
};

const EXTERNAL_SUITES: ExternalSuiteDefinition[] = [
  {
    id: "gaia-operator-v1",
    name: "GAIA Operator",
    description: "GAIA benzeri genel problem çözme görevleri için fixture-adapter suite.",
    source: "gaia",
    envVar: "ATLAS_BENCHMARK_GAIA_FIXTURE",
    bundledFixtureName: "gaia.json",
    configurationHint: "ATLAS_BENCHMARK_GAIA_FIXTURE ile GAIA fixture JSON yolu tanımlayın.",
  },
  {
    id: "osworld-ui-v1",
    name: "OSWorld UI",
    description: "OSWorld tarzı çok adımlı UI görevleri için fixture-adapter suite.",
    source: "osworld",
    envVar: "ATLAS_BENCHMARK_OSWORLD_FIXTURE",
    bundledFixtureName: "osworld.json",
    configurationHint: "ATLAS_BENCHMARK_OSWORLD_FIXTURE ile OSWorld fixture JSON yolu tanımlayın.",
  },
  {
    id: "webarena-browser-v1",
    name: "WebArena Browser",
    description: "WebArena tarzı browser görevleri için fixture-adapter suite.",
    source: "webarena",
    envVar: "ATLAS_BENCHMARK_WEBARENA_FIXTURE",
    bundledFixtureName: "webarena.json",
    configurationHint: "ATLAS_BENCHMARK_WEBARENA_FIXTURE ile WebArena fixture JSON yolu tanımlayın.",
  },
  {
    id: "tau-bench-service-v1",
    name: "Tau-bench Service",
    description: "Servis ve operasyon ajanları için tau-bench tarzı görev suite'i.",
    source: "tau_bench",
    envVar: "ATLAS_BENCHMARK_TAUBENCH_FIXTURE",
    bundledFixtureName: "tau-bench.json",
    configurationHint: "ATLAS_BENCHMARK_TAUBENCH_FIXTURE ile tau-bench fixture JSON yolu tanımlayın.",
  },
];

function resolveFixturePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

function getBundledFixturePath(fileName: string) {
  return path.resolve(process.cwd(), "benchmarks", "fixtures", fileName);
}

function normalizeTask(task: ExternalFixture["tasks"][number], source: BenchmarkSuiteSource): BenchmarkTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    goal: task.goal ?? task.description,
    context: task.context ?? `${source} fixture görev bağlamı`,
    successCriteria: task.successCriteria?.length ? task.successCriteria : ["Görevi doğru ve güvenli şekilde tamamlamalı"],
    preferredToolNames: task.preferredToolNames,
    requiredToolNames: task.requiredToolNames,
    expectedKeywords: task.expectedKeywords,
    forbiddenKeywords: task.forbiddenKeywords,
    minimumSteps: task.minimumSteps,
    mode: task.mode ?? "analysis",
    riskLevel: task.riskLevel ?? "safe",
    maxAttempts: task.maxAttempts,
  };
}

function createExternalSuite(definition: ExternalSuiteDefinition): BenchmarkSuite {
  const configuredPath = process.env[definition.envVar];
  const bundledPath = getBundledFixturePath(definition.bundledFixtureName);
  const fixturePath = configuredPath ? resolveFixturePath(configuredPath) : bundledPath;

  if (!fs.existsSync(fixturePath)) {
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      source: definition.source,
      status: "requires_config",
      configurationHint: `${definition.configurationHint} Beklenen fixture bulunamadı: ${fixturePath}`,
      tasks: [],
    };
  }

  const raw = fs.readFileSync(fixturePath, "utf8");
  const fixture = JSON.parse(raw) as ExternalFixture;

  return {
    id: definition.id,
    name: fixture.name ?? definition.name,
    description: fixture.description ?? definition.description,
    source: definition.source,
    status: "ready",
    configurationHint: configuredPath
      ? `Custom fixture aktif: ${fixturePath}`
      : `Bundled fixture aktif. Gerekirse ${definition.envVar} ile override edin.`,
    tasks: (fixture.tasks ?? []).map((task) => normalizeTask(task, definition.source)),
  };
}

export function getBenchmarkSuites(): BenchmarkSuite[] {
  return [
    createAtlasOpsBenchmarkSuite(),
    ...EXTERNAL_SUITES.map(createExternalSuite),
  ];
}

export function getReadyBenchmarkSuites(): BenchmarkSuite[] {
  return getBenchmarkSuites().filter((suite) => suite.status === "ready");
}

export function getBenchmarkSuiteById(id: string): BenchmarkSuite | null {
  return getBenchmarkSuites().find((suite) => suite.id === id) ?? null;
}

export function summarizeBenchmarkSuites(suites: BenchmarkSuite[]): BenchmarkSuiteSummary[] {
  return suites.map((suite) => ({
    id: suite.id,
    name: suite.name,
    description: suite.description,
    source: suite.source,
    status: suite.status,
    configurationHint: suite.configurationHint,
    taskCount: suite.tasks.length,
  }));
}
