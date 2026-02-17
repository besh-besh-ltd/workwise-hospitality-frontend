import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Select from 'react-select';
import { formatRFQNumber } from '@/utils/sharedFunctions';
import FullLoader from '@/components/shared/FullLoader';
import styles from './RFQListSidebar.module.css';

const MIN_WIDTH = 220;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 280;
const STORAGE_KEY = 'rfqSidebarWidth';

/**
 * Reusable RFQ list sidebar with tabs, filters, status tags,
 * and drag-to-resize handle.
 */
const RFQListSidebar = ({
  title = 'Tender / RFQs',
  rfqList = [],
  loading = false,
  selectedRfqId,
  linkPrefix,
  linkQueryKey = 'rfq_id',
  // Tabs
  tabs = [],
  defaultTab,
  // Search
  rfqNo,
  onRfqNoChange,
  searchPlaceholder = 'Search by number...',
  // Business Units filter
  userHotelMappings = [],
  selectedHotelIds = [],
  onHotelSelectionChange,
  // Project filter
  projects = [],
  onProjectChange,
  // Type filter
  showTypeFilter = true,
  isTenderFilter,
  onTenderFilterChange,
  // Tags
  getItemTags,
  // Load more
  showLoadMore = false,
  onLoadMore,
  hasMore = false,
  // Extra content below filters (e.g. toggle switches, alerts)
  extraFilters,
  // Identifier for test IDs
  pageId = 'default',
}) => {
  const TAB_STORAGE_KEY = `rfqSidebarTab_${pageId}`;
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(TAB_STORAGE_KEY);
      if (saved && tabs.some(t => t.key === saved)) return saved;
    } catch (_) {}
    return defaultTab || (tabs.length > 0 ? tabs[0].key : null);
  });
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try { sessionStorage.setItem(TAB_STORAGE_KEY, tab); } catch (_) {}
  };
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Resize state ──
  const wrapperRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) setSidebarWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parsed)));
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(sidebarWidth)); } catch (_) {}
  }, [sidebarWidth]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e) => {
      if (!wrapperRef.current) return;
      const left = wrapperRef.current.getBoundingClientRect().left;
      setSidebarWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, e.clientX - left)));
    };
    const onUp = () => setIsResizing(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleDoubleClick = useCallback(() => setSidebarWidth(DEFAULT_WIDTH), []);

  // ── List filtering ──
  const filteredList = useMemo(() => {
    if (!tabs.length || !activeTab) return rfqList;
    const currentTab = tabs.find(t => t.key === activeTab);
    if (!currentTab || !currentTab.filter) return rfqList;
    return rfqList.filter(currentTab.filter);
  }, [rfqList, tabs, activeTab]);

  const tabCounts = useMemo(() => {
    const counts = {};
    tabs.forEach(tab => {
      counts[tab.key] = tab.filter ? rfqList.filter(tab.filter).length : rfqList.length;
    });
    return counts;
  }, [rfqList, tabs]);

  const hasActiveFilters = rfqNo || (selectedHotelIds && selectedHotelIds.length > 0) || isTenderFilter !== null;

  const renderTag = (tag, idx) => {
    const variantClass = {
      warning: styles.tagWarning, danger: styles.tagDanger, success: styles.tagSuccess,
      info: styles.tagInfo, purple: styles.tagPurple, neutral: styles.tagNeutral,
    }[tag.variant] || styles.tagNeutral;
    const dotClass = {
      warning: styles.tagDotWarning, danger: styles.tagDotDanger, success: styles.tagDotSuccess,
      info: styles.tagDotInfo, purple: styles.tagDotPurple,
    }[tag.variant];
    return (
      <span key={idx} className={`${styles.tag} ${variantClass}`}>
        {dotClass && <span className={`${styles.tagDot} ${dotClass}`} />}
        {tag.label}
      </span>
    );
  };

  return (
    <div
      ref={wrapperRef}
      className={styles.wrapper}
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        transition: isResizing ? 'none' : 'width 0.2s ease, min-width 0.2s ease',
      }}
    >
      <div className={styles.sidebar}>
        {/* Header */}
        <div className={styles.sidebarHeader}>
          <p className={styles.sidebarTitle}>{title}</p>
        </div>

        {/* Tabs */}
        {tabs.length > 0 && (
          <div className={styles.tabBar}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                  title={tab.label}
                  id={`tab_${tab.key}-rfq_sidebar-${pageId}`}
                >
                  {tab.label}
                  <span className={`${styles.tabCount} ${isActive ? styles.tabCountActive : styles.tabCountDefault}`}>
                    {tabCounts[tab.key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className={styles.filtersSection}>
          <div className={styles.filterGroup}>
            <input
              className={styles.searchInput}
              value={rfqNo || ''}
              onChange={(e) => onRfqNoChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              id={`search_rfq_no-rfq_sidebar-${pageId}`}
            />
          </div>

          {(userHotelMappings.length > 0 || projects.length > 0 || showTypeFilter) && (
            <>
              <div className={styles.filterToggle} onClick={() => setFiltersOpen(!filtersOpen)}>
                <span className={styles.filterToggleLabel}>
                  Filters{hasActiveFilters ? ' (Active)' : ''}
                </span>
                <span className={`${styles.filterToggleIcon} ${filtersOpen ? styles.filterToggleIconOpen : ''}`}>
                  &#9660;
                </span>
              </div>
              <div className={`${styles.filterBody} ${filtersOpen ? styles.filterBodyOpen : styles.filterBodyClosed}`}>
                {userHotelMappings.length > 0 && (
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Business Units</label>
                    <Select
                      isMulti
                      options={userHotelMappings}
                      value={userHotelMappings.filter(opt => selectedHotelIds.includes(opt.hospitality_hotel_id))}
                      onChange={(sel) => onHotelSelectionChange?.(sel ? sel.map(o => o.hospitality_hotel_id) : [])}
                      placeholder="Select..."
                      closeMenuOnSelect={false}
                      classNamePrefix="react-select"
                      isClearable
                      formatOptionLabel={(opt) => <span style={{ fontSize: '12px' }}>{opt.hotel_name}</span>}
                      getOptionValue={(opt) => opt.hospitality_hotel_id}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                      id={`select_hotels-rfq_sidebar-${pageId}`}
                    />
                  </div>
                )}
                {projects.length > 0 && (
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Project</label>
                    <Select
                      options={projects}
                      onChange={(opt) => onProjectChange?.(opt?.value ?? -1)}
                      placeholder="Select..."
                      isClearable
                      classNamePrefix="react-select"
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                      id={`select_project-rfq_sidebar-${pageId}`}
                    />
                  </div>
                )}
                {showTypeFilter && (
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Type</label>
                    <Select
                      options={[{ label: 'RFQ', value: '0' }, { label: 'Tender', value: '1' }]}
                      onChange={(opt) => onTenderFilterChange?.(opt?.value ?? null)}
                      value={isTenderFilter !== null ? { label: isTenderFilter === '1' || isTenderFilter === 1 ? 'Tender' : 'RFQ', value: isTenderFilter } : null}
                      placeholder="All"
                      isClearable
                      classNamePrefix="react-select"
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                      id={`type_filter-rfq_sidebar-${pageId}`}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Extra filters slot (toggle switches, alerts, etc.) */}
          {extraFilters}
        </div>

        {/* RFQ List */}
        <div className={styles.listContainer}>
          {loading && (
            <div style={{ position: 'relative', minHeight: 48 }}>
              <FullLoader />
            </div>
          )}

          {!loading && filteredList.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>No items found</p>
            </div>
          )}

          {filteredList.map((item) => {
            const isSelected = String(item.id) === String(selectedRfqId);
            const tags = getItemTags ? getItemTags(item, isSelected) : [];
            const isTender = item.is_tender === 1;

            let cardClass = styles.rfqCard;
            if (isSelected) cardClass += ` ${styles.rfqCardSelected}`;
            else if (item.approval_required) cardClass += ` ${styles.rfqCardActionRequired}`;

            return (
              <Link
                key={item.id}
                href={`${linkPrefix}?${linkQueryKey}=${item.id}`}
                className={cardClass}
                id={`rfq_${item.rfq_no}-rfq_sidebar-${pageId}`}
              >
                <span className={`${styles.entityBadge} ${isTender ? styles.entityBadgeTender : styles.entityBadgeRFQ}`}>
                  {isTender ? 'Tender' : 'RFQ'}
                </span>

                {item.title && <p className={styles.rfqTitle} title={item.title}>{item.title}</p>}

                <p className={styles.rfqNumber} title={formatRFQNumber(item.rfq_no, item.is_tender)}>
                  {formatRFQNumber(item.rfq_no, item.is_tender)}
                </p>

                {item.project_name && <p className={styles.rfqProject} title={item.project_name}>{item.project_name}</p>}

                {tags.length > 0 && !isSelected && (
                  <div className={styles.rfqMeta}>
                    {tags.map((tag, idx) => renderTag(tag, idx))}
                  </div>
                )}
              </Link>
            );
          })}

          {showLoadMore && hasMore && !loading && filteredList.length >= 10 && (
            <div className={styles.loadMore}>
              <button className={styles.loadMoreBtn} onClick={(e) => { e.preventDefault(); onLoadMore?.(); }} id={`load_more-rfq_sidebar-${pageId}`}>
                Load More...
              </button>
            </div>
          )}

          {showLoadMore && hasMore && loading && (
            <div className={styles.loadingSpinner}>
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Loading...
            </div>
          )}
        </div>
      </div>

      {/* Resize drag handle */}
      <div
        className={`${styles.resizeHandle} ${isResizing ? styles.resizeHandleActive : ''}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
};

export default RFQListSidebar;
