export type AuthSocialProviders = {
  google: boolean;
  facebook: boolean;
  line: boolean;
};

/** Server-only: which OAuth providers have credentials configured. */
export function getConfiguredSocialProviders(): AuthSocialProviders {
  const enableFacebook = process.env.AUTH_ENABLE_FACEBOOK === "true";
  return {
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    facebook: Boolean(
      enableFacebook && process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET
    ),
    line: Boolean(process.env.AUTH_LINE_ID && process.env.AUTH_LINE_SECRET),
  };
}

export function hasAnySocialProvider(providers: AuthSocialProviders): boolean {
  return providers.google || providers.facebook || providers.line;
}
