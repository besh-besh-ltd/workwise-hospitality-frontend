import React, { useEffect, useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import { useSelector } from 'react-redux';
import { Search } from 'lucide-react';

const selectStyles = {
    control: (base, state) => ({
        ...base,
        minHeight: 34,
        fontSize: 12.5,
        borderColor: state.isFocused ? '#2e5ba8' : '#e2e2e2',
        boxShadow: state.isFocused ? '0 0 0 1px #2e5ba8' : 'none',
        borderRadius: 7,
        background: '#fff',
        cursor: 'pointer',
        '&:hover': { borderColor: '#ccc' },
    }),
    valueContainer: (base) => ({
        ...base,
        padding: '0 8px',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base) => ({
        ...base,
        padding: '4px 6px',
        color: '#999',
    }),
    menu: (base) => ({
        ...base,
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        border: '1px solid #f0f0f0',
        zIndex: 20,
        marginTop: 3,
    }),
    option: (base, state) => ({
        ...base,
        fontSize: 12.5,
        padding: '7px 10px',
        cursor: 'pointer',
        backgroundColor: state.isSelected ? '#2e5ba8' : state.isFocused ? '#f5f7fa' : 'transparent',
        color: state.isSelected ? '#fff' : '#334155',
    }),
    placeholder: (base) => ({
        ...base,
        fontSize: 12.5,
        color: '#aaa',
    }),
    singleValue: (base) => ({
        ...base,
        fontSize: 12.5,
        color: '#334155',
    }),
    multiValue: (base) => ({
        ...base,
        background: '#f0f4fa',
        borderRadius: 4,
    }),
    multiValueLabel: (base) => ({
        ...base,
        fontSize: 11,
        color: '#2e5ba8',
        fontWeight: 500,
        padding: '1px 3px',
    }),
    multiValueRemove: (base) => ({
        ...base,
        color: '#2e5ba8',
        '&:hover': { background: 'rgba(46,91,168,0.1)', color: '#2e5ba8' },
    }),
};

const FilterSection = ({ title, setFilterData, disabled = false }) => {
    const userProfile = useSelector((state) => state.userProfile);
    const [rfqNo, setRfqNo] = useState(null);
    const [userHotelMappings, setUserHotelMappings] = useState([]);
    const [selectedHotelIds, setSelectedHotelIds] = useState([]);
    const isInitialRfqNo = useRef(true);

    const validHotelOptions = useMemo(() => {
        const seen = new Set();
        const out = [];
        for (const m of userHotelMappings) {
            if (!m || m.hospitality_hotel_id == null || !m.hotel_name) continue;
            const key = m.hospitality_hotel_id;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(m);
        }
        return out.sort((a, b) =>
            (a.hotel_name || '').localeCompare(b.hotel_name || '')
        );
    }, [userHotelMappings]);

    useEffect(() => {
        if (isInitialRfqNo.current) {
            isInitialRfqNo.current = false;
            return;
        }
        const handler = setTimeout(() => {
            const val = rfqNo?.trim() || '';
            setFilterData((prevState) => ({
                ...prevState,
                search_val: val || null,
            }));
        }, 800);
        return () => clearTimeout(handler);
    }, [rfqNo]);

    const handleFilterChange = (selectedOption, actionMeta) => {
        const { name } = actionMeta;
        let value;
        if (selectedOption === null) {
            if (name === "reverse_auction") value = "-1";
            else if (name === "is_tender") value = null;
            else value = "";
        } else {
            value = selectedOption.value;
        }
        setFilterData((prevState) => ({ ...prevState, [name]: value }));
    };

    const handleHotelSelectionChange = (hotelIds) => {
        setSelectedHotelIds(hotelIds);
        setFilterData((prevState) => ({ ...prevState, hotel_ids: hotelIds, page: 1 }));
    };

    useEffect(() => {
        const mappings = userProfile?.hospitality_mappings || [];
        setUserHotelMappings(mappings);
    }, [userProfile]);

    return (
        <div style={filterWrapStyle}>
            <div style={{ ...filterGridStyle, ...(disabled ? disabledStyle : {}) }}>
                {/* Search */}
                <div style={searchItemStyle}>
                    <div style={searchWrapStyle}>
                        <Search size={14} style={{ color: '#999', flexShrink: 0 }} />
                        <input
                            style={searchInputStyle}
                            value={rfqNo || ''}
                            onChange={(e) => setRfqNo(e.target.value)}
                            placeholder="Search by Title or RFQ No."
                        />
                    </div>
                </div>

                {/* Business Units */}
                {validHotelOptions.length > 0 && (
                    <div style={filterItemStyle}>
                        <Select
                            isMulti
                            options={validHotelOptions}
                            value={validHotelOptions.filter(opt =>
                                selectedHotelIds.includes(opt.hospitality_hotel_id)
                            )}
                            onChange={(opts) => {
                                const ids = opts ? opts.map(o => o.hospitality_hotel_id).filter(Boolean) : [];
                                handleHotelSelectionChange(ids);
                            }}
                            placeholder="Business Units"
                            closeMenuOnSelect={false}
                            isClearable
                            getOptionValue={(o) => String(o.hospitality_hotel_id)}
                            getOptionLabel={(o) => o.hotel_name || ''}
                            styles={selectStyles}
                            noOptionsMessage={() => 'No business units'}
                        />
                    </div>
                )}

                {/* RFQ Type */}
                <div style={filterItemStyle}>
                    <Select
                        options={[
                            { label: "Budgetary", value: "budgetary" },
                            { label: "Firm", value: "firm" },
                        ]}
                        onChange={handleFilterChange}
                        name="rfq_type"
                        placeholder="RFQ Type"
                        isClearable
                        styles={selectStyles}
                    />
                </div>

                {/* Type */}
                <div style={filterItemStyle}>
                    <Select
                        options={[
                            { label: "RFQ", value: "0" },
                            { label: "Tender", value: "1" },
                        ]}
                        onChange={handleFilterChange}
                        name="is_tender"
                        placeholder="Type"
                        isClearable
                        styles={selectStyles}
                    />
                </div>

                {/* Sort */}
                <div style={filterItemStyle}>
                    <Select
                        options={[
                            { label: "Latest First", value: "DESC" },
                            { label: "Oldest First", value: "ASC" },
                        ]}
                        onChange={handleFilterChange}
                        name="sort"
                        placeholder="Sort"
                        defaultValue={{ label: "Latest First", value: "DESC" }}
                        styles={selectStyles}
                    />
                </div>
            </div>
        </div>
    );
};

const disabledStyle = {
    opacity: 0.5,
    pointerEvents: 'none',
    userSelect: 'none',
};

const filterWrapStyle = {
    paddingBottom: 14,
    borderBottom: '1px solid #eef0f3',
};

const filterGridStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
};

const searchItemStyle = {
    flex: '2 1 200px',
    minWidth: 180,
};

const filterItemStyle = {
    flex: '0 1 160px',
    minWidth: 130,
};

const searchWrapStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid #e2e2e2',
    borderRadius: 7,
    padding: '0 10px',
    height: 34,
    background: '#fff',
    transition: 'border-color 0.15s',
};

const searchInputStyle = {
    border: 'none',
    outline: 'none',
    fontSize: 12.5,
    color: '#334155',
    width: '100%',
    background: 'transparent',
};

export default FilterSection;
