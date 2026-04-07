export type AgentRole =
  | "coordinator"
  | "customer"
  | "commerce"
  | "marketing"
  | "finance"
  | "operations"
  | "strategy";

export interface DomainData {
  agent: AgentRole;
  label: string;
  data: Record<string, unknown>;
  recordCount: number;
  fetchMs: number;
}
