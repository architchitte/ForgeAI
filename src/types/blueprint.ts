export interface BlueprintFormData {
  appName: string;
  oneLiner: string;
  orchestrationFramework: string;
  systemPrompt: string;
  deploymentUrl: string;
}

export interface BlueprintFormErrors {
  appName?: string;
  oneLiner?: string;
  orchestrationFramework?: string;
  systemPrompt?: string;
  deploymentUrl?: string;
}

