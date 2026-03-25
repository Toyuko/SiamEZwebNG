import { notFound } from "next/navigation";
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getServiceBySlug } from "@/data-access/service";
import { ServiceDetailHero } from "@/components/sections/ServiceDetailHero";
import { ServiceDetailTabs } from "@/components/sections/ServiceDetailTabs";
import { ServiceDetailSidebar } from "@/components/sections/ServiceDetailSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, Shield, FileText, Car, Plane, Wrench, ClipboardList, Bus, User, Award, Zap, CheckCircle, Landmark, CalendarCheck } from "lucide-react";
import { serviceDisplayNames, serviceShortDescriptions, serviceSlugs } from "@/config/services";
import type { ServiceSlug } from "@/config/services";
import { MarriageRegistrationSections } from "@/components/sections/MarriageRegistrationSections";
import { DriverLicenseExtras } from "@/components/sections/DriverLicenseExtras";
import { buildDriverLicenseServiceContent } from "@/lib/driver-license-service";
import { buildEventPlanningServiceContent } from "@/lib/event-planning-service";
import { EventPlanningVenueSections } from "@/components/sections/EventPlanningVenueSections";
import { RedDoorVenueGallery } from "@/components/sections/RedDoorVenueGallery";

type ServiceDetailContent = {
  subtitle: string;
  overview: string;
  features: Array<{ icon: React.ComponentType<{ className?: string }>; title: string; description: string }>;
  requirements: string[];
  processSteps: Array<{ title: string; description: string }>;
  documents: {
    foreigner: string[];
    thaiPartner?: string[];
  };
  processingTime?: string;
  visaDuration?: string;
  pricingSections?: Array<{
    title: string;
    rows: Array<{ label: string; price: string }>;
    vehicleRequirements?: string;
    footnote?: string;
  }>;
  additionalServicesTable?: Array<{ service: string; price: string; notes: string }>;
  legalDisclaimer?: string;
  galleryVideoSrc?: string;
  galleryVideoAriaLabel?: string;
  galleryImages?: Array<{ src: string; alt: string; width: number; height: number }>;
  galleryTitle?: string;
  galleryDescription?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug, locale } = await params;
  const service = await getServiceBySlug(slug).catch(() => null);
  const t = await getTranslations("services");

  if (slug === "driver-license") {
    const tDl = await getTranslations({ locale, namespace: "driverLicensePage" });
    const title = service?.name ?? serviceDisplayNames["driver-license"];
    return { title, description: tDl("metaDescription") };
  }

  if (slug === "event-planning-venue-services") {
    const tEv = await getTranslations({ locale, namespace: "eventPlanningVenuePage" });
    return {
      title: tEv("heroTitle"),
      description: tEv("metaDescription"),
    };
  }

  // Fallback to config if database unavailable
  if (!service) {
    const displayName = serviceDisplayNames[slug as ServiceSlug];
    if (!displayName) return { title: t("serviceMetaTitle") };
    return {
      title: displayName,
      description: serviceShortDescriptions[slug as ServiceSlug] || "",
    };
  }

  return {
    title: service.name,
    description: service.shortDescription ?? service.description.slice(0, 160),
  };
}

// Service-specific content (can be moved to database or config files later)
const getServiceContent = (slug: string): ServiceDetailContent => {
  const content: Record<string, ServiceDetailContent> = {
    "marriage-registration": {
      subtitle:
        "Navigate Thai bureaucracy with confidence—from document preparation to district office registration—so you can focus on what matters most.",
      overview:
        "Thai marriage registration for foreigners involves multiple government agencies, certified translations, and strict documentation. SiamEZ acts as your legal concierge: we handle logistics so you avoid costly delays and rejections. Trusted by couples worldwide, we specialize in international marriages in Thailand, helping ensure your union is recognized in the Kingdom and abroad.",
      features: [
        {
          icon: FileText,
          title: "Document preparation",
          description:
            "Expert translation and certification of passports, affirmations, and supporting documents for Embassy, MFA, and Amphur submission.",
        },
        {
          icon: Landmark,
          title: "Embassy & MFA liaison",
          description:
            "We coordinate with your Embassy and the Thai Ministry of Foreign Affairs to secure attestations and MFA legalization.",
        },
        {
          icon: CalendarCheck,
          title: "Appointment & registration",
          description:
            "We help schedule your Amphur appointment and accompany you for a smooth registration experience.",
        },
      ],
      requirements: [
        "Both parties must meet Thai legal requirements to marry (including minimum age and legal capacity).",
        "Thai law requires both partners to appear in person at the District Office (Amphur) for registration.",
        "Two witnesses (typically Thai nationals) with valid ID must be present; we can help arrange witnesses and accompany you on the day.",
        "Your Embassy-issued Affirmation of Freedom to Marry must be translated into Thai and legalized by the MFA before Amphur registration.",
        "If previously married or widowed, certified divorce or death certificates with official Thai translation are required where applicable.",
        "Need a marriage visa (Non-O) after registration? Ask us—timing and financial rules differ from the registration process itself.",
      ],
      processSteps: [
        {
          title: "Document preparation & translation",
          description:
            "Gather passports, birth certificates, and any divorce or death certificates. Certified Thai translations are prepared for submission.",
        },
        {
          title: "Embassy affirmation (freedom to marry)",
          description:
            "Your Embassy issues an Affirmation of Freedom to Marry certifying you are legally eligible—required by Thai law before MFA and Amphur steps.",
        },
        {
          title: "MFA authentication",
          description:
            "The Ministry of Foreign Affairs authenticates your Embassy-issued documents. Processing typically takes 2–5 business days.",
        },
        {
          title: "District Office (Amphur) registration",
          description:
            "Final registration at the Amphur with both parties in person. You receive your official Thai marriage certificate.",
        },
      ],
      documents: {
        foreigner: [
          "Valid passport—original plus copy of the biographical page",
          "Affirmation of Freedom to Marry from your Embassy or Consulate in Thailand",
          "Divorce decree (if applicable)—certified copy with official Thai translation",
          "Death certificate of former spouse (if widowed)—certified copy with official Thai translation",
          "MFA-stamped / legalized documents as required before Amphur registration",
        ],
        thaiPartner: [
          "Thai National ID card",
          "House registration (Tabien Baan)—original copy 1 as required by the office",
          "Two witnesses (Thai nationals with valid ID) must attend the Amphur—we can help arrange",
        ],
      },
      processingTime: "MFA ~2–5 business days; full journey often 2–4 weeks (expedited options with Premium)",
    },
    "translation-services": {
      subtitle: "Certified translations for official documents, legal paperwork, and government submissions with accuracy and speed.",
      overview: "Whether you need documents translated for visa applications, legal proceedings, business contracts, or personal matters, SiamEZ provides certified translation services recognized by Thai government agencies. Our team of professional translators ensures accuracy, proper formatting, and timely delivery for all your translation needs.",
      features: [
        {
          icon: Award,
          title: "Certified Translations",
          description: "All translations are certified and accepted by Thai government agencies.",
        },
        {
          icon: Zap,
          title: "Fast Turnaround",
          description: "Express service available for urgent document translations.",
        },
      ],
      requirements: [
        "Original document(s) to be translated",
        "Clear, readable copies of all pages",
        "Purpose of translation (visa, legal, business, etc.)",
        "Preferred delivery format (hard copy, digital, or both)",
      ],
      processSteps: [
        {
          title: "Step 1: Document Submission",
          description: "Submit your original documents or clear copies. We accept documents in person, via email, or through our online portal.",
        },
        {
          title: "Step 2: Translation & Review",
          description: "Our certified translators translate your documents with accuracy and attention to detail. A second translator reviews for quality assurance.",
        },
        {
          title: "Step 3: Certification & Stamping",
          description: "Documents are certified with official stamps and signatures as required by Thai authorities.",
        },
        {
          title: "Step 4: Delivery",
          description: "Receive your translated documents in your preferred format. We can deliver to government offices if needed.",
        },
      ],
      documents: {
        foreigner: [
          "Original document(s) to be translated",
          "Clear photocopies of all pages",
          "Valid identification (passport or ID card)",
          "Any supporting documents or context",
        ],
      },
      processingTime: "2 - 5 Business Days",
    },
    "police-clearance": {
      subtitle: "Professional assistance obtaining police clearance certificates and background checks required for visas and work permits.",
      overview: "Police clearance certificates are often required for visa applications, work permits, and various official purposes in Thailand. SiamEZ assists you in obtaining these certificates efficiently, handling the application process at the Royal Thai Police Headquarters and ensuring all requirements are met.",
      features: [
        {
          icon: Shield,
          title: "Official Certification",
          description: "Certificates issued by Royal Thai Police Headquarters.",
        },
        {
          icon: CheckCircle,
          title: "Complete Support",
          description: "Full assistance from application to certificate collection.",
        },
      ],
      requirements: [
        "Valid passport with current visa",
        "Residence certificate or proof of address",
        "Completed application form",
        "Fingerprints (taken at police station)",
      ],
      processSteps: [
        {
          title: "Step 1: Document Collection",
          description: "Gather all required documents including passport, visa, and residence certificate.",
        },
        {
          title: "Step 2: Fingerprint Collection",
          description: "Have your fingerprints taken at the designated police station.",
        },
        {
          title: "Step 3: Application Submission",
          description: "Submit your application at the Royal Thai Police Headquarters with our assistance.",
        },
        {
          title: "Step 4: Certificate Collection",
          description: "Collect your police clearance certificate once processing is complete.",
        },
      ],
      documents: {
        foreigner: [
          "Valid Passport",
          "Current Visa",
          "Residence Certificate",
          "Completed Application Form",
          "Fingerprint Records",
          "Passport-sized Photos",
        ],
      },
      processingTime: "2 - 4 Weeks",
    },
    "visa-services": {
      subtitle: "Comprehensive visa assistance including applications, extensions, and conversions for all visa types in Thailand.",
      overview: "Thailand's visa system can be complex and ever-changing. SiamEZ provides expert guidance and assistance for all types of visas including tourist visas, business visas, retirement visas, education visas, and family visas. We help you understand requirements, prepare documents, and navigate the immigration process smoothly.",
      features: [
        {
          icon: Shield,
          title: "Expert Knowledge",
          description: "Up-to-date knowledge of Thai immigration laws and regulations.",
        },
        {
          icon: Clock,
          title: "Timely Processing",
          description: "Ensure your visa applications are submitted on time.",
        },
      ],
      requirements: [
        "Valid passport with sufficient validity",
        "Completed visa application forms",
        "Required supporting documents (varies by visa type)",
        "Financial proof (for certain visa types)",
        "Medical certificate (for some visa types)",
      ],
      processSteps: [
        {
          title: "Step 1: Visa Consultation",
          description: "Consultation to determine the best visa type for your situation and requirements.",
        },
        {
          title: "Step 2: Document Preparation",
          description: "We help gather and prepare all required documents specific to your visa type.",
        },
        {
          title: "Step 3: Application Submission",
          description: "Submit your visa application at the appropriate immigration office or embassy.",
        },
        {
          title: "Step 4: Follow-up & Collection",
          description: "We track your application and assist with visa collection and any follow-up requirements.",
        },
      ],
      documents: {
        foreigner: [
          "Valid Passport",
          "Visa Application Forms",
          "Financial Proof (bank statements, income proof)",
          "Medical Certificate (if required)",
          "Supporting Documents (varies by visa type)",
        ],
      },
      processingTime: "1 - 4 Weeks (varies by visa type)",
    },
    "construction-handyman": {
      subtitle: "Professional home repairs, renovations, and construction services for residential and commercial properties in Thailand.",
      overview: "From minor repairs to major renovations, SiamEZ connects you with skilled, licensed contractors and handymen. We handle everything from finding the right professionals to project management, ensuring quality workmanship and timely completion. Our network includes electricians, plumbers, carpenters, painters, and general contractors.",
      features: [
        {
          icon: Shield,
          title: "Licensed Professionals",
          description: "All contractors are licensed and insured for your peace of mind.",
        },
        {
          icon: CheckCircle,
          title: "Quality Guaranteed",
          description: "We ensure quality workmanship and follow-up on all projects.",
        },
      ],
      requirements: [
        "Clear description of work needed",
        "Property address and access details",
        "Preferred timeline and budget",
        "Any specific requirements or preferences",
      ],
      processSteps: [
        {
          title: "Step 1: Project Consultation",
          description: "Discuss your project needs, timeline, and budget. We assess the scope of work.",
        },
        {
          title: "Step 2: Contractor Matching",
          description: "We match you with qualified contractors suited to your specific project.",
        },
        {
          title: "Step 3: Quote & Agreement",
          description: "Receive detailed quotes and agree on terms, timeline, and payment schedule.",
        },
        {
          title: "Step 4: Project Execution",
          description: "Contractors complete the work with our project management and quality oversight.",
        },
      ],
      documents: {
        foreigner: [
          "Property Ownership or Rental Agreement",
          "Project Description & Requirements",
          "Budget Estimate",
          "Access Permissions",
        ],
      },
      processingTime: "Varies by Project",
    },
    "vehicle-registration": {
      subtitle:
        "Professional car and motorcycle registration in Bangkok — one-day process for qualifying BKK-plated vehicles.",
      overview:
        "SiamEZ provides professional vehicle registration assistance across Thailand. Whether you need to transfer ownership, renew your tax and insurance, change plates, or update your registration book, our team handles the paperwork and DLT (Department of Land Transport) process so you can focus on what matters.\n\nWe specialize in Bangkok one-day processing for both cars and motorcycles. For BKK-plated vehicles, we can often complete your registration within a single working day. Vehicles from other provinces may require additional time, and our team will provide a clear timeline when you inquire.\n\nWhat we handle: ownership transfers; tax and insurance renewals; plate changes; color or engine updates in the book; lost book replacement; and documentation for modified vehicles. Contact us with your specific situation — we will advise on the process and cost.\n\nPricing is transparent and listed below. Contact us via LINE, email, or phone to get started, ask about other provinces, or submit documents for online inspection.",
      features: [
        {
          icon: Car,
          title: "Bangkok one-day processing",
          description:
            "For BKK plates, we can often complete registration in one working day when the vehicle meets requirements.",
        },
        {
          icon: Shield,
          title: "DLT paperwork handled",
          description:
            "We manage forms, submissions, and coordination with the Department of Land Transport on your behalf.",
        },
        {
          icon: FileText,
          title: "Online document inspection",
          description:
            "Submit your documents for review before you visit so we can confirm everything is in order.",
        },
      ],
      requirements: [
        "Cars: vehicle must be original, with no modifications, and no excessive black smoke.",
        "Motorcycles: vehicle must be original, with no loud or illegal exhaust.",
        "Cases with missing documents or non-standard modifications may require staff inspection — we will advise after review.",
      ],
      processSteps: [
        {
          title: "Contact us",
          description:
            "Reach us on LINE, email, or phone. You can submit documents for online inspection; we separate our service fees from DLT (government) fees.",
        },
        {
          title: "Timeline and preparation",
          description:
            "We confirm whether Bangkok one-day processing applies (typically BKK plates) or a longer timeline for other provinces.",
        },
        {
          title: "DLT and submissions",
          description:
            "We prepare your file and handle the Department of Land Transport process as agreed.",
        },
        {
          title: "Registration complete",
          description:
            "You receive updated registration, plates, or renewals as applicable, with clear next steps for tax and insurance where needed.",
        },
      ],
      documents: {
        foreigner: [
          "Vehicle ownership or purchase documents (as applicable)",
          "Valid passport or ID",
          "Proof of address or residence where required by DLT",
          "Compulsory motor insurance (Por Ror Bor) and prior registration book for transfers or renewals",
          "Invoice from a registered dealer (required for engine changes)",
          "Existing plates, tax stickers, and any prior DLT correspondence",
          "Power of attorney if another person will act on your behalf",
        ],
      },
      processingTime: "Bangkok (BKK plates): often 1 business day; other provinces: timeline on inquiry",
      pricingSections: [
        {
          title: "Car registration — service fees (Bangkok process)",
          rows: [
            { label: "BKK plate", price: "3,500 THB" },
            { label: "Other province plate", price: "+1,500 THB" },
            { label: "Swap plate", price: "1,500 THB" },
          ],
          vehicleRequirements: "Must be original, no modifications, no black smoke.",
          footnote: "* Not including DLT fees.",
        },
        {
          title: "Motorcycle registration — service fees (Bangkok process)",
          rows: [
            { label: "BKK plate", price: "2,000 THB" },
            { label: "Different province", price: "+1,000 THB" },
            { label: "Renew tax / insurance (under 5 years)", price: "700 THB" },
            { label: "Renew tax / insurance (over 5 years)", price: "1,200 THB" },
          ],
          vehicleRequirements: "Must be original, no loud exhaust.",
          footnote: "* Not including DLT fees.",
        },
      ],
      additionalServicesTable: [
        { service: "Change color", price: "1,000 THB", notes: "—" },
        { service: "Change engine", price: "1,000 THB", notes: "Requires invoice" },
        { service: "Lost book (green / blue)", price: "1,500 THB", notes: "Must be owner" },
        { service: "Exhaust over 95 dB", price: "1,500 – 2,500 THB", notes: "—" },
        { service: "Missing documents", price: "—", notes: "Staff inspection required" },
      ],
      legalDisclaimer:
        "SiamEZ offers professional assistance and consultancy services as an independent company. We are not connected to or endorsed by the Thai government.",
      galleryVideoSrc: "/images/services/vehicle-registration/registration-video.mp4",
      galleryImages: [
        {
          src: "/images/services/vehicle-registration/registration-honda-click.png",
          alt: "Customer with Thai vehicle tax sticker for year 2570 next to a white Honda Click motorcycle",
          width: 619,
          height: 1024,
        },
        {
          src: "/images/services/vehicle-registration/registration-honda-crv.png",
          alt: "Customer holding vehicle registration document next to a gray Honda CR-V with hood open",
          width: 1024,
          height: 768,
        },
        {
          src: "/images/services/vehicle-registration/registration-kawasaki-ninja.png",
          alt: "Customer with green registration card next to a lime green Kawasaki Ninja motorcycle",
          width: 1024,
          height: 768,
        },
        {
          src: "/images/services/vehicle-registration/registration-minivan.png",
          alt: "Customer holding blue Thai vehicle registration booklet in front of a silver minivan",
          width: 768,
          height: 1024,
        },
        {
          src: "/images/services/vehicle-registration/registration-bmw.png",
          alt: "Customer with vehicle registration document next to a dark BMW SUV",
          width: 768,
          height: 1024,
        },
      ],
    },
    "transportation-services": {
      subtitle: "Reliable airport transfers, city tours, and inter-city transportation with comfortable, well-maintained vehicles.",
      overview: "SiamEZ provides professional transportation services throughout Thailand. From airport pickups to city tours and inter-city travel, we offer comfortable vehicles with experienced drivers. Our fleet includes sedans, SUVs, vans, and buses to accommodate any group size.",
      features: [
        {
          icon: Shield,
          title: "Safe & Reliable",
          description: "All vehicles are well-maintained and drivers are licensed and experienced.",
        },
        {
          icon: Clock,
          title: "Punctual Service",
          description: "On-time pickups and drop-offs guaranteed.",
        },
      ],
      requirements: [
        "Pickup and destination addresses",
        "Date and time of service",
        "Number of passengers",
        "Luggage requirements",
        "Special requests (if any)",
      ],
      processSteps: [
        {
          title: "Step 1: Booking Request",
          description: "Contact us with your transportation needs including dates, times, and locations.",
        },
        {
          title: "Step 2: Quote & Confirmation",
          description: "Receive a quote for your trip and confirm the booking with payment details.",
        },
        {
          title: "Step 3: Vehicle Assignment",
          description: "We assign an appropriate vehicle and driver for your trip.",
        },
        {
          title: "Step 4: Service Delivery",
          description: "Enjoy your comfortable ride with our professional driver.",
        },
      ],
      documents: {
        foreigner: [
          "Contact Information",
          "Pickup/Destination Details",
          "Flight Information (for airport transfers)",
          "Special Requirements",
        ],
      },
      processingTime: "Same Day - Advance Booking",
    },
    "private-driver-service": {
      subtitle: "Professional private drivers for daily use, business trips, or special occasions with flexible packages.",
      overview: "Need a reliable driver for daily commutes, business meetings, or special events? SiamEZ offers private driver services with flexible packages. Our professional drivers are experienced, punctual, and familiar with Bangkok and surrounding areas. Choose from hourly, daily, or monthly packages.",
      features: [
        {
          icon: Shield,
          title: "Professional Drivers",
          description: "All drivers are licensed, experienced, and background-checked.",
        },
        {
          icon: Clock,
          title: "Flexible Packages",
          description: "Hourly, daily, or monthly packages to suit your needs.",
        },
      ],
      requirements: [
        "Service duration and schedule",
        "Preferred vehicle type",
        "Regular routes or destinations",
        "Special requirements",
      ],
      processSteps: [
        {
          title: "Step 1: Service Consultation",
          description: "Discuss your driving needs, schedule, and preferred vehicle type.",
        },
        {
          title: "Step 2: Package Selection",
          description: "Choose from hourly, daily, or monthly packages that best fit your needs.",
        },
        {
          title: "Step 3: Driver Assignment",
          description: "We assign a professional driver familiar with your routes and requirements.",
        },
        {
          title: "Step 4: Service Commencement",
          description: "Begin your private driver service with regular updates and support.",
        },
      ],
      documents: {
        foreigner: [
          "Contact Information",
          "Service Schedule",
          "Vehicle Preferences",
          "Route Information",
        ],
      },
      processingTime: "1 - 3 Business Days",
    },
  };

  return content[slug] || {
    subtitle: "Professional assistance for your needs in Thailand.",
    overview: "We provide comprehensive support to help you navigate the process smoothly and efficiently.",
    features: [
      {
        icon: Shield,
        title: "Expert Guidance",
        description: "Professional support at every step.",
      },
      {
        icon: Clock,
        title: "Fast Service",
        description: "Quick turnaround times.",
      },
    ],
    requirements: [
      "Valid identification documents",
      "Completed application forms",
      "Required supporting documents",
    ],
    processSteps: [
      {
        title: "Step 1: Consultation",
        description: "Initial consultation to understand your needs.",
      },
      {
        title: "Step 2: Document Preparation",
        description: "We help prepare all necessary documents.",
      },
      {
        title: "Step 3: Submission",
        description: "Submit your application with our assistance.",
      },
      {
        title: "Step 4: Follow-up",
        description: "We track your application and keep you updated.",
      },
    ],
    documents: {
      foreigner: [
        "Valid Passport",
        "Application Forms",
        "Supporting Documents",
      ],
    },
  };
};

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  
  // Validate slug exists in config
  if (!serviceSlugs.includes(slug as ServiceSlug)) {
    notFound();
  }
  
  const [service, t, tCommon, tDriverLicense, tEventPlanning] = await Promise.all([
    getServiceBySlug(slug).catch(() => null),
    getTranslations("services"),
    getTranslations("common"),
    slug === "driver-license"
      ? getTranslations({ locale, namespace: "driverLicensePage" })
      : Promise.resolve(null),
    slug === "event-planning-venue-services"
      ? getTranslations({ locale, namespace: "eventPlanningVenuePage" })
      : Promise.resolve(null),
  ]);

  const content: ServiceDetailContent = tEventPlanning
    ? buildEventPlanningServiceContent(tEventPlanning)
    : tDriverLicense
      ? buildDriverLicenseServiceContent(tDriverLicense)
      : getServiceContent(slug);
  const displayName = serviceDisplayNames[slug as ServiceSlug] || service?.name || slug;

  // Create fallback service object if database unavailable
  // Basic package from siam-ez.com; formatCurrency divides by 100 (satang)
  const defaultPrice =
    slug === "marriage-registration" ? 850000 : slug === "driver-license" ? 350000 : null;

  const serviceData = service
    ? { ...service, priceAmount: service.priceAmount ?? defaultPrice }
    : {
        name: displayName,
        shortDescription: serviceShortDescriptions[slug as ServiceSlug] || null,
        description: content.overview,
        priceAmount: defaultPrice,
        priceCurrency: "THB" as const,
        slug,
      };

  // Breadcrumbs
  const breadcrumbs = [
    { label: tCommon("home") || "Home", href: "/" },
    { label: t("title") || "Services", href: "/services" },
    { label: displayName, href: `/services/${slug}` },
  ];

  const vehicleRegistrationMediaTab =
    content.galleryVideoSrc || (content.galleryImages && content.galleryImages.length > 0) ? (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {content.galleryTitle ?? "Recent registrations"}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {content.galleryDescription ??
              (content.galleryVideoSrc
                ? "Short clip from our Bangkok registration work, plus photos of real customers we have helped with car and motorcycle registration."
                : "Photos from real customers we have helped with car and motorcycle registration in Bangkok.")}
          </p>
        </div>
        {content.galleryVideoSrc ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-black shadow-sm dark:border-gray-700">
            <video
              className="aspect-video w-full max-h-[70vh] object-contain"
              controls
              playsInline
              preload="metadata"
              aria-label={
                content.galleryVideoAriaLabel ??
                "SiamEZ vehicle registration services — recent registrations video"
              }
            >
              <source src={content.galleryVideoSrc} type="video/mp4" />
            </video>
          </div>
        ) : null}
        {(content.galleryImages?.length ?? 0) > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {(content.galleryImages ?? []).map((img, idx) => (
              <figure
                key={`${img.src}-${idx}`}
                className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm dark:border-gray-700 dark:bg-gray-800/50"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={img.width}
                  height={img.height}
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="h-auto w-full object-cover"
                />
              </figure>
            ))}
          </div>
        ) : null}
      </div>
    ) : undefined;

  const serviceMediaTab =
    slug === "event-planning-venue-services" ? <RedDoorVenueGallery /> : vehicleRegistrationMediaTab;

  const resolvedMediaTabLabel =
    slug === "event-planning-venue-services" && tEventPlanning
      ? tEventPlanning("galleryTabLabel")
      : vehicleRegistrationMediaTab
        ? t("mediaTab")
        : undefined;

  return (
    <>
      <ServiceDetailHero
        title={
          slug === "event-planning-venue-services" && tEventPlanning
            ? tEventPlanning("heroTitle")
            : serviceData.name
        }
        subtitle={content.subtitle}
        breadcrumbs={breadcrumbs}
        showPremiumTag={slug === "marriage-registration"}
        badge={
          tDriverLicense
            ? tDriverLicense("heroBadge")
            : tEventPlanning
              ? tEventPlanning("heroBadge")
              : undefined
        }
      />

      <div className="bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 lg:grid lg:grid-cols-3 lg:gap-8 lg:px-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <ServiceDetailTabs
              tabLabels={{
                overview: t("overview"),
                requirements: t("requirements"),
                process: t("processSteps"),
                documents: t("requiredDocuments"),
              }}
              media={serviceMediaTab}
              mediaTabLabel={resolvedMediaTabLabel}
              overview={
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Service Overview</h2>
                    <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-gray-700 dark:text-gray-300">
                      {content.overview}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {content.features.map((feature, idx) => {
                      const Icon = feature.icon;
                      return (
                        <Card key={idx} className="border-0 bg-gray-50 shadow-sm dark:bg-gray-800/50">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-siam-blue text-white">
                                <Icon className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100">{feature.title}</h3>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  {slug === "driver-license" ? <DriverLicenseExtras /> : null}
                  {slug === "event-planning-venue-services" ? (
                    <EventPlanningVenueSections locale={locale} />
                  ) : null}
                  {content.pricingSections && content.pricingSections.length > 0 ? (
                    <div className="space-y-10 border-t border-gray-200 pt-10 dark:border-gray-700">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Service fees</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Transparent service rates. DLT government fees are separate.
                        </p>
                      </div>
                      {content.pricingSections.map((section, sIdx) => (
                        <div key={sIdx}>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{section.title}</h3>
                          <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                            {section.rows.map((row, rIdx) => (
                              <li
                                key={rIdx}
                                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <span className="text-gray-700 dark:text-gray-300">{row.label}</span>
                                <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                  {row.price}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {section.vehicleRequirements ? (
                            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium text-gray-800 dark:text-gray-200">Vehicle requirements: </span>
                              {section.vehicleRequirements}
                            </p>
                          ) : null}
                          {section.footnote ? (
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">{section.footnote}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {content.additionalServicesTable && content.additionalServicesTable.length > 0 ? (
                    <div className="space-y-4 border-t border-gray-200 pt-10 dark:border-gray-700">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Additional services</h2>
                      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full min-w-[280px] text-left text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-800/80">
                            <tr>
                              <th className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Service</th>
                              <th className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Price</th>
                              <th className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {content.additionalServicesTable.map((row, i) => (
                              <tr key={i} className="bg-white dark:bg-gray-900/40">
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.service}</td>
                                <td className="px-4 py-3 font-medium tabular-nums text-gray-900 dark:text-gray-100">
                                  {row.price}
                                </td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.notes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                  {content.legalDisclaimer ? (
                    <p className="border-t border-gray-200 pt-8 text-sm italic text-gray-500 dark:border-gray-700 dark:text-gray-500">
                      {content.legalDisclaimer}
                    </p>
                  ) : null}
                </div>
              }
              requirements={
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Requirements</h2>
                  <ul className="space-y-4">
                    {content.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                        <span className="text-base text-gray-700 dark:text-gray-300">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              }
              process={
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Process Steps</h2>
                  <div className="space-y-6">
                    {content.processSteps.map((step, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-siam-blue text-base font-semibold text-white">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{step.title}</h3>
                          <p className="mt-1 text-base text-gray-700 dark:text-gray-300">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              }
              documents={
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Required Documents</h2>
                  <Card className="border-0 bg-gray-50 shadow-sm dark:bg-gray-800/50">
                    <CardContent className="p-6">
                      <div className="grid gap-8 sm:grid-cols-2">
                        <div>
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-siam-blue/10 text-siam-blue dark:bg-siam-blue/20">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <h3 className="font-semibold text-siam-blue dark:text-siam-blue-light">For the Foreigner</h3>
                          </div>
                          <ul className="space-y-3">
                            {content.documents.foreigner.map((doc, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-base text-gray-700 dark:text-gray-300">
                                <span className="text-gray-400 dark:text-gray-500 font-semibold">›</span>
                                <span>{doc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {content.documents.thaiPartner && (
                          <div>
                            <div className="mb-4 flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-siam-blue/10 text-siam-blue dark:bg-siam-blue/20">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <h3 className="font-semibold text-siam-blue dark:text-siam-blue-light">For the Thai Partner</h3>
                            </div>
                            <ul className="space-y-3">
                              {content.documents.thaiPartner.map((doc, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-base text-gray-700 dark:text-gray-300">
                                  <span className="text-gray-400 dark:text-gray-500 font-semibold">›</span>
                                  <span>{doc}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              }
            />

            {slug === "marriage-registration" ? <MarriageRegistrationSections /> : null}
          </div>

          {/* Sidebar */}
          <div className="mt-8 lg:mt-0">
            <ServiceDetailSidebar
              priceAmount={serviceData.priceAmount}
              priceCurrency={serviceData.priceCurrency ?? "THB"}
              processingTime={content.processingTime}
              visaDuration={content.visaDuration}
              serviceSlug={serviceData.slug}
              showBestValue={slug === "marriage-registration"}
              helpDescription={slug === "marriage-registration" ? t("marriageHelpBlurb") : undefined}
            />
          </div>
        </div>
      </div>
    </>
  );
}
