import React, { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { Search, Building2, Tag, ChevronDown, ChevronRight, Package, CheckCircle, XCircle, ChevronLeft } from "lucide-react";
import { vendorProductList } from "@/services/products";
import { getVendorMappings } from "@/services/hospitality";
import styles from "./ProductManagement.module.scss";

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [limit] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [mappings, setMappings] = useState({ hotels: [], categories: { main_categories: [], standalone_subcategories: [] } });
  const [mappingsLoading, setMappingsLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState({});

  const fetchProducts = useCallback(() => {
    setLoading(true);
    vendorProductList(limit, page, search, "")
      .then((res) => {
        setTotalPages(Math.ceil(res.total_count / limit));
        setProducts(res.data || []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [limit, page, search]);

  const fetchMappings = useCallback(async () => {
    setMappingsLoading(true);
    try {
      const res = await getVendorMappings();
      const d = res?.data || res;
      setMappings({
        hotels: d?.hotels || [],
        categories: d?.categories || { main_categories: [], standalone_subcategories: [] },
      });
    } catch { }
    finally { setMappingsLoading(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchMappings(); }, []);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleSearchKey = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const hotels = mappings.hotels;
  const mainCats = mappings.categories.main_categories;
  const standaloneSubs = mappings.categories.standalone_subcategories;
  const hasMappings = hotels.length > 0 || mainCats.length > 0 || standaloneSubs.length > 0;

  const SkeletonMappings = () => (
    <div className={styles.skeletonMappingsGrid}>
      {/* Hotels skeleton */}
      <div className={styles.skeletonMappingCard}>
        <div className={styles.skeletonMappingHeader}>
          <div className={`${styles.shimmerBar} ${styles.skeletonMappingIcon}`} />
          <div className={styles.skeletonMappingHeaderText}>
            <div className={styles.shimmerBar} style={{ width: 100, height: 13 }} />
            <div className={styles.shimmerBar} style={{ width: 60, height: 10 }} />
          </div>
        </div>
        <div className={styles.skeletonMappingBody}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skeletonHotelRow}>
              <div className={`${styles.shimmerBar} ${styles.skeletonDot}`} />
              <div className={styles.skeletonHotelInfo}>
                <div className={styles.shimmerBar} style={{ width: 120, height: 13 }} />
                <div className={styles.shimmerBar} style={{ width: 70, height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Categories skeleton */}
      <div className={styles.skeletonMappingCard}>
        <div className={styles.skeletonMappingHeader}>
          <div className={`${styles.shimmerBar} ${styles.skeletonMappingIcon}`} />
          <div className={styles.skeletonMappingHeaderText}>
            <div className={styles.shimmerBar} style={{ width: 130, height: 13 }} />
            <div className={styles.shimmerBar} style={{ width: 90, height: 10 }} />
          </div>
        </div>
        <div className={styles.skeletonMappingBody}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCatRow}>
              <div className={styles.shimmerBar} style={{ width: 13, height: 13 }} />
              <div className={styles.shimmerBar} style={{ width: 100 + i * 20, height: 13 }} />
              <div className={styles.shimmerBar} style={{ width: 22, height: 16, borderRadius: 999 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const SkeletonTableRows = () => (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          <td>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className={styles.shimmerBar} style={{ width: 14, height: 14, borderRadius: 3 }} />
              <div className={styles.shimmerBar} style={{ width: 100 + (i % 3) * 30, height: 13 }} />
            </div>
          </td>
          <td>
            <div className={styles.shimmerBar} style={{ width: 64, height: 22, borderRadius: 999 }} />
          </td>
          <td>
            <div className={styles.shimmerBar} style={{ width: 80, height: 22, borderRadius: 5 }} />
          </td>
          <td>
            <div style={{ display: "flex", gap: 4 }}>
              <div className={styles.shimmerBar} style={{ width: 60, height: 20, borderRadius: 4 }} />
              <div className={styles.shimmerBar} style={{ width: 50, height: 20, borderRadius: 4 }} />
            </div>
          </td>
        </tr>
      ))}
    </>
  );

  return (
    <>
      <Head><title>Product Management | Vendor</title></Head>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Product Management</h1>
        <p className={styles.pageSubtitle}>Your mapped hotels, subscribed categories, and product inventory.</p>

        {/* ── Mappings Section ── */}
        {mappingsLoading && <SkeletonMappings />}
        {!mappingsLoading && hasMappings && (
          <div className={styles.mappingsGrid}>
            {/* Hotels */}
            {hotels.length > 0 && (
              <div className={styles.mappingCard}>
                <div className={styles.mappingHeader}>
                  <div className={`${styles.mappingIcon} ${styles.iconBlue}`}><Building2 size={16} /></div>
                  <div>
                    <span className={styles.mappingTitle}>Mapped Hotels</span>
                    <span className={styles.mappingCount}>{hotels.length} hotel{hotels.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className={styles.mappingBody}>
                  {hotels.map((h) => (
                    <div key={h.id || h.hotel_id} className={styles.hotelRow}>
                      <span className={styles.greenDot} />
                      <div className={styles.hotelInfo}>
                        <span className={styles.hotelName}>{h.hotel_name || h.name}</span>
                        {(h.city || h.location) && <span className={styles.hotelCity}>{h.city || h.location}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {(mainCats.length > 0 || standaloneSubs.length > 0) && (
              <div className={styles.mappingCard}>
                <div className={styles.mappingHeader}>
                  <div className={`${styles.mappingIcon} ${styles.iconGreen}`}><Tag size={16} /></div>
                  <div>
                    <span className={styles.mappingTitle}>Subscribed Categories</span>
                    <span className={styles.mappingCount}>
                      {mainCats.length} categor{mainCats.length !== 1 ? "ies" : "y"}
                      {standaloneSubs.length > 0 && ` · ${standaloneSubs.length} sub-categor${standaloneSubs.length !== 1 ? "ies" : "y"}`}
                    </span>
                  </div>
                </div>
                <div className={styles.mappingBody}>
                  {mainCats.map((cat) => {
                    const hasSubs = cat.sub_categories?.length > 0;
                    const isOpen = !!expandedCats[cat.category_id];
                    return (
                      <div key={cat.category_id} className={styles.catGroup}>
                        <div
                          className={styles.catRow}
                          onClick={() => hasSubs && setExpandedCats((p) => ({ ...p, [cat.category_id]: !p[cat.category_id] }))}
                          style={{ cursor: hasSubs ? "pointer" : "default" }}
                        >
                          {hasSubs
                            ? (isOpen ? <ChevronDown size={13} className={styles.catChevron} /> : <ChevronRight size={13} className={styles.catChevron} />)
                            : <Tag size={13} className={styles.catChevron} />}
                          <span className={styles.catName}>{cat.category_name}</span>
                          {hasSubs && <span className={styles.catBadge}>{cat.sub_categories.length}</span>}
                        </div>
                        {isOpen && hasSubs && (
                          <div className={styles.subCatWrap}>
                            {cat.sub_categories.map((sub) => (
                              <span key={sub.category_id} className={styles.subCatTag}>{sub.category_name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {standaloneSubs.length > 0 && (
                    <>
                      {mainCats.length > 0 && <div className={styles.catDividerLabel}>Other Sub-Categories</div>}
                      <div className={styles.subCatWrap}>
                        {standaloneSubs.map((sub) => (
                          <span key={sub.category_id} className={styles.subCatTag}>
                            {sub.category_name}
                            {sub.parent_category_name && <span className={styles.parentRef}> ({sub.parent_category_name})</span>}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Product List ── */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Your Products</h2>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search by product name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKey}
              />
              <button className={styles.searchBtn} onClick={handleSearch}>Search</button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Sub Categories</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonTableRows />
                ) : products.length === 0 ? (
                  <tr><td colSpan={4} className={styles.emptyCell}>No products found.</td></tr>
                ) : products.map((item) => (
                  <tr key={item.id}>
                    <td className={styles.productNameCell}>
                      <Package size={14} className={styles.productIcon} />
                      {item.name}
                    </td>
                    <td>
                      <span className={`${styles.statusPill} ${item.is_approve === 1 ? styles.statusActive : styles.statusInactive}`}>
                        {item.is_approve === 1 ? <><CheckCircle size={11} /> Active</> : <><XCircle size={11} /> Inactive</>}
                      </span>
                    </td>
                    <td>
                      {item.product_categories?.length > 0
                        ? <span className={styles.catPill}>{item.product_categories[0].category_name}</span>
                        : <span className={styles.noCat}>–</span>}
                    </td>
                    <td>
                      <div className={styles.subCatCellWrap}>
                        {item.product_categories?.slice(1).map((cat, i) => (
                          <span key={i} className={styles.subCatPill}>{cat.category_name}</span>
                        ))}
                        {(!item.product_categories || item.product_categories.length <= 1) && <span className={styles.noCat}>–</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button
                className={styles.pageBtn}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductManagement;
