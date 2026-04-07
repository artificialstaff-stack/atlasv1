import { describe, expect, it, vi } from "vitest";
import { applyScopeRefFilter } from "@/lib/admin-copilot/store";

describe("admin copilot store filters", () => {
  it("uses eq for non-null scope ref ids", () => {
    const query = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
    };

    const result = applyScopeRefFilter(query, "6a3e8856-ef67-4ec1-a856-b92f53795ea1");

    expect(result).toBe(query);
    expect(query.eq).toHaveBeenCalledWith("scope_ref_id", "6a3e8856-ef67-4ec1-a856-b92f53795ea1");
    expect(query.is).not.toHaveBeenCalled();
  });

  it("uses is null when scope ref id is missing", () => {
    const query = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
    };

    const result = applyScopeRefFilter(query, null);

    expect(result).toBe(query);
    expect(query.is).toHaveBeenCalledWith("scope_ref_id", null);
    expect(query.eq).not.toHaveBeenCalled();
  });
});
