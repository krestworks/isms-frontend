import { brandingStore } from "@/data/brandingStore";
import { useSession } from "@/data/sessionStore";

interface BrandedDocHeaderProps {
  stationName?: string;
  docTitle?: string;
  docDate?: string;
  docRef?: string;
  /** Set true to hide the logo / logo placeholder (e.g. on payslips). */
  hideLogo?: boolean;
}

/**
 * Reusable print-ready header for all generated documents.
 * Shows business logo + name on the left and branch + doc info on the right.
 */
export function BrandedDocHeader({ stationName, docTitle, docDate, docRef, hideLogo = false }: BrandedDocHeaderProps) {
  const branding = brandingStore.get();
  const { activeLocation } = useSession();
  const branch = stationName ?? (activeLocation !== "All Locations" ? activeLocation : undefined);

  return (
    <div className="flex items-start justify-between border-b border-gray-300 pb-4 mb-6">
      {/* Left: logo + business name */}
      <div className="flex items-center gap-3">
        {!hideLogo && (branding?.logo ? (
          <img src={branding.logo} alt={branding.name} className="h-14 w-14 object-contain rounded" />
        ) : (
          <div className="h-14 w-14 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs font-bold">
            {(branding?.name ?? "ISMS").slice(0, 2).toUpperCase()}
          </div>
        ))}
        <div>
          <div className="text-lg font-bold text-gray-900">{branding?.name ?? "ISMS"}</div>
          {branding?.tagline && <div className="text-xs text-gray-500">{branding.tagline}</div>}
          {branding?.address && <div className="text-xs text-gray-500 mt-0.5">{branding.address}</div>}
          {(branding?.contactEmail || branding?.contactPhone) && (
            <div className="text-xs text-gray-500">
              {[branding.contactEmail, branding.contactPhone].filter(Boolean).join(" · ")}
            </div>
          )}
          {branding?.website && <div className="text-xs text-gray-400">{branding.website}</div>}
        </div>
      </div>

      {/* Right: branch + doc metadata */}
      <div className="text-right">
        {docTitle && (
          <div className="text-xl font-bold text-gray-800 uppercase tracking-wider">{docTitle}</div>
        )}
        {branch && (
          <div className="text-sm font-medium text-gray-700 mt-1">{branch}</div>
        )}
        {docDate && <div className="text-xs text-gray-500 mt-0.5">{docDate}</div>}
        {docRef && <div className="text-xs text-gray-400">Ref: {docRef}</div>}
      </div>
    </div>
  );
}
