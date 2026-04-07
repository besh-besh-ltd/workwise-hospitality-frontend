import React, { useEffect, useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import { useSelector } from 'react-redux';


const FilterSection = ({ title, setFilterData }) => {
    const userProfile = useSelector((state) => state.userProfile);
    const [rfqNo, setRfqNo] =useState(null);
    const [userHotelMappings, setUserHotelMappings] = useState([]);
    const [selectedHotelIds, setSelectedHotelIds] = useState([]);
    const isInitialRfqNo = useRef(true);

    // Flat option list: drop company-wide mappings (no hotel id) and dedupe by hotel id.
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
                setFilterData((prevState) => ({
                    ...prevState,
                    ["rfq_no"]: rfqNo ? parseInt(rfqNo.replace('#','')) : null,
                }));
        }, 1000);

        return () => {
          clearTimeout(handler);
        };
      }, [rfqNo]);

      

    const handleFilterChange = (selectedOption, actionMeta) => {
        const { name } = actionMeta;
        let value;
        if (selectedOption === null) {
            // Handle clear action
            if (name === "reverse_auction") {
                value = "-1";
            } else if (name === "is_tender") {
                value = null;
            } else {
                value = "";
            }
        } else {
            value = selectedOption.value;
        }

        setFilterData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    }

    const handleHotelSelectionChange = (hotelIds) => {
        setSelectedHotelIds(hotelIds);
        setFilterData((prevState) => ({
            ...prevState,
            hotel_ids: hotelIds,
            page: 1,
        }));
    }

    useEffect(() => {
        const mappings = userProfile?.hospitality_mappings || [];
        setUserHotelMappings(mappings);
    }, [userProfile]);

    return (
        <div className="filter-section">
            {title && <h2 className="title">{title}</h2>}

            <div className="row mb-4 text-sm" >

                <div className="col-md-2 col-lg-2">
                    <label>Search Tender / RFQ No.</label>
                    <input
                        id="search_rfq_no-filter_section-manage_rfq_page"
                        className="form-control react-select" 
                        style={{ borderRadius: '0.25rem', borderColor: '#ced4da', boxShadow: 'none' }}
                        value={rfqNo}
                        onChange={(e)=> setRfqNo(e.target.value)}
                        name="rfq_type"
                        placeholder="Ex. 123456"
                        isClearable
                    />
                </div>

                {validHotelOptions.length > 0 && (
                    <div className="col-md-2 col-lg-2">
                        <label>Select Business Units</label>
                        <Select
                            id="select_hotels_filter-filter_section-manage_rfq_page"
                            isMulti
                            options={validHotelOptions}
                            value={validHotelOptions.filter(opt =>
                                selectedHotelIds.includes(opt.hospitality_hotel_id)
                            )}
                            onChange={(selectedOptions) => {
                                const ids = selectedOptions
                                    ? selectedOptions
                                        .map(opt => opt.hospitality_hotel_id)
                                        .filter(id => id != null)
                                    : [];
                                handleHotelSelectionChange(ids);
                            }}
                            placeholder="Select BUs"
                            closeMenuOnSelect={false}
                            classNamePrefix="react-select"
                            isClearable
                            getOptionValue={(option) => String(option.hospitality_hotel_id)}
                            getOptionLabel={(option) => option.hotel_name || ''}
                            styles={{
                                option: (base) => ({
                                    ...base,
                                    fontSize: '12px',
                                    paddingTop: 6,
                                    paddingBottom: 6,
                                }),
                                multiValueLabel: (base) => ({
                                    ...base,
                                    fontSize: '11px',
                                }),
                            }}
                            noOptionsMessage={() => 'No business units found'}
                        />
                    </div>
                )}


                <div className="col-md-3 col-lg-2">
                    <label>Tender / RFQ Type</label>
                    <Select
                        id="rfq_type_filter-filter_section-manage_rfq_page"
                        options={[
                            { label: "Budgetary", value: "budgetary" },
                            { label: "Firm", value: "firm" }
                        ]}
                        onChange={handleFilterChange}
                        name="rfq_type"
                        placeholder="Select"
                        isClearable
                    />
                </div>

                <div className="col-md-3 col-lg-2">
                    <label>Reverse Auction</label>
                    <Select
                        id="reverse_auction_filter-filter_section-manage_rfq_page"
                        options={[
                            { label: "Enabled", value: "1" },
                            { label: "Disabled", value: "0" }
                        ]}
                        onChange={handleFilterChange}
                        name="reverse_auction"
                        placeholder="Select"
                        isClearable
                    />
                </div>

                <div className="col-md-3 col-lg-2">
                    <label>Type</label>
                    <Select
                        id="is_tender_filter-filter_section-manage_rfq_page"
                        options={[
                            { label: "RFQ", value: "0" },
                            { label: "Tender", value: "1" }
                        ]}
                        onChange={handleFilterChange}
                        name="is_tender"
                        placeholder="Select"
                        isClearable
                    />
                </div>

                <div className="col-md-3 col-lg-2">
                    <label>Sort By</label>
                    <Select
                        id="sort_by_filter-filter_section-manage_rfq_page"
                        options={[
                            { label: "Latest to Oldest", value: "DESC" },
                            { label: "Oldest to Latest", value: "ASC" }
                        ]}
                        onChange={handleFilterChange}
                        name="sort"
                        placeholder="Select"
                        defaultValue={{ label: "Latest to Oldest", value: "DESC" }}
                        />
                </div>

            </div>
        </div>
    )
}

export default FilterSection
