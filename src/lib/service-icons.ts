import {
  Heart,
  FileText,
  Car,
  Shield,
  Plane,
  Wrench,
  Handshake,
  ClipboardList,
  Bus,
  User,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";

/** Serializable icon name → Lucide component (client-side only). */
export const serviceIconByName: Record<string, LucideIcon> = {
  Heart,
  FileText,
  Car,
  Shield,
  Plane,
  Wrench,
  Handshake,
  ClipboardList,
  Bus,
  User,
  PartyPopper,
};

export function getServiceIcon(name: string): LucideIcon {
  return serviceIconByName[name] ?? FileText;
}
