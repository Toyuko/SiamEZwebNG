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
  Building2,
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
  Building2,
  Taxi: Bus,
};

export function getServiceIcon(name: string): LucideIcon {
  return serviceIconByName[name] ?? FileText;
}
