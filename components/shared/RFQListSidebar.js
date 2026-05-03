import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Select from 'react-select';
import { BsExclamationCircleFill, BsHourglassSplit, BsInboxFill, BsCircle } from 'react-icons/bs';
import { formatRFQNumber } from '@/utils/sharedFunctions';
import styles from './RFQListSidebar.module.css';

const DEFAULT_TAB_ICONS = {
  action_required: BsExclamationCircleFill,
  in_progress: BsHourglassSplit,
  all: BsInboxFill,
};

const MIN_WIDTH = 250;
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
  extraQueryParams = {},
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
  // Click handler — called with (itemId) when an RFQ is clicked
  onItemClick,
  // Identifier for test IDs
  pageId = 'default',
  // Mobile drawer mode (opt-in: pass undefined to keep existing behavior)
  mobileOpen,
  onMobileClose,
}) => {
  const router = useRouter();
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

  const isMobileDrawer = typeof mobileOpen === 'boolean';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileDrawer && mobileOpen && (
        <div className={styles.overlay} onClick={() => onMobileClose?.()} />
      )}
      <div
        ref={wrapperRef}
        className={`${styles.wrapper} ${isMobileDrawer ? styles.wrapperMobile : ''} ${isMobileDrawer && mobileOpen ? styles.wrapperMobileOpen : ''}`}
        style={isMobileDrawer ? undefined : {
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
              const TabIcon = tab.icon || DEFAULT_TAB_ICONS[tab.key] || BsCircle;
              const count = tabCounts[tab.key] ?? 0;
              return (
                <div className={`${styles.tabSlot} ${isActive ? styles.tabSlotActive : ''}`} key={tab.key}>
                  <button
                    className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                    id={`tab_${tab.key}-rfq_sidebar-${pageId}`}
                  >
                    <span className={styles.tabIcon}>
                      <TabIcon size={13} />
                    </span>
                    <span className={styles.tabContent}>
                      <span className={styles.tabLabel}>{tab.label}</span>
                      <span className={styles.tabCount}>{count}</span>
                    </span>
                  </button>
                  {!isActive && (
                    <span className={styles.tabTooltip}>
                      {tab.label} ({count})
                    </span>
                  )}
                </div>
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
                {(() => {
                  // Build a clean, deduped option list (drop company-wide rows with no hotel id)
                  const seen = new Set();
                  const validOptions = [];
                  for (const m of userHotelMappings) {
                    if (!m || m.hospitality_hotel_id == null || !m.hotel_name) continue;
                    const key = m.hospitality_hotel_id;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    validOptions.push(m);
                  }
                  validOptions.sort((a, b) => (a.hotel_name || '').localeCompare(b.hotel_name || ''));

                  if (validOptions.length === 0) return null;

                  const selectedId = selectedHotelIds && selectedHotelIds.length > 0 ? selectedHotelIds[0] : null;
                  const currentValue = validOptions.find(opt => opt.hospitality_hotel_id === selectedId) || null;

                  return (
                    <div className={styles.filterGroup}>
                      <label className={styles.filterLabel}>Business Unit</label>
                      <Select
                        options={validOptions}
                        value={currentValue}
                        onChange={(opt) => onHotelSelectionChange?.(opt ? [opt.hospitality_hotel_id] : [])}
                        placeholder="Select..."
                        classNamePrefix="react-select"
                        isClearable
                        getOptionValue={(opt) => String(opt.hospitality_hotel_id)}
                        getOptionLabel={(opt) => opt.hotel_name || ''}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          option: (base) => ({ ...base, fontSize: '12px', paddingTop: 6, paddingBottom: 6 }),
                          singleValue: (base) => ({ ...base, fontSize: '12px' }),
                        }}
                        noOptionsMessage={() => 'No business units found'}
                        id={`select_hotels-rfq_sidebar-${pageId}`}
                      />
                    </div>
                  );
                })()}
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
            <>
              <style jsx>{`
                @keyframes sidebarShimmer {
                  0% { background-position: -200px 0; }
                  100% { background-position: 200px 0; }
                }
                .sidebar-skeleton-card {
                  padding: 10px 10px;
                  border-radius: 8px;
                  border: 1px solid #f0f0f0;
                  margin-bottom: 4px;
                }
                .sidebar-skeleton-line {
                  height: 10px;
                  border-radius: 4px;
                  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                  background-size: 400px 100%;
                  animation: sidebarShimmer 1.4s ease-in-out infinite;
                }
              `}</style>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="sidebar-skeleton-card">
                  <div className="sidebar-skeleton-line" style={{ width: '35%', marginBottom: 8 }} />
                  <div className="sidebar-skeleton-line" style={{ width: '70%', marginBottom: 6 }} />
                  <div className="sidebar-skeleton-line" style={{ width: '50%' }} />
                </div>
              ))}
            </>
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
            const mergedQuery = {
              ...extraQueryParams,
              [linkQueryKey]: item.id,
            };
            const hrefQuery = new URLSearchParams(
              Object.entries(mergedQuery).reduce((acc, [key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                  acc[key] = String(value);
                }
                return acc;
              }, {})
            ).toString();

            const isCompleted = tags.some(t => t.variant === 'success');
            let cardClass = styles.rfqCard;
            if (isSelected) cardClass += ` ${styles.rfqCardSelected}`;
            else if (item.approval_required && !isCompleted) cardClass += ` ${styles.rfqCardActionRequired}`;

            return (
              <div
                key={item.id}
                role="button"
                onClick={() => {
                  if (onItemClick) {
                    onItemClick(item.id);
                  } else {
                    router.push(`${linkPrefix}?${hrefQuery}`, undefined, { shallow: true });
                  }
                  if (isMobileDrawer) onMobileClose?.();
                }}
                className={cardClass}
                style={{ cursor: 'pointer' }}
                id={`rfq_${item.rfq_no}-rfq_sidebar-${pageId}`}
              >
                <div className={styles.rfqCardRow}>
                  <p className={styles.rfqNumber} title={formatRFQNumber(item.rfq_no, item.is_tender)}>
                    {formatRFQNumber(item.rfq_no, item.is_tender)}
                  </p>
                  <span className={styles.entityType}>{isTender ? 'Tender' : 'RFQ'}</span>
                </div>

                {item.title && <p className={styles.rfqTitle} title={item.title}>{item.title}</p>}

                {tags.length > 0 && (
                  <div className={styles.rfqMeta}>
                    {tags.map((tag, idx) => renderTag(tag, idx))}
                  </div>
                )}
              </div>
            );
          })}

          {showLoadMore && hasMore && !loading && filteredList.length >= 10 && (
            <div className={styles.loadMore}>
              <button className={styles.loadMoreBtn} onClick={(e) => { e.preventDefault(); onLoadMore?.(); }} id={`load_more-rfq_sidebar-${pageId}`}>
                Load More...
              </button>
            </div>
          )}

          {showLoadMore && hasMore && loading && filteredList.length > 0 && (
            <div className={styles.loadingSpinner}>
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Loading more...
            </div>
          )}

          {!loading && filteredList.length > 0 && !(showLoadMore && hasMore) && (
            <div className={styles.endOfList}>End of list</div>
          )}
        </div>
      </div>

      {/* Resize drag handle */}
      {!isMobileDrawer && (
        <div
          className={`${styles.resizeHandle} ${isResizing ? styles.resizeHandleActive : ''}`}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        />
      )}
    </div>
    </>
  );
};

export default RFQListSidebar;
