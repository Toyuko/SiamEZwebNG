import type { DetailedHTMLProps, HTMLAttributes } from "react";

type GmpxApiLoaderProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  "solution-channel"?: string;
};

type GmpxStoreLocatorProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  "map-id"?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "gmpx-api-loader": GmpxApiLoaderProps;
      "gmpx-store-locator": GmpxStoreLocatorProps;
    }
  }
}
