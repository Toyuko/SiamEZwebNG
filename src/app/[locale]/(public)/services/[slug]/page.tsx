import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getServiceBySlug } from "@/data-access/service";
import { ServiceDetailHero } from "@/components/sections/ServiceDetailHero";
import { ServiceDetailTabs } from "@/components/sections/ServiceDetailTabs";
import { ServiceDetailSidebar } from "@/components/sections/ServiceDetailSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, Shield, FileText, Car, Plane, Wrench, ClipboardList, Bus, User, Award, Zap, CheckCircle } from "lucide-react";
import { serviceDisplayNames, serviceShortDescriptions, serviceSlugs } from "@/config/services";
import type { ServiceSlug } from "@/config/services";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug).catch(() => null);
  const t = await getTranslations("services");
  
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
const getServiceContent = (slug: string) => {
  const content: Record<string, {
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
  }> = {
    "marriage-registration": {
      subtitle: "A comprehensive guide and professional assistance to obtaining your marriage visa in Thailand with ease and full legal compliance.",
      overview: "Navigating the legal landscape of marriage registration and visa applications in Thailand can be daunting. SiamEZ offers a seamless, end-to-end solution that handles everything from document translation and legalization at the Ministry of Foreign Affairs to the final submission at the District Office (Amphur) and the Immigration Bureau.",
      features: [
        {
          icon: Shield,
          title: "100% Legal Guarantee",
          description: "All processes follow official Thai laws and regulations.",
        },
        {
          icon: Clock,
          title: "Fast Tracking",
          description: "Expedited handling for urgent marriage registrations.",
        },
      ],
      requirements: [
        "Both parties must be at least 17 years old (or of legal age in their home country).",
        "Neither party should be insane or adjudged incompetent.",
        "For Visa: Proof of 400,000 THB in a Thai bank account OR a monthly income of at least 40,000 THB.",
        "Valid Passport and Affirmation of Freedom to Marry from your Embassy.",
      ],
      processSteps: [
        {
          title: "Step 1: Affirmation of Freedom to Marry",
          description: "Obtain the document from your respective embassy in Bangkok. We provide assistance with scheduling and form preparation.",
        },
        {
          title: "Step 2: Translation & Legalization",
          description: "We translate your documents into Thai and have them legalized by the Ministry of Foreign Affairs (MFA).",
        },
        {
          title: "Step 3: Registration at Amphur",
          description: "Official marriage registration at the local district office. We provide witnesses and translation services during the ceremony.",
        },
        {
          title: "Step 4: Marriage Visa (Non-O)",
          description: "Filing for the initial 90-day visa followed by the 1-year extension based on marriage at Thai Immigration.",
        },
      ],
      documents: {
        foreigner: [
          "Original Passport",
          "Affirmation of Freedom to Marry",
          "Work Permit (if applicable)",
          "Financial Proof (400k THB / 40k Salary)",
        ],
        thaiPartner: [
          "Thai ID Card",
          "House Registration (Tabien Baan)",
          "Divorce Certificate (if applicable)",
          "Change of Name Certificate (if any)",
        ],
      },
      processingTime: "3 - 5 Weeks",
      visaDuration: "12 Months (Non-O)",
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
    "driver-license": {
      subtitle: "Expert assistance obtaining or converting your Thai driver's license with minimal hassle and maximum convenience.",
      overview: "Navigating the Thai driver's license process can be complex, especially for foreigners. SiamEZ simplifies the entire process, from document preparation to the final license issuance. Whether you're converting an international license or obtaining a new Thai license, we handle all the paperwork and guide you through each step.",
      features: [
        {
          icon: Shield,
          title: "Full Compliance",
          description: "All processes follow Thai Department of Land Transport regulations.",
        },
        {
          icon: Clock,
          title: "Efficient Process",
          description: "Streamlined procedures to get your license faster.",
        },
      ],
      requirements: [
        "Valid passport with non-immigrant visa",
        "Medical certificate from a Thai hospital",
        "Residence certificate from Immigration or Embassy",
        "Original driver's license from home country (for conversion)",
      ],
      processSteps: [
        {
          title: "Step 1: Document Preparation",
          description: "We help you gather and prepare all required documents including medical certificate and residence certificate.",
        },
        {
          title: "Step 2: Application Submission",
          description: "Submit your application at the Department of Land Transport (DLT) office with our assistance.",
        },
        {
          title: "Step 3: Theory Test & Practical Test",
          description: "Complete the written theory test and practical driving test. We provide study materials and guidance.",
        },
        {
          title: "Step 4: License Issuance",
          description: "Receive your Thai driver's license. Temporary license is issued immediately, permanent license follows.",
        },
      ],
      documents: {
        foreigner: [
          "Valid Passport with Non-Immigrant Visa",
          "Medical Certificate (from Thai hospital)",
          "Residence Certificate",
          "Original Home Country License (for conversion)",
          "Passport-sized Photos",
        ],
      },
      processingTime: "1 - 2 Weeks",
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
      subtitle: "Complete car and motorcycle registration services including transfers, renewals, and documentation assistance.",
      overview: "Vehicle registration in Thailand involves multiple steps and documentation. SiamEZ simplifies the process for both new registrations and transfers. We handle all paperwork, coordinate with the Department of Land Transport, and ensure your vehicle is properly registered and road-legal.",
      features: [
        {
          icon: Shield,
          title: "Full Compliance",
          description: "All registrations comply with Department of Land Transport regulations.",
        },
        {
          icon: Clock,
          title: "Efficient Service",
          description: "Streamlined process to get your vehicle registered quickly.",
        },
      ],
      requirements: [
        "Vehicle ownership documents",
        "Valid identification (passport for foreigners)",
        "Residence certificate",
        "Insurance certificate",
        "Previous registration (for transfers)",
      ],
      processSteps: [
        {
          title: "Step 1: Document Verification",
          description: "We verify all required documents and ensure everything is in order.",
        },
        {
          title: "Step 2: Application Preparation",
          description: "Complete all necessary forms and prepare the registration application.",
        },
        {
          title: "Step 3: DLT Submission",
          description: "Submit your application at the Department of Land Transport office.",
        },
        {
          title: "Step 4: Registration Completion",
          description: "Receive your vehicle registration and license plates.",
        },
      ],
      documents: {
        foreigner: [
          "Vehicle Purchase Documents",
          "Valid Passport",
          "Residence Certificate",
          "Insurance Certificate",
          "Previous Registration (if transferring)",
          "Power of Attorney (if applicable)",
        ],
      },
      processingTime: "3 - 7 Business Days",
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
  
  const [service, t, tCommon] = await Promise.all([
    getServiceBySlug(slug).catch(() => null),
    getTranslations("services"),
    getTranslations("common"),
  ]);

  const content = getServiceContent(slug);
  const displayName = serviceDisplayNames[slug as ServiceSlug] || service?.name || slug;
  
  // Create fallback service object if database unavailable
  // Set default price for marriage registration to match design (15,000 THB)
  // formatCurrency divides by 100, so 1500000 satang = 15,000 THB
  const defaultPrice = slug === "marriage-registration" ? 1500000 : null;
  
  const serviceData = service || {
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

  return (
    <>
      <ServiceDetailHero
        title={serviceData.name}
        subtitle={content.subtitle}
        breadcrumbs={breadcrumbs}
        showPremiumTag={slug === "marriage-registration"}
      />

      <div className="bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 lg:grid lg:grid-cols-3 lg:gap-8 lg:px-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <ServiceDetailTabs
              overview={
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Service Overview</h2>
                    <p className="mt-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">{content.overview}</p>
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
            />
          </div>
        </div>
      </div>
    </>
  );
}
