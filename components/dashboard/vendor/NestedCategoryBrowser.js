import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { nestedCategoryData } from '@/services/products';
import { textCapitalize } from '@/utils/sharedFunctions';

const NestedCategoryBrowser = ({ onGetProducts, onGetVendors, setSearchKey }) => {
  const router = useRouter();
  const [nestedItems, setNestedItems] = useState([]);
  const [categoryPath, setCategoryPath] = useState([]);
  const [nestedLoading, setNestedLoading] = useState(false);
  const [currentType, setCurrentType] = useState('category');
  const [selectedId, setSelectedId] = useState(null); // ✅ Track selected item

  // ✅ Fetch nested categories/products/variants dynamically
  const fetchNestedCategories = async (parent_id = 0, slugParam = '') => {
    setNestedLoading(true);
    try {
      const rsp = await nestedCategoryData(parent_id);
      const payload = rsp;
      console.log("Nested category response payload:", payload);

      const arr = Array.isArray(payload.data) ? payload.data : [];
      const type = payload?.type || 'category';

      setNestedItems(arr);
      setCurrentType(type);

      // Fallback: fetch vendors/products if nothing found
      if (arr.length === 0 && slugParam && slugParam !== 'all') {
        const productSearchKey = slugParam.replace(/-/g, ' ');
        setSearchKey(productSearchKey);
        if (onGetProducts) await onGetProducts(productSearchKey);
        if (onGetVendors) onGetVendors();
      }
    } catch (err) {
      console.error('Error fetching nested categories:', err);
      setNestedItems([]);
    } finally {
      setNestedLoading(false);
    }
  };

  // ✅ Initial load: top-level categories
  useEffect(() => {
    fetchNestedCategories(0, 'all');
  }, []);

  // ✅ Build SEO-friendly URL
  const buildVendorUrl = (name, id, type) => {
    const slug = name
      .toLowerCase()
      .replace(/[\s\-\/()]+/g, ' ')
      .trim()
      .replace(/\s+/g, '-');
    return type === 'variant'
      ? `/vendor/${slug}`
      : `/vendor/${slug}-category${id}`;
  };

  // ✅ Handle card click
  const handleCardClick = async (item) => {
    const name = item.name || item.title || item.slug || item.sku || '';
    const id = item.id || item.category_id;
    const cleanName = name.replace(/-/g, ' ');

    setSelectedId(id); // ✅ Highlight selected

    if (currentType === 'variant') {
      // ✅ Variant click → open vendor/slug-of-variant
      setSearchKey(cleanName);
      if (onGetProducts) await onGetProducts(cleanName);
      if (onGetVendors) onGetVendors();
      const variantUrl = buildVendorUrl(name, id, 'variant');
      router.push(variantUrl);
      return;
    }

    // ✅ Category or Product click
    const newUrl = buildVendorUrl(name, id, currentType);
    await fetchNestedCategories(id, name);

    const newPath = [
      ...categoryPath,
      {
        id,
        slug: newUrl,
        title: textCapitalize(name),
      },
    ];
    setCategoryPath(newPath);

    router.push(newUrl);
  };

  // ✅ Breadcrumb click — go back to any level
  const handleBreadcrumbClick = async (index) => {
    const pathItem = categoryPath[index];
    const newPath = categoryPath.slice(0, index + 1);
    setCategoryPath(newPath);
    setSelectedId(pathItem.id);

    await fetchNestedCategories(pathItem.id, pathItem.slug);
    router.push(pathItem.slug);
  };

  // ✅ UI Render
  return (
    <div className="row mb-3">
      <div className="col-md-12 bg-white rounded-5 p-4 shadow-sm border">
        <h2 className="fs-4 fw-semibold mb-3 text-primary">
          {currentType === 'variant'
            ? 'Available Variants'
            : currentType === 'product'
            ? 'Available Products'
            : 'Browse Categories'}
        </h2>

        {/* ✅ Breadcrumb */}
        {categoryPath.length > 0 && (
          <div className="breadcrumb mb-3 bg-light p-2 rounded-3">
            <span
              role="button"
              className="text-primary fw-medium me-2"
              onClick={() => {
                setCategoryPath([]);
                fetchNestedCategories(0, 'all');
                router.push('/vendor/all');
              }}
            >
              Home
            </span>
            {categoryPath.map((p, i) => (
              <span key={i}>
                <span className="text-secondary">›</span>{' '}
                <span
                  role="button"
                  className={`ms-1 ${i === categoryPath.length - 1 ? 'text-dark fw-semibold' : 'text-primary'}`}
                  onClick={() => handleBreadcrumbClick(i)}
                >
                  {p.title}
                </span>{' '}
              </span>
            ))}
          </div>
        )}

        {/* ✅ Loading / Empty States */}
        {nestedLoading && <p className="text-muted">Loading...</p>}
        {!nestedLoading && nestedItems.length === 0 && (
          <p className="text-muted">No data found.</p>
        )}

        {/* ✅ Cards */}
        <div className="row">
          {nestedItems.map((item) => {
            const id = item.id || item.category_id;
            const isSelected = selectedId === id;

            return (
              <div
                className="col-6 col-md-3 mb-3"
                key={id || item.slug}
              >
                <div
                  role="button"
                  className={`card p-3 h-100 border-2 rounded-4 shadow-sm transition-all ${
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
                  {item.sku && (
                    <p className="text-muted small mb-1">SKU: {item.sku}</p>
                  )}
                  {item.description && (
                    <p className="card-text text-truncate mb-0">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NestedCategoryBrowser;
