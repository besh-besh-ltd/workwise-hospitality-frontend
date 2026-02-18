import React from "react";
import { BsSearch } from "react-icons/bs";
import styles from "./Search.module.css";

const ProductSearch = ({
  searchProduct,
  onSearchChange,
  suggestions,
  suggestionLoading,
  isOpen,
  onSuggestionClick,
  onClose,
  searchRef,
  showHotelWarning,
}) => {
  return (
    <div className={styles.searchSection}>
      <div className={styles.searchWrapper} ref={searchRef}>
        <BsSearch className={styles.searchIcon} />
        <input
          className={`${styles.searchBar} ${
            showHotelWarning ? styles.searchBarDisabled : ""
          }`}
          type="text"
          name="search"
          id="search_vendors-search_bar-vendor_search_page"
          placeholder="Search for products to add... (e.g. Flanges, Pipes, Valves)"
          onChange={onSearchChange}
          onFocus={onSearchChange}
          autoComplete="off"
          value={searchProduct}
        />

        {/* Search helper text */}
        {!isOpen && !searchProduct && !showHotelWarning && (
          <div className={styles.searchHelper}>
            Type at least 3 characters to search across all available products
          </div>
        )}

        {/* Autocomplete Dropdown */}
        {isOpen && (
          <>
            <div className={styles.suggestions}>
              {/* Hotel selection required */}
              {showHotelWarning ? (
                <div className={styles.suggestionsMessage}>
                  <p className={styles.warningTitle}>
                    Please select at least one business unit
                  </p>
                  <small className={styles.warningHint}>
                    Use the business unit dropdown above to get started
                  </small>
                </div>
              ) : (
                <>
                  {/* Loading */}
                  {suggestionLoading && (
                    <div className={styles.suggestionsMessage}>
                      <span className={styles.suggestionsSpinner} />
                      Searching products...
                    </div>
                  )}

                  {/* Empty state */}
                  {!suggestionLoading && searchProduct === "" && (
                    <div className={styles.suggestionsMessage}>
                      Start typing a product name...
                    </div>
                  )}

                  {/* Min chars */}
                  {!suggestionLoading &&
                    searchProduct.length > 0 &&
                    searchProduct.length < 3 && (
                      <div className={styles.suggestionsMessage}>
                        Please enter at least 3 characters...
                      </div>
                    )}

                  {/* No results */}
                  {!suggestionLoading &&
                    searchProduct !== "" &&
                    searchProduct.length >= 3 &&
                    suggestions.length === 0 && (
                      <div className={styles.suggestionsMessage}>
                        No products found for &ldquo;{searchProduct}&rdquo;
                      </div>
                    )}

                  {/* Results */}
                  {!suggestionLoading &&
                    searchProduct !== "" &&
                    suggestions.length > 0 && (
                      <>
                        <div className={styles.suggestionsHeader}>
                          {suggestions.length} product
                          {suggestions.length !== 1 ? "s" : ""} found
                        </div>
                        {suggestions.map((item, index) => (
                          <div
                            key={`sp_${item.product_id || index}`}
                            className={styles.suggestionItem}
                            onClick={() => onSuggestionClick(item)}
                            id={`product_list_item_${
                              item.product_id || index
                            }-product_list-vendor_search_page`}
                          >
                            <div className={styles.suggestionContent}>
                              <div className={styles.suggestionName}>
                                {item.variant_name ?? item.product_name}
                              </div>
                              <div className={styles.suggestionMeta}>
                                {item.category_name}
                                {item.product_name &&
                                  item.category_name &&
                                  " | "}
                                {item.product_name}
                              </div>
                            </div>
                            {item.vendor_count !== undefined &&
                              parseInt(item.vendor_count) === 0 && (
                                <span className={styles.suggestionBadge}>
                                  No vendors
                                </span>
                              )}
                          </div>
                        ))}
                      </>
                    )}
                </>
              )}
            </div>

            {/* Overlay behind dropdown to detect outside clicks */}
            <div className={styles.blurOverlay} onClick={onClose} />
          </>
        )}
      </div>
    </div>
  );
};

export default ProductSearch;
