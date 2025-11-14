import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { nestedCategoryData } from '@/services/products';
import { textCapitalize } from '@/utils/sharedFunctions';

const NestedCategoryBrowser = ({ onGetProducts, onGetVendors, setSearchKey, onHide }) => {
  const router = useRouter();
  const [nestedItems, setNestedItems] = useState([]);
  const [categoryPath, setCategoryPath] = useState([]);
  const [nestedLoading, setNestedLoading] = useState(false);
  const [currentType, setCurrentType] = useState('category');
  const [selectedId, setSelectedId] = useState(null);
  const [relatedCategories, setRelatedCategories] = useState([]);
  const [previousLevelCategories, setPreviousLevelCategories] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllRelated, setShowAllRelated] = useState(false);

  // ✅ Add ref to track if we're currently navigating
  const isNavigatingRef = useRef(false);
  const lastFetchedRef = useRef({ categoryId: null, slug: null });
  // ✅ Store the category path before navigating to variant, so we can restore it when coming back
  const pathBeforeVariantRef = useRef([]);

  // ✅ Function to rebuild category path from URL
  // For direct navigation, we can only show the current category since we don't have parent hierarchy
  // The path will be built properly when clicking through categories
  const rebuildCategoryPathFromUrl = (categoryId, slugParam) => {
    if (!categoryId || categoryId === 0 || slugParam === 'all') {
      setCategoryPath([]);
      return;
    }

    // For direct navigation, we can only show current category
    // The full path will be maintained when clicking through categories
    const categoryName = slugParam.replace(/-/g, ' ');
    const currentUrl = `/vendor/${slugParam}-category${categoryId}`;
    const newPath = [{ id: categoryId, slug: currentUrl, title: textCapitalize(categoryName) }];
    setCategoryPath(newPath);
  };

  // ✅ Fetch nested categories
  const fetchNestedCategories = async (parent_id = 0, slugParam = '', currentCategory = null, wasDirectNavigation = false) => {
    // ✅ Prevent duplicate fetches
    if (
      lastFetchedRef.current.categoryId === parent_id &&
      lastFetchedRef.current.slug === slugParam
    ) {
      return;
    }

    // ✅ Track if we're fetching from root (parent_id = 0) to identify top-level categories
    const isFetchingFromRoot = parent_id === 0;
    // ✅ If this was a direct navigation (URL change) and path was empty before rebuild, it's likely a top-level category
    // We use wasDirectNavigation flag which was captured BEFORE rebuildCategoryPathFromUrl was called
    const isLikelyTopLevel = wasDirectNavigation;

    lastFetchedRef.current = { categoryId: parent_id, slug: slugParam };
    setNestedLoading(true);

    try {
      const rsp = await nestedCategoryData(parent_id);
      const payload = rsp;

      const arr = Array.isArray(payload.data) ? payload.data : [];
      const type = payload?.type || 'category';

      setNestedItems(arr);
      setCurrentType(type);

      if (categoryPath.length > 0) {
        setRelatedCategories(previousLevelCategories);
      } else {
        setRelatedCategories([]);
      }

      setPreviousLevelCategories(arr);


      const isNestedProductLevel = type === 'single' && 
                                   arr.length > 0 && 
                                   slugParam && 
                                   slugParam !== 'all' && 
                                   !isFetchingFromRoot && 
                                   !isLikelyTopLevel; // Only fetch if NOT a direct navigation (i.e., clicked through)

      if (isNestedProductLevel) {
        // Use the category slug/name to search for vendors
        // This will fetch vendors for all products in this product category
        const productSearchKey = slugParam.replace(/-/g, ' ');
        setSearchKey(productSearchKey);
        // Trigger vendor fetch - but don't hide categories section
        if (onGetProducts) await onGetProducts(productSearchKey);
        if (onGetVendors) onGetVendors();
        // Don't call onHide() - keep categories section visible
      }

      // ✅ For variants: when we have variants in the array, don't auto-fetch
      // Variants will be handled by handleCardClick when user clicks on them
    } catch (err) {
      console.error('Error fetching nested categories:', err);
      setNestedItems([]);
      setRelatedCategories([]);
    } finally {
      setNestedLoading(false);
      setShowAllCategories(false);
      setShowAllRelated(false);
      isNavigatingRef.current = false;
    }
  };

  // ✅ Initialize from URL on mount
  useEffect(() => {
    try {
      const currentPath = router?.asPath || '';
      const idMatch = currentPath.match(/category(\d+)$/);
      const categoryId = idMatch ? parseInt(idMatch[1], 10) : 0;
      const slug = currentPath.split('/').pop()?.replace(/-category\d+$/, '') || 'all';
      fetchNestedCategories(categoryId, slug);
    } catch (_) {
      fetchNestedCategories(0, 'all');
    }
  }, []); // ✅ Only run on mount

  // ✅ Handle browser back/forward navigation
  useEffect(() => {
    const handleRouteChange = (url) => {
      if (isNavigatingRef.current) return; // ✅ Skip if we're programmatically navigating

      // ✅ Don't handle variant URLs (no -category) - they should hide the browser
      if (!url.includes('-category') && url !== '/vendor/all') {
        // This is a variant URL, browser should be hidden
        if (onHide) onHide();
        return;
      }

      const match = url.match(/category(\d+)/);
      const categoryId = match ? parseInt(match[1], 10) : 0;
      const slug = url.split('/').pop()?.replace(/-category\d+$/, '') || 'all';

      // ✅ Only fetch if URL actually changed
      if (
        lastFetchedRef.current.categoryId !== categoryId ||
        lastFetchedRef.current.slug !== slug
      ) {
        // ✅ Check if we have a stored path from before navigating to variant
        // We're coming back from variant if we have a stored path
        const hasStoredPath = pathBeforeVariantRef.current.length > 0;
        let isDirectNavigation = false;
        
        if (hasStoredPath) {
          // ✅ Coming back from variant - restore the full path that was stored
          const storedPath = pathBeforeVariantRef.current;
          const pathIndex = storedPath.findIndex(p => p.id === categoryId);
          
          if (pathIndex !== -1) {
            // Category is in the stored path - restore path up to that point
            const restoredPath = storedPath.slice(0, pathIndex + 1);
            setCategoryPath(restoredPath);
            // Clear the stored path since we've restored it
            pathBeforeVariantRef.current = [];
            // Not a direct navigation since we're restoring from stored path
            isDirectNavigation = false;
          } else {
            // Category not in stored path - restore full stored path anyway
            setCategoryPath(storedPath);
            pathBeforeVariantRef.current = [];
            isDirectNavigation = false;
          }
        } else {
          // ✅ Normal navigation - check if current path already contains this category
          const pathIndex = categoryPath.findIndex(p => p.id === categoryId);
          isDirectNavigation = pathIndex === -1; // Category not in current path = direct navigation
          
          if (isDirectNavigation) {
            // Direct navigation to a new category - rebuild path (will only show current category)
            rebuildCategoryPathFromUrl(categoryId, slug);
          } else {
            // Navigating to a category already in the path - trim path to that point
            // This maintains the proper hierarchy when using browser back/forward
            const trimmedPath = categoryPath.slice(0, pathIndex + 1);
            setCategoryPath(trimmedPath);
          }
        }
        
        // Pass flag to indicate if this was a direct navigation
        fetchNestedCategories(categoryId, slug, null, isDirectNavigation);
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router, categoryPath]);

  const buildVendorUrl = (name, id, type) => {
    const slug = name
      .toLowerCase()
      .replace(/[\s\-\/()]+/g, ' ')
      .trim()
      .replace(/\s+/g, '-');
    return type === 'variant' ? `/vendor/${slug}` : `/vendor/${slug}-category${id}`;
  };

  const handleCardClick = async (item) => {
    const name = item.name || item.title || item.slug || item.sku || '';
    const id = item.id || item.category_id;
    const cleanName = name.replace(/-/g, ' ');

    setSelectedId(id);
    isNavigatingRef.current = true; // ✅ Mark as programmatic navigation

    // ✅ Check if this is a variant (when currentType is variant, items are variants)
    if (currentType === 'variant') {
      // ✅ Store the current category path before navigating to variant
      // This allows us to restore it when user clicks back from variant
      pathBeforeVariantRef.current = [...categoryPath];
      
      // Hide browser immediately before navigation
      if (onHide) onHide();
      setSearchKey(cleanName);
      if (onGetProducts) await onGetProducts(cleanName);
      if (onGetVendors) onGetVendors();
      const variantUrl = buildVendorUrl(name, id, 'variant');
      await router.push(variantUrl);
      isNavigatingRef.current = false;
      return;
    }

    const newUrl = buildVendorUrl(name, id, currentType);
    const currentCategories = nestedItems;
    // ✅ When clicking through categories, this is NOT a direct navigation
    // Pass false to indicate we've navigated through categories
    await fetchNestedCategories(id, name, item, false);

    const newPath = [...categoryPath, { id, slug: newUrl, title: textCapitalize(name) }];
    setCategoryPath(newPath);

    setRelatedCategories(currentCategories);
    await router.push(newUrl);
    isNavigatingRef.current = false;
  };

  const handleBreadcrumbClick = async (index) => {
    const pathItem = categoryPath[index];
    const newPath = categoryPath.slice(0, index + 1);
    setCategoryPath(newPath);
    setSelectedId(pathItem.id);
    isNavigatingRef.current = true; // ✅ Mark as programmatic navigation

    if (index === 0) {
      setRelatedCategories([]);
    } else {
      const previousLevelId = index > 0 ? categoryPath[index - 1].id : 0;
      try {
        const previousRes = await nestedCategoryData(previousLevelId);
        const previousArr = Array.isArray(previousRes.data) ? previousRes.data : [];
        setRelatedCategories(previousArr);
      } catch (err) {
        console.error('Error fetching previous level categories:', err);
        setRelatedCategories([]);
      }
    }

    // ✅ Breadcrumb click is navigation through categories, not direct navigation
    await fetchNestedCategories(pathItem.id, pathItem.slug, null, false);
    isNavigatingRef.current = false;
  };

  const handleRelatedCategoryClick = async (item) => {
    const name = item.name || item.title || item.slug || item.sku || '';
    const id = item.id || item.category_id;

    setSelectedId(id);
    isNavigatingRef.current = true; // ✅ Mark as programmatic navigation

    const newUrl = buildVendorUrl(name, id, 'category');
    const currentCategories = nestedItems;

    // ✅ Related category click is navigation through categories, not direct navigation
    await fetchNestedCategories(id, name, item, false);

    const newPath = [...categoryPath, { id, slug: newUrl, title: textCapitalize(name) }];
    setCategoryPath(newPath);

    setRelatedCategories(currentCategories);
    await router.push(newUrl);
    isNavigatingRef.current = false;
  };

  const visibleCategories = showAllCategories ? nestedItems : nestedItems.slice(0, 12);
  const visibleRelated = showAllRelated ? relatedCategories : relatedCategories.slice(0, 12);

  return (
    <div className="row mb-3">
      <div className="col-md-12 bg-white rounded-5 p-4 shadow-sm border">
        <h2 className="fs-4 fw-semibold mb-3 text-primary">
          {currentType === 'variant'
            ? 'Available Variants'
            : currentType === 'product'
            ? 'Available Products'
            : categoryPath.length > 0
            ? `${categoryPath[categoryPath.length - 1].title} Categories`
            : 'All Categories'}
        </h2>

        {categoryPath.length > 0 && (
          <div className="breadcrumb mb-3 bg-light p-2 rounded-3">
            <span
              role="button"
              className="text-primary fw-medium me-2"
              onClick={() => {
                isNavigatingRef.current = true;
                setCategoryPath([]);
                setRelatedCategories([]);
                fetchNestedCategories(0, 'all');
                router.push('/vendor/all').then(() => {
                  isNavigatingRef.current = false;
                });
              }}
            >
              Home
            </span>
            {categoryPath.map((p, i) => (
              <span key={i}>
                <span className="text-secondary">›</span>{' '}
                <span
                  role="button"
                  className={`ms-1 ${
                    i === categoryPath.length - 1 ? 'text-dark fw-semibold' : 'text-primary'
                  }`}
                  onClick={() => handleBreadcrumbClick(i)}
                >
                  {p.title}
                </span>{' '}
              </span>
            ))}
          </div>
        )}

        {nestedLoading && <p className="text-muted">Loading...</p>}
        {!nestedLoading && nestedItems.length === 0 && <p className="text-muted">No data found.</p>}

        <div className="row">
          {visibleCategories.map((item) => {
            const id = item.id || item.category_id;
            const isSelected = selectedId === id;

            return (
              <div className="col-6 col-md-3 mb-3" key={id || item.slug}>
                <div
                  role="button"
                  className={`card p-3 h-100 border-2 rounded-4 shadow-sm ${
                    isSelected
                      ? 'border-primary bg-light'
                      : 'border-transparent hover:border-secondary'
                  }`}
                  onClick={() => handleCardClick(item)}
                  style={{
                    cursor: 'pointer',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <h5 className="card-title text-capitalize fw-semibold mb-2">
                    {item.title || item.category_name || item.name}
                  </h5>
                  {item.description && (
                    <p className="card-text text-truncate mb-0">{item.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {nestedItems.length > 12 && (
          <div className="text-center mt-2">
            <button
              className="btn btn-outline-primary rounded-pill px-4 py-1"
              onClick={() => setShowAllCategories(!showAllCategories)}
            >
              {showAllCategories ? 'Show Less' : 'Show More'}
            </button>
          </div>
        )}

        {relatedCategories.length > 0 && (
          <div className="mt-4 pt-4 border-top">
            <h5 className="fw-semibold text-dark mb-3">
              <i className="bi bi-arrow-return-left me-2 text-primary"></i>
              Related Categories
            </h5>
            <div className="d-flex overflow-auto gap-3 pb-2">
              {visibleRelated.map((cat) => (
                <div
                  key={cat.id}
                  className="card border-0 shadow-sm rounded-4 p-3 flex-shrink-0"
                  style={{ minWidth: '180px', cursor: 'pointer' }}
                  onClick={() => handleRelatedCategoryClick(cat)}
                >
                  <h6 className="mb-0 text-capitalize fw-semibold">{cat.title || cat.name}</h6>
                </div>
              ))}
            </div>

            {relatedCategories.length > 12 && (
              <div className="text-center mt-2">
                <button
                  className="btn btn-outline-secondary rounded-pill px-4 py-1"
                  onClick={() => setShowAllRelated(!showAllRelated)}
                >
                  {showAllRelated ? 'Show Less' : 'Show More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NestedCategoryBrowser;