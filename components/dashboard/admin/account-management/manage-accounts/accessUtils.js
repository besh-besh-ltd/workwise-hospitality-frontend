export const validateMapping = ({ selectedCompanyId, mappingLevel, hotelId }) => {
  if (!selectedCompanyId) return "Please select a company.";
  if (mappingLevel === "hotel" && !hotelId) return "Please select a business unit.";
  return null;
};
