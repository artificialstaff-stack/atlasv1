/**
 * ─── Atlas Platform — SSO / SAML Integration Service ───
 * Enterprise SSO configuration and provider management.
 * Supabase Auth handles the actual OAuth/SAML flow.
 * This layer manages SSO configuration and enterprise settings.
 */

export interface SSOProvider {
  id: string;
  name: string;
  type: "saml" | "oidc" | "oauth2";
  enabled: boolean;
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  clientId?: string;
  clientSecret?: string;
  issuer?: string;
  domain?: string; // Auto-detect by email domain
  createdAt: string;
}

export interface SSOConfig {
  enforceSSO: boolean;
  allowedDomains: string[];
  defaultProvider?: string;
  sessionDurationHours: number;
  requireMFA: boolean;
}

/** In-memory SSO config (in production, stored in Supabase) */
const ssoConfig: SSOConfig = {
  enforceSSO: false,
  allowedDomains: [],
  defaultProvider: undefined,
  sessionDurationHours: 24,
  requireMFA: false,
};

const ssoProviders: Map<string, SSOProvider> = new Map();

/** Get SSO configuration */
export function getSSOConfig(): SSOConfig {
  return { ...ssoConfig };
}

/** Update SSO configuration */
export function updateSSOConfig(updates: Partial<SSOConfig>): SSOConfig {
  Object.assign(ssoConfig, updates);
  return { ...ssoConfig };
}

/** Register an SSO provider */
export function registerSSOProvider(provider: Omit<SSOProvider, "id" | "createdAt">): SSOProvider {
  const id = `sso_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const full: SSOProvider = {
    ...provider,
    id,
    createdAt: new Date().toISOString(),
  };
  ssoProviders.set(id, full);
  return full;
}

/** Get all SSO providers */
export function getSSOProviders(): SSOProvider[] {
  return Array.from(ssoProviders.values());
}

/** Get SSO provider by ID */
export function getSSOProvider(id: string): SSOProvider | undefined {
  return ssoProviders.get(id);
}

/** Remove SSO provider */
export function removeSSOProvider(id: string): boolean {
  return ssoProviders.delete(id);
}

/** Detect SSO provider by email domain */
export function detectProviderByEmail(email: string): SSOProvider | undefined {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return undefined;

  return Array.from(ssoProviders.values()).find(
    (p) => p.enabled && p.domain?.toLowerCase() === domain
  );
}

/** Check if SSO is enforced for a given email domain */
export function isSSOEnforced(email: string): boolean {
  if (!ssoConfig.enforceSSO) return false;

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  if (ssoConfig.allowedDomains.length === 0) return true;
  return ssoConfig.allowedDomains.includes(domain);
}

/** Generate SAML metadata XML for service provider */
export function generateSPMetadata(baseUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${baseUrl}/api/auth/saml/metadata">
  <md:SPSSODescriptor
    AuthnRequestsSigned="true"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${baseUrl}/api/auth/saml/callback"
      index="1" />
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
}
