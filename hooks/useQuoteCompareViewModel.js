import { useMemo } from "react";
import { buildQuoteCompareViewModel } from "@/utils/quoteCompareViewModel";

const useQuoteCompareViewModel = ({ quotes = [], normalizeFilter = false }) => {
  return useMemo(
    () => buildQuoteCompareViewModel(quotes, normalizeFilter),
    [quotes, normalizeFilter]
  );
};

export default useQuoteCompareViewModel;
