import {
  CreditCard,
  FileBadge,
  Fingerprint,
  Globe,
  Mail,
  Phone,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import type { EntityType } from '../../engine';

export type EntityVisualMeta = {
  type: EntityType;
  label: string;
  shortCode: string;
  icon: LucideIcon;
  colorHex: string;
  badgeClass: string;
  highlightClass: string;
  dimHighlightClass: string;
  barClass: string;
};

export const ENTITY_META: Record<EntityType, EntityVisualMeta> = {
  EMAIL: {
    type: 'EMAIL',
    label: 'Email',
    shortCode: 'EM',
    icon: Mail,
    colorHex: '#89C4D7',
    badgeClass: 'border-[#89C4D7]/35 bg-[#89C4D7]/10 text-[#89C4D7]',
    highlightClass: 'bg-[#89C4D7]/15 text-[#BEE6F2] border-b border-[#89C4D7]/60',
    dimHighlightClass: 'bg-[#26282A]/50 text-[#A3A3A3] border-b border-[#26282A]',
    barClass: 'bg-[#89C4D7]',
  },
  PHONE: {
    type: 'PHONE',
    label: 'Phone',
    shortCode: 'PH',
    icon: Phone,
    colorHex: '#A8E6CF',
    badgeClass: 'border-[#A8E6CF]/35 bg-[#A8E6CF]/10 text-[#A8E6CF]',
    highlightClass: 'bg-[#A8E6CF]/15 text-[#CCF2E2] border-b border-[#A8E6CF]/60',
    dimHighlightClass: 'bg-[#26282A]/50 text-[#A3A3A3] border-b border-[#26282A]',
    barClass: 'bg-[#A8E6CF]',
  },
  IP: {
    type: 'IP',
    label: 'IP Address',
    shortCode: 'IP',
    icon: Globe,
    colorHex: '#9BB1D6',
    badgeClass: 'border-[#9BB1D6]/35 bg-[#9BB1D6]/10 text-[#9BB1D6]',
    highlightClass: 'bg-[#9BB1D6]/15 text-[#C7D6EE] border-b border-[#9BB1D6]/60',
    dimHighlightClass: 'bg-[#26282A]/50 text-[#A3A3A3] border-b border-[#26282A]',
    barClass: 'bg-[#9BB1D6]',
  },
  PAN: {
    type: 'PAN',
    label: 'PAN',
    shortCode: 'PN',
    icon: FileBadge,
    colorHex: '#E6BA70',
    badgeClass: 'border-[#E6BA70]/35 bg-[#E6BA70]/10 text-[#E6BA70]',
    highlightClass: 'bg-[#E6BA70]/15 text-[#F4D8A8] border-b border-[#E6BA70]/60',
    dimHighlightClass: 'bg-[#26282A]/50 text-[#A3A3A3] border-b border-[#26282A]',
    barClass: 'bg-[#E6BA70]',
  },
  AADHAAR: {
    type: 'AADHAAR',
    label: 'Aadhaar',
    shortCode: 'AD',
    icon: Fingerprint,
    colorHex: '#E87D85',
    badgeClass: 'border-[#E87D85]/35 bg-[#E87D85]/10 text-[#E87D85]',
    highlightClass: 'bg-[#E87D85]/15 text-[#F4B4B9] border-b border-[#E87D85]/60',
    dimHighlightClass: 'bg-[#26282A]/50 text-[#A3A3A3] border-b border-[#26282A]',
    barClass: 'bg-[#E87D85]',
  },
  CARD: {
    type: 'CARD',
    label: 'Credit Card',
    shortCode: 'CC',
    icon: CreditCard,
    colorHex: '#D49A79',
    badgeClass: 'border-[#D49A79]/35 bg-[#D49A79]/10 text-[#D49A79]',
    highlightClass: 'bg-[#D49A79]/15 text-[#ECC5B0] border-b border-[#D49A79]/60',
    dimHighlightClass: 'bg-[#26282A]/50 text-[#A3A3A3] border-b border-[#26282A]',
    barClass: 'bg-[#D49A79]',
  },
};

export const MANUAL_META = {
  label: 'Manual',
  shortCode: 'MN',
  icon: ShieldAlert,
  badgeClass: 'border-[#F5F5F5]/30 bg-[#F5F5F5]/10 text-[#F5F5F5]',
  highlightClass: 'bg-[#F5F5F5]/15 text-[#F5F5F5] border-b border-[#F5F5F5]/60',
};
