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

export const validateMapping = ({ selectedCompanyId, mappingLevel, hotelId }) => {
  if (!selectedCompanyId) return "Please select a company.";
  if (mappingLevel === "hotel" && !hotelId) return "Please select a business unit.";
  return null;
};
