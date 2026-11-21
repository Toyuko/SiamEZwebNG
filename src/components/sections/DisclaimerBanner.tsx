import { Info } from "lucide-react";

const defaultText =
  "SiamEZ offers professional assistance and consultancy services as an independent company. We are not connected to or endorsed by the Thai government.";

interface DisclaimerBannerProps {
  text?: string;
}

export function DisclaimerBanner({ text = defaultText }: DisclaimerBannerProps) {
  return (
    <div className="border-y border-siam-surface-pale bg-siam-surface/50 py-3 sm:py-4">
      <div className="container mx-auto flex items-start gap-3 px-4 motion-safe:animate-fade-in sm:gap-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-siam-blue sm:h-6 sm:w-6" />
        <p className="text-sm text-siam-ink-muted sm:text-base">{text}</p>
      </div>
    </div>
  );
}
