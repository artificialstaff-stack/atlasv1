import {
  getCustomerWorkspaceView,
  getCustomerWorkstreamMeta,
  type CustomerModuleAccess,
  type CustomerWorkstreamKey,
  type CustomerWorkstreamViewModel,
} from "@/lib/customer-workspace";
import { resolveServerLocale } from "@/lib/locale-server";
import { LockedModuleContent } from "@/components/portal/locked-module-content";
import { ObserverWorkstreamContent } from "@/components/portal/observer-workstream-content";

type ManagedModulePageProps = {
  userId: string;
  workstreamKey: CustomerWorkstreamKey;
  title?: string;
  description?: string;
  mode?: "observer" | "locked";
  summary?: string;
  nextStep?: string;
  shortLabel?: string;
  customerAction?: string;
  adminAction?: string;
  access?: CustomerModuleAccess | null;
};

function buildFallbackWorkstream(input: ManagedModulePageProps, locale: "tr" | "en"): CustomerWorkstreamViewModel {
  const localizedMeta = getCustomerWorkstreamMeta(locale, input.workstreamKey);
  return {
    key: input.workstreamKey,
    title: input.title ?? localizedMeta.title,
    shortLabel: input.shortLabel ?? localizedMeta.shortLabel,
    description: input.description ?? localizedMeta.description,
    status: input.mode === "locked" ? "locked" : "pending",
    ownerLabel: "ATLAS",
    observerMode: input.mode === "locked" ? "locked" : "workstream",
    blockerReason: null,
    latestOutput: null,
    nextStep: input.nextStep ?? localizedMeta.customerAction,
    customerAction: input.customerAction ?? localizedMeta.customerAction,
    adminAction: input.adminAction ?? localizedMeta.adminAction,
    detailHref: "#",
    metrics: [],
  };
}

export async function ManagedModulePage(input: ManagedModulePageProps) {
  const workspace = await getCustomerWorkspaceView(input.userId);
  const locale = await resolveServerLocale();
  const baseWorkstream =
    workspace.workstreams.find((workstream) => workstream.key === input.workstreamKey)
    ?? buildFallbackWorkstream(input, locale);
  const title = input.title ?? baseWorkstream.title;
  const description = input.description ?? baseWorkstream.description;

  if (input.mode === "locked") {
    return (
      <LockedModuleContent
        title={title}
        description={description}
        summary={
          input.summary
          ?? input.access?.lockedSummary
          ?? baseWorkstream.adminAction
          ?? baseWorkstream.description
        }
        nextStep={
          input.nextStep
          ?? input.access?.lockedNextStep
          ?? baseWorkstream.nextStep
          ?? baseWorkstream.customerAction
        }
        state={input.access?.lockedState ?? "blocked"}
        action={input.access?.lockedAction ?? null}
        secondaryAction={input.access?.secondaryAction ?? null}
        offerQueries={input.access?.lockedOffers ?? []}
      />
    );
  }

  return (
    <ObserverWorkstreamContent
      workstream={{
        ...baseWorkstream,
        title,
        shortLabel: input.shortLabel ?? baseWorkstream.shortLabel,
        description,
        customerAction: input.customerAction ?? baseWorkstream.customerAction,
        adminAction: input.adminAction ?? baseWorkstream.adminAction,
        nextStep: input.nextStep ?? baseWorkstream.nextStep,
      }}
    />
  );
}
