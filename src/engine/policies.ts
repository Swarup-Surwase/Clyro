import type { ColumnClassification, ColumnPolicyItem, RecipientType } from './types';

export type RecipientPresetMeta = {
  id: RecipientType;
  label: string;
  shortLabel: string;
  description: string;
  guidance: string;
  defaultRetainedPatterns: RegExp[];
};

const SENSITIVE_COLUMN_PATTERNS = [
  /email/i,
  /mail/i,
  /phone/i,
  /mobile/i,
  /tel/i,
  /contact/i,
  /aadhaar/i,
  /uid/i,
  /pan\b/i,
  /card/i,
  /cvv/i,
  /account/i,
  /bank/i,
  /^ip$/i,
  /ip_address/i,
  /address/i,
  /street/i,
  /house/i,
  /gps/i,
  /lat/i,
  /lon/i,
  /name/i,
  /guardian/i,
  /medical/i,
  /diagnosis/i,
  /symptom/i,
  /prescription/i,
  /notes?/i,
  /remarks?/i,
  /comment/i,
];

const OPERATIONAL_COLUMN_PATTERNS = [
  /case_?ref/i,
  /district/i,
  /region/i,
  /zone/i,
  /sector/i,
  /area/i,
  /family_?size/i,
  /household/i,
  /members/i,
  /assistance/i,
  /aid/i,
  /supply/i,
  /needs?/i,
  /urgency/i,
  /priority/i,
  /severity/i,
  /shelter/i,
  /status/i,
  /referral_?type/i,
  /triage/i,
];

export const RECIPIENT_PRESETS: Record<RecipientType, RecipientPresetMeta> = {
  default: {
    id: 'default',
    label: 'Standard Sanitization',
    shortLabel: 'Standard',
    description: 'General-purpose local sanitization retaining structure unless columns are manually minimized.',
    guidance: 'No recipient namespace prefix applied; tokens use TYPE_001 format.',
    defaultRetainedPatterns: [/.*/],
  },
  ngo: {
    id: 'ngo',
    label: 'NGO Coordination',
    shortLabel: 'NGO',
    description: 'Retains regional need indicators (district, household size, assistance, urgency, shelter) for aid dispatch.',
    guidance: 'Removes direct identifiers, exact addresses, and unreviewed free-text notes by default.',
    defaultRetainedPatterns: [
      /^case_?ref$/i,
      /district|region|area/i,
      /family_?size|household|members/i,
      /assistance|aid|supply|shelter|urgency|priority|status/i,
    ],
  },
  hospital: {
    id: 'hospital',
    label: 'Hospital Referral Desk',
    shortLabel: 'Hospital',
    description: 'Retains coarse triage/referral category, district, and urgency while guarding financial and government IDs.',
    guidance: 'Medical notes are never auto-disclosed without explicit human review.',
    defaultRetainedPatterns: [
      /^case_?ref$/i,
      /district/i,
      /family_?size|household/i,
      /assistance|referral|triage|urgency|priority|status/i,
    ],
  },
  municipal: {
    id: 'municipal',
    label: 'Municipal Relief Authority',
    shortLabel: 'Municipal',
    description: 'Preserves operational planning columns and scoped pseudonyms for aggregate relief planning.',
    guidance: 'Flags high-risk identity columns and exact location fields for suppression.',
    defaultRetainedPatterns: [
      /^case_?ref$/i,
      /district|zone|sector|ward/i,
      /family_?size|household/i,
      /assistance|shelter|urgency|status/i,
    ],
  },
  volunteer: {
    id: 'volunteer',
    label: 'Volunteer Distribution Team',
    shortLabel: 'Volunteer',
    description: 'Strict minimum-necessary policy: broad area, household count, supply category, and task status only.',
    guidance: 'Suppresses contact numbers, government IDs, IPs, financial fields, and medical context.',
    defaultRetainedPatterns: [
      /^case_?ref$/i,
      /district|area|sector/i,
      /family_?size|household/i,
      /assistance|supply|shelter|status/i,
    ],
  },
  custom: {
    id: 'custom',
    label: 'Custom Recipient Policy',
    shortLabel: 'Custom',
    description: 'Define a custom column allowlist and independent cryptographic namespace for an external partner.',
    guidance: 'Unknown columns remain flagged for explicit manual review.',
    defaultRetainedPatterns: [
      /^case_?ref$/i,
      /district/i,
      /family_?size|household/i,
      /assistance|urgency|status/i,
    ],
  },
};

export function classifyColumn(
  columnName: string,
  hasDetectedPii: boolean
): { classification: ColumnClassification; reason: string } {
  if (hasDetectedPii || SENSITIVE_COLUMN_PATTERNS.some((re) => re.test(columnName))) {
    if (/medical|diagnosis|symptom|prescription/i.test(columnName)) {
      return {
        classification: 'sensitive-risk',
        reason: 'Medical context requires explicit human review; never auto-disclosed.',
      };
    }
    if (/address|street|house|gps|lat|lon/i.test(columnName)) {
      return {
        classification: 'sensitive-risk',
        reason: 'Location detail can re-identify households even when direct IDs are redacted.',
      };
    }
    if (/notes?|remarks?|comment/i.test(columnName)) {
      return {
        classification: 'sensitive-risk',
        reason: 'Free-text notes often contain names, addresses, or unstructured PII.',
      };
    }
    return {
      classification: 'sensitive-risk',
      reason: 'Contains or signals direct personal/financial identifiers.',
    };
  }

  if (OPERATIONAL_COLUMN_PATTERNS.some((re) => re.test(columnName))) {
    return {
      classification: 'operational',
      reason: 'Coarse operational relief field safe to evaluate for aid coordination.',
    };
  }

  return {
    classification: 'review',
    reason: 'Unknown column — review manually before including in external handover.',
  };
}

export function buildDefaultColumnPolicies(
  headers: string[],
  recipient: RecipientType,
  columnsWithPii: Set<number>,
  existingOverrides?: Record<string, boolean>
): ColumnPolicyItem[] {
  const preset = RECIPIENT_PRESETS[recipient];

  return headers.map((name, colIndex) => {
    const hasPii = columnsWithPii.has(colIndex);
    const { classification, reason } = classifyColumn(name, hasPii);

    let defaultRetain = false;
    if (recipient === 'default') {
      defaultRetain = true;
    } else if (classification === 'operational') {
      defaultRetain = preset.defaultRetainedPatterns.some((re) => re.test(name));
    } else if (classification === 'sensitive-risk') {
      defaultRetain = false;
    } else {
      // Unknown columns are not automatically cleared for external recipients
      defaultRetain = false;
    }

    const retained =
      existingOverrides && existingOverrides[name] !== undefined
        ? Boolean(existingOverrides[name])
        : defaultRetain;

    return {
      name,
      colIndex,
      retained,
      classification,
      reason,
      hasDetectedPii: hasPii,
    };
  });
}
