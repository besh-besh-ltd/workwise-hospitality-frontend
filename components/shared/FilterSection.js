import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { getUserMappings } from '@/services/hospitality';


const FilterSection = ({ title, setFilterData }) => {
    const [rfqNo, setRfqNo] =useState(null);
    const [userHotelMappings, setUserHotelMappings] = useState([]);
    const [selectedHotelIds, setSelectedHotelIds] = useState([]);

    useEffect(() => {
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

    const fetchUserHotelMappings = async () => {
        try {
            const response = await getUserMappings();
            const mappings = response?.data || [];
            setUserHotelMappings(mappings);
        } catch (error) {
            console.error("Error fetching user hotel mappings", error);
        }
    }

    const handleHotelSelectionChange = (hotelIds) => {
        setSelectedHotelIds(hotelIds);
    }

    useEffect(() => {
        fetchUserHotelMappings();
    }, []);

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

                {userHotelMappings.length > 0 && (
                    <div className="col-md-2 col-lg-2">
                        <label>Select Business Units</label>
                        <Select
                            id="select_hotels_filter-filter_section-manage_rfq_page"
                            isMulti
                            options={userHotelMappings}
                            value={userHotelMappings.filter(opt => 
                                selectedHotelIds.includes(opt.hospitality_hotel_id)
                            )}
                            onChange={(selectedOptions) => {
                                const ids = selectedOptions 
                                    ? selectedOptions.map(opt => opt.hospitality_hotel_id)
                                    : [];
                                handleHotelSelectionChange(ids);
                            }}
                            placeholder="Select Business Units..."
                            closeMenuOnSelect={false}
                            classNamePrefix="react-select"
                            isClearable
                            formatOptionLabel={(option) => (
                                <div>
                                    <span>{option.hotel_name}</span>
                                </div>
                            )}
                            getOptionValue={(option) => option.hospitality_hotel_id}
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
