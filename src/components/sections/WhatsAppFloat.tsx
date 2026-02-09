"use client";

import { MessageCircle } from "lucide-react";
import { site } from "@/config/site";

export function WhatsAppFloat() {
  // Using LINE URL as WhatsApp alternative, or you can add WhatsApp URL to site config
  const whatsappUrl = `https://wa.me/${site.phone.replace(/\D/g, "")}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-all hover:scale-110 hover:shadow-xl"
      aria-label="Contact us on WhatsApp"
    >
      <MessageCircle className="h-7 w-7 text-white" />
    </a>
  );
}
