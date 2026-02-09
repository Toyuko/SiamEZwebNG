import { Info } from "lucide-react";

const defaultText =
  "SiamEZ offers professional assistance and consultancy services as an independent company. We are not connected to or endorsed by the Thai government.";

interface DisclaimerBannerProps {
  text?: string;
}

export function DisclaimerBanner({ text = defaultText }: DisclaimerBannerProps) {
  return (
    <div className="border-y border-border bg-gray-50 py-3 dark:bg-gray-800/50 sm:py-4">
      <div className="container mx-auto flex items-start gap-3 px-4 opacity-0 animate-fade-in sm:gap-4" style={{ animationDelay: "0.1s" }}>
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-siam-blue sm:h-6 sm:w-6" />
        <p className="text-sm text-foreground sm:text-base">{text}</p>
      </div>
    </div>
  );
}
