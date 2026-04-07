import { describe, expect, it } from "vitest";
import {
  shouldAuditBrowserOperator,
  shouldAuditReadOnlyExploration,
} from "@/lib/admin-copilot/agent-fallback";

describe("admin copilot tool audit routing", () => {
  it("marks read-only database exploration tools for audit", () => {
    expect(shouldAuditReadOnlyExploration("db_inspect_read_schema")).toBe(true);
    expect(shouldAuditReadOnlyExploration("db_read_table_rows")).toBe(true);
    expect(shouldAuditReadOnlyExploration("get_table_row_counts")).toBe(true);
    expect(shouldAuditReadOnlyExploration("list_form_submissions")).toBe(false);
  });

  it("marks browser/operator tools for audit", () => {
    expect(shouldAuditBrowserOperator("browser_extract_page")).toBe(true);
    expect(shouldAuditBrowserOperator("crawl_markdown")).toBe(true);
    expect(shouldAuditBrowserOperator("fetch_webpage")).toBe(true);
    expect(shouldAuditBrowserOperator("get_user_360")).toBe(false);
  });
});
