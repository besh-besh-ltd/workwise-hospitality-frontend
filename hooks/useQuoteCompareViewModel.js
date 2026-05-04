import { useMemo } from "react";
import { buildQuoteCompareViewModel } from "@/utils/quoteCompareViewModel";

const useQuoteCompareViewModel = ({ quotes = [], normalizeFilter = false, vendorRejections = [] }) => {
  return useMemo(
    () => buildQuoteCompareViewModel(quotes, normalizeFilter, vendorRejections),
    [quotes, normalizeFilter, vendorRejections]
  );
};

export default useQuoteCompareViewModel;
