import { useBranding } from "@/data/brandingStore";
import { useSession } from "@/data/sessionStore";

/** Convert any string to a URL-safe slug. */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Business slug derived from branding name, falling back to accountId. */
export function useBusinessSlug(): string {
  const branding = useBranding();
  const { user } = useSession();
  if (branding?.name) return slugify(branding.name) || "app";
  if (user.accountId) return user.accountId;
  return "app";
}

/**
 * All app navigation paths — pre-built with the correct business slug
 * and station query param when a specific station is active.
 *
 * Every navigate() call and Link href in the app should come from here
 * so slug + station context stay consistent automatically.
 */
export function useAppPaths() {
  const slug = useBusinessSlug();
  const { activeLocation } = useSession();

  const stationParam =
    activeLocation && activeLocation !== "All Locations"
      ? `?station=${encodeURIComponent(activeLocation)}`
      : "";

  const base = `/${slug}`;

  return {
    slug,
    base,
    dashboard:                base,
    fuel:                     `${base}/fuel${stationParam}`,
    lpg:                      `${base}/lpg${stationParam}`,
    water:                    `${base}/water${stationParam}`,
    automotive:               `${base}/automotive${stationParam}`,
    carwash:                  `${base}/carwash${stationParam}`,
    business:                 `${base}/business${stationParam}`,
    businessById:             (id: string) => `${base}/business/${id}`,
    inventory:                `${base}/inventory${stationParam}`,
    finance:                  `${base}/finance${stationParam}`,
    clients:                  `${base}/clients${stationParam}`,
    reports:                  `${base}/reports${stationParam}`,
    settings:                 `${base}/settings`,
    hr:                       `${base}/hr${stationParam}`,
    employeePortal:           `${base}/employee-portal`,
    employeePortalSection:    (section: string) => `${base}/employee-portal/${section}`,
    locations:                `${base}/locations`,
    accounts:                 `${base}/accounts`,
  };
}
