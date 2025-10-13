import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { nestedCategoryData } from '@/services/products';
import { textCapitalize } from '@/utils/sharedFunctions';

const NestedCategoryBrowser = ({ slug, onGetProducts, onGetVendors, setSearchKey }) => {
  const router = useRouter();
  const [nestedCategories, setNestedCategories] = useState([]);
  const [categoryPath, setCategoryPath] = useState([]);
  const [nestedLoading, setNestedLoading] = useState(false);

  const cleanSlugForBackend = (slugParam) => {
    if (!slugParam) return '';
    const slugStr = Array.isArray(slugParam) ? slugParam.join('/') : String(slugParam);
    const segments = slugStr.split(/[\/\-]/).filter(Boolean);
    return segments[segments.length - 1] || '';
  }

  const fetchNestedCategories = async (parent_id = 0, slugParam = '') => {
    setNestedLoading(true);
    try {
      const backendSlug = cleanSlugForBackend(slugParam);
      const rsp = await nestedCategoryData(parent_id, backendSlug);
      const data = rsp?.data ?? rsp;
      const arr = Array.isArray(data) ? data : data?.data ?? [];
      setNestedCategories(arr || []);

      // If backend returned no nested categories, treat last slug segment as product search
      if ((!arr || arr.length === 0) && slugParam) {
        const rawSlugStr = Array.isArray(slugParam) ? slugParam.join('/') : String(slugParam);
        const segments = rawSlugStr.split(/[\/\-]/).filter(Boolean);
        const last = segments.length ? segments[segments.length - 1] : '';
        const productSearchKey = last.replace(/-/g, ' ');
        setSearchKey(productSearchKey);
        try {
          // wait for parent to fetch products, then fetch vendors
          if (onGetProducts) await onGetProducts(productSearchKey);
          if (onGetVendors) onGetVendors();
        } catch (e) {
          console.error('Error fetching products/vendors for slug:', rawSlugStr, e);
        }
      }
    } catch (err) {
      console.error('Error fetching nested categories:', err);
      setNestedCategories([]);
    } finally {
      setNestedLoading(false);
    }
  }

  useEffect(() => {
    const slugStr = Array.isArray(slug) ? slug.join('/') : typeof slug === 'string' ? slug : '';
    if (!slugStr || slugStr === 'all') {
      fetchNestedCategories(0, '');
      setCategoryPath([]);
      return;
    }
    fetchNestedCategories(0, slugStr);
  }, [slug]);

  const handleNestedCategoryClick = (item) => {
    const itemSlug = item.slug || (item.title || item.category_name || item.name || '').toLowerCase().replace(/[\s\-\/()]+/g, ' ').trim().replace(/\s+/g, '-');
    const newPath = [
      ...categoryPath,
      {
        id: item.id || item.category_id,
        slug: itemSlug,
        title: item.title || item.category_name || item.name,
      },
    ];
    const newSlug = newPath.map((p) => p.slug).join('/');
    setCategoryPath(newPath);
    router.push(`/vendor/${newSlug}`);
  }

  return (
    <div>
      <div className="row mb-3">
        <div className="col-md-12 bg-white rounded-5 p-4">
          <h2 className="fs-4">Browse Categories</h2>
          {/* Breadcrumb / path */}
          {categoryPath.length > 0 && (
            <div className="mb-2">
              {categoryPath.map((p, i) => (
                <span key={i} className="me-2">
                  {p.title}
                  {i < categoryPath.length - 1 ? ' > ' : ''}
                </span>
              ))}
            </div>
          )}

          {nestedLoading && <p>Loading categories...</p>}

          {!nestedLoading && nestedCategories && nestedCategories.length === 0 && (
            <p className="text-muted">No categories found.</p>
          )}

          <div className="row">
            {nestedCategories.map((cat) => (
              <div className="col-6 col-md-3 mb-3" key={cat.id || cat.category_id || cat.slug}>
                <div
                  role="button"
                  className="card p-3 h-100"
                  onClick={() => handleNestedCategoryClick(cat)}
                >
                  <h5 className="card-title">{cat.title || cat.category_name || cat.name}</h5>
                  {cat.description && <p className="card-text text-truncate">{cat.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NestedCategoryBrowser;
