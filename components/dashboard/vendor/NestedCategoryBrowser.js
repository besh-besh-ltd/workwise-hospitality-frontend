import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { nestedCategoryData } from '@/services/products';
import { textCapitalize } from '@/utils/sharedFunctions';

const NestedCategoryBrowser = ({ onGetProducts, onGetVendors }) => {
  const router = useRouter();
  const [nestedItems, setNestedItems] = useState([]);
  const [categoryPath, setCategoryPath] = useState([]);
  const [nestedLoading, setNestedLoading] = useState(false);
  const [currentType, setCurrentType] = useState('category');
  const [selectedId, setSelectedId] = useState(null);
  const [relatedCategories, setRelatedCategories] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllRelated, setShowAllRelated] = useState(false);

  let hasFetchedOnce = false;

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

  let fetchInProgress = false;

  // ✅ Fetch nested categories
  const fetchNestedCategories = async (parent_id = 0, slugParam = '', currentCategory = null, wasDirectNavigation = false) => {
  if (
    lastFetchedRef.current.categoryId === parent_id &&
    lastFetchedRef.current.slug === slugParam
  ) {
    return;
  }

  const isFetchingFromRoot = parent_id === 0;

  lastFetchedRef.current = { categoryId: parent_id, slug: slugParam };
  setNestedLoading(true);

  if (fetchInProgress) return;
  fetchInProgress = true;

  try {
    console.log("Fetching nested categories for parent_id:", parent_id);
    const rsp = await nestedCategoryData(parent_id, '', true);
    const payload = rsp;
    const arr = Array.isArray(payload.data) ? payload.data : [];
    const type = payload?.type || 'category';

    // Save current level as "previous" BEFORE updating nestedItems
    const previousLevel = nestedItems;

    setNestedItems(arr);
    setCurrentType(type);

    // Only update relatedCategories when going DEEPER (not on back or root)
    if (parent_id !== 0 && !wasDirectNavigation) {
      setRelatedCategories(previousLevel); // This is correct: siblings from parent level
    }

    // Reset related on root
    if (parent_id === 0) {
      setRelatedCategories([]);
    }

    // ... rest of vendor logic
  } catch (err) {
    console.error('Error fetching nested categories:', err);
    setNestedItems([]);
    setRelatedCategories([]);
  } finally {
    fetchInProgress = false;
    setNestedLoading(false);
    setShowAllCategories(false);
    setShowAllRelated(false);
    isNavigatingRef.current = false;
  }
};

  // ✅ Initialize from URL on mount
  useEffect(() => {
  if (hasFetchedOnce) return;
  hasFetchedOnce = true;

  const path = router.asPath ?? '';
  const idMatch = path.match(/category(\d+)$/);
  const categoryId = idMatch ? Number(idMatch[1]) : 0;
  const slug = extractSlug(path);

  if(slug === "all"){
    fetchNestedCategories(0, "all");
  }

  fetchNestedCategories(categoryId, slug);
  fetchParentForRelated(categoryId);
  rebuildCategoryPath(categoryId, slug);
}, []);

const fetchParentForRelated = async (categoryId) => {
  if (!categoryId) {
    setRelatedCategories([]);
    return;
  }

  try {
    // Step 1 — get parent
    const parentRes = await nestedCategoryData(categoryId, '', false);
    const parentId = parentRes?.parent_id || 0;

    // Step 2 — fetch siblings
    if (parentId !== null) {
      const siblingsRes = await nestedCategoryData(parentId, '', true);
      const siblings = Array.isArray(siblingsRes.data) ? siblingsRes.data : [];

      setRelatedCategories(siblings);
    }
  } catch (err) {
    console.error("Error fetching parent or siblings:", err);
  }
};

const rebuildCategoryPath = async (categoryId, slugName) => {
  let path = [];

  let currentId = categoryId;
  let currentSlug = slugName;

  while (currentId && currentId !== 0) {
    const res = await nestedCategoryData(currentId, '', false);

    const title = textCapitalize(currentSlug.replace(/-/g, ' '));

    path.unshift({
      id: currentId,
      slug: `/vendor/${currentSlug}-category${currentId}`,
      title,
    });

    currentId = res?.parent_id || 0;
    currentSlug = res?.parent_slug || currentSlug; 
  }

  setCategoryPath(path);
};

const extractSlug = (url) => {
  const lastPart = url.split('/').pop() || '';
  const match = lastPart.match(/(.+)-category(\d+)$/);
  return match ? match[1] : 'all';
};

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
  isNavigatingRef.current = true;

  // CASE 1 — Variant clicked
  if (currentType === 'variant') {
    pathBeforeVariantRef.current = [...categoryPath];

    const store = {
      name: name,
      variant_id: id
    };

    localStorage.setItem("search-key", JSON.stringify(store));

    if (onGetProducts) await onGetProducts(cleanName);
    if (onGetVendors) await onGetVendors(id);         

    const variantUrl = buildVendorUrl(name, id, 'variant');
    await router.push(variantUrl);
    isNavigatingRef.current = false;
    return;
  }

  // CASE 2 — Category clicked
  const newUrl = buildVendorUrl(name, id, currentType);
  const slug = extractSlug(newUrl);
  await fetchNestedCategories(id, slug, item, false);

  const newPath = [...categoryPath, {
    id,
    slug: newUrl,
    title: textCapitalize(name)
  }];
  setCategoryPath(newPath);

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
        //  nestedCategoryData(parentid, slug, nestedCategoryData)
        const previousRes = await nestedCategoryData(previousLevelId, '', true);
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
                localStorage.removeItem("search-key");
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
                  className={`mx-1 ${
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