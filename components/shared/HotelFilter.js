import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { getUserMappings } from '@/services/hospitality';

/**
 * Reusable Business Unit/Company Filter Component
 * 
 * @param {Object} props
 * @param {Array} props.selectedHotelIds - Array of selected hotel IDs
 * @param {Function} props.onSelectionChange - Callback when selection changes (receives array of hotel IDs)
 * @param {boolean} props.isMulti - Whether to allow multiple selection (default: true)
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.className - Additional CSS class
 */
const HotelFilter = ({ 
  selectedHotelIds = [], 
  onSelectionChange, 
  isMulti = true,
  placeholder = "Select Business Units...",
  className = ""
}) => {
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserMappedHotels();
  }, []);

  const fetchUserMappedHotels = async () => {
    try {
      setLoading(true);
      const response = await getUserMappings();
      const mappings = (response?.data || []).filter(m => m.hospitality_hotel_id != null);
      setUserHotelMappings(mappings);
    } catch (error) {
      console.error("Error fetching user hotel mappings", error);
      setUserHotelMappings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (selectedOptions) => {
    if (isMulti) {
      const ids = selectedOptions 
        ? selectedOptions.map(opt => opt.hospitality_hotel_id) 
        : [];
      onSelectionChange(ids);
    } else {
      const id = selectedOptions?.hospitality_hotel_id || null;
      onSelectionChange(id);
    }
  };

  const getValue = () => {
    if (isMulti) {
      return userHotelMappings.filter(opt => 
        selectedHotelIds.includes(opt.hospitality_hotel_id)
      );
    } else {
      return userHotelMappings.find(opt => 
        opt.hospitality_hotel_id === selectedHotelIds
      ) || null;
    }
  };

  // Don't render if no hotel mappings
  if (!loading && userHotelMappings.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <Select
        isMulti={isMulti}
        options={userHotelMappings}
        value={getValue()}
        onChange={handleChange}
        placeholder={placeholder}
        closeMenuOnSelect={!isMulti}
        classNamePrefix="react-select"
        isLoading={loading}
        isClearable
        formatOptionLabel={(option) => (
          <div>
            <span>{option.hotel_name}</span>
          </div>
        )}
        getOptionValue={(option) => option.hospitality_hotel_id}
        styles={{
          control: (base) => ({
            ...base,
            minWidth: '200px',
          }),
        }}
      />
    </div>
  );
};

export default HotelFilter;

