export interface TrialOverlaySummary {
  id: string;
  templateId: string;
  name: string;
  order: number;
  outputPath: string;
  controlPath: string;
  brandingRequired: boolean;
}

export interface TrialStudioSummary {
  id: string;
  name: string;
  status: 'ACTIVE';
  membershipRole: 'OWNER';
  subscriptionStatus: 'TRIALING';
  trialEndsAt: string | null;
  brandingPolicy: 'REO_REQUIRED';
  templateLimit: 10;
  overlays: TrialOverlaySummary[];
}

export interface TrialProvisioningResponse {
  ok: true;
  provisioned: boolean;
  created: {
    studio: boolean;
    membership: boolean;
    subscription: boolean;
    overlays: number;
  };
  studio: TrialStudioSummary;
}

export interface TrialStudioResponse {
  ok: true;
  studio: TrialStudioSummary;
}
