import type { CommandIntent, ToolPolicy } from "./types";

const POLICY_MAP: Record<CommandIntent, ToolPolicy> = {
  "customer.create_account": { intent: "customer.create_account", approval: "required" },
  "customer.update_profile": { intent: "customer.update_profile", approval: "required" },
  "customer.get_360": { intent: "customer.get_360", approval: "auto" },
  "customer.change_onboarding_status": { intent: "customer.change_onboarding_status", approval: "required" },
  "company.create_llc": { intent: "company.create_llc", approval: "required" },
  "company.update_status": { intent: "company.update_status", approval: "required" },
  "marketplace.create_account": { intent: "marketplace.create_account", approval: "required" },
  "marketplace.update_account": { intent: "marketplace.update_account", approval: "required" },
  "social.create_account": { intent: "social.create_account", approval: "required" },
  "advertising.create_campaign_draft": { intent: "advertising.create_campaign_draft", approval: "required" },
  "finance.create_record_draft": { intent: "finance.create_record_draft", approval: "required" },
  "report.generate_customer_report": { intent: "report.generate_customer_report", approval: "auto" },
  "artifact.publish_to_customer_portal": { intent: "artifact.publish_to_customer_portal", approval: "required" },
  "notification.send_to_customer": { intent: "notification.send_to_customer", approval: "required" },
  "task.create_onboarding_tasks": { intent: "task.create_onboarding_tasks", approval: "required" },
  "task.update_process_task": { intent: "task.update_process_task", approval: "required" },
  "document.request_or_attach": { intent: "document.request_or_attach", approval: "required" },
  "system.agent_task": { intent: "system.agent_task", approval: "auto" },
  "system.global_summary": { intent: "system.global_summary", approval: "auto" },
  "system.unsupported": {
    intent: "system.unsupported",
    approval: "blocked",
    blockedReason: "Mesaj çok genel kaldı. Hangi müşteri, hangi veri veya hangi aksiyon istediğinizi biraz daha net yazın.",
  },
};

export function getToolPolicy(intent: CommandIntent): ToolPolicy {
  return POLICY_MAP[intent];
}

