import { describe, expect, it } from "vitest";

import { getFormByCode, getTaskTemplates } from "@/lib/forms";
import { welcomeEmail } from "@/lib/email";

describe("forms and email localization", () => {
  it("resolves bilingual form definitions by locale", () => {
    const trForm = getFormByCode("ATL-101", "tr");
    const enForm = getFormByCode("ATL-101", "en");

    expect(trForm?.title).toContain("LLC");
    expect(enForm?.description).toContain("United States");
    expect(enForm?.sections[0]?.fields[0]?.label).toBe("Full Name");
  });

  it("resolves task templates by locale", () => {
    const enTemplates = getTaskTemplates("ATL-101", "en");
    expect(enTemplates[0]?.task_name).toContain("Prepare");
    expect(enTemplates[0]?.notes_template).toContain("State");
  });

  it("renders transactional emails in selected locale", () => {
    const trEmail = welcomeEmail("Ayse", "Atlas", "starter", "tr");
    const enEmail = welcomeEmail("Jane", "Atlas", "starter", "en");

    expect(trEmail.subject).toContain("Hoş geldiniz");
    expect(enEmail.subject).toContain("Welcome");
    expect(enEmail.html).toContain("Next Steps");
  });
});
