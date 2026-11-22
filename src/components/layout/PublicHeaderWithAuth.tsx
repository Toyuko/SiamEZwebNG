import { PublicHeader } from "./PublicHeader";

/**
 * Public chrome header. Session is hydrated client-side so marketing pages are not
 * blocked on auth() during SSR / soft navigation.
 */
export function PublicHeaderWithAuth() {
  return <PublicHeader />;
}
