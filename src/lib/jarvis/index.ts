export * from "./types";
export * from "./contracts";
export * from "./brain-types";
export * from "./surfaces";
export * from "./store";
export * from "./observer";
export * from "./autofix";
export * from "./route-audit";
export { JarvisCoreAdapter } from "./core-adapter";
export { generateSelfReport } from "./self-model";
export { generateGapReport } from "./gap-report";
export { runReflection } from "./reflection";
export {
  startBackgroundLoop,
  stopBackgroundLoop,
  getBackgroundLoopState,
} from "./background-loop";
export { createTrace, TraceBuilder, getRecentTraces } from "./tracing";
export { runBenchmarkGates } from "./benchmark-gates";
export type { BenchmarkGateResult, BenchmarkReport } from "./benchmark-gates";
export {
  checkGuardrail,
  checkAndTrace,
  classifyRisk,
} from "./security";
export type { GuardrailCheck, ActionProposal } from "./security";
