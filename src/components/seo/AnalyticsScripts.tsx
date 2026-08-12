import Script from "next/script";

function envId(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/**
 * Initializes `dataLayer` so `trackEvent()` always has a sink.
 * Loads GTM when `NEXT_PUBLIC_GTM_ID` is set.
 * Loads gtag GA4/Ads only when GTM is NOT set, to avoid duplicate tags.
 */
export function AnalyticsScripts() {
  const gtmId = envId("NEXT_PUBLIC_GTM_ID");
  const gaId = envId("NEXT_PUBLIC_GA_MEASUREMENT_ID");
  const adsId = envId("NEXT_PUBLIC_GOOGLE_ADS_ID");

  return (
    <>
      <Script id="siamez-datalayer" strategy="beforeInteractive">
        {`window.dataLayer=window.dataLayer||[];`}
      </Script>
      {gtmId ? (
        <Script id="siamez-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':Date.now(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      ) : null}
      {!gtmId && gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="siamez-gtag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');${adsId ? `gtag('config','${adsId}');` : ""}`}
          </Script>
        </>
      ) : null}
    </>
  );
}

export function GtmNoscript() {
  const gtmId = envId("NEXT_PUBLIC_GTM_ID");
  if (!gtmId) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
