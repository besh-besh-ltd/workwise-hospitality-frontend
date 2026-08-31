/**
 * Hospitality user↔company/hotel mapping helpers, shared across the admin module.
 *
 * `tbl_hospitality_user_mappings` is UNIQUE on
 * (user_id, mapping_type, hospitality_company_id, hospitality_hotel_id), but the
 * API returns mappings joined across several sources and the same logical
 * mapping can therefore appear more than once in a response. Deduping on the
 * full tuple — rather than on whichever parts happen to be implicit at a given
 * call site — keeps every caller agreeing on what "one mapping" means.
 *
 * This used to exist as three near-copies (accessUtils, UserRow,
 * HospitalityManager), each omitting the key part its own context made
 * constant. They agreed in practice but only by accident of context.
 */
export const dedupeHospitalityMappings = (list = []) => {
  const seen = new Set();
  return list.filter((item) => {
    const key =
      item.mapping_type === 0
        ? `company-${item.hospitality_company_id}-${item.user_id}`
        : `hotel-${item.hospitality_company_id}-${item.hospitality_hotel_id}-${item.user_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
