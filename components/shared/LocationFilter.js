import { getCities, getCountries, getStates } from "@/services/cms";
import React, { useEffect, useRef, useState } from "react";

const LocationFilter = ({ selectedState, selectedCity, selectedCountry, setselectedState, setselectedCity, setselectedCountry, vendorMetaData, setOpenAuthModal }) => {
    const [states, setstates] = useState([]);
    const [statesLoading, setstatesLoading] = useState(false);
    const [inputStateValue, setInputStateValue] = useState("");
    const [isStateDropdownVisible, setStateDropdownVisible] = useState(false);

    const [cities, setcities] = useState([]);
    const [citiesLoading, setcitiesLoading] = useState(false);
    const [inputCityValue, setInputCityValue] = useState("");
    const [isCityDropdownVisible, setCityDropdownVisible] = useState(false);

    const [countries, setcountries] = useState([]);
    const [countriesLoading, setcountriesLoading] = useState(false);
    const [inputCountryValue, setInputCountryValue] = useState("");
    const [isCountryDropdownVisible, setCountryDropdownVisible] = useState(false);

    const countryRef = useRef(null);
    const stateRef = useRef(null);
    const cityRef = useRef(null);

    const handleClickOutside = (event) => {
        if (stateRef.current && !stateRef.current.contains(event.target)) {
            setStateDropdownVisible(false);
        }
        if (cityRef.current && !cityRef.current.contains(event.target)) {
            setCityDropdownVisible(false);
        }
        if (countryRef.current && !countryRef.current.contains(event.target)) {
            setCountryDropdownVisible(false);
        }
    };

    useEffect(() => {
        getAllStates();
        getAllCities();
        getAllCountries();

        // Add event listener for clicks outside the dropdowns
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (selectedCity == 0 && selectedState == 0 && selectedCountry == 0) {
            setInputStateValue("");
            setInputCityValue("");
            setInputCountryValue("");
        }
        else if (selectedState !== 0) {
            const stateVal = states?.find((item) => item.id == selectedState)?.state_name;
            setInputStateValue(stateVal || "");
        }
        else if (selectedCity !== 0) {
            const cityVal = cities?.find((item) => item.id == selectedCity)?.city_name;
            console.log(cityVal)
            setInputCityValue(cityVal || "");
        }
        else if (selectedCountry !== 0) {
            const countryVal = countries?.find((item) => item.id == selectedCountry)?.country_name;
            setInputCountryValue(countryVal || "");
        }

    }, [selectedState, selectedCity, selectedCountry]);

    const getAllStates = () => {
        setstatesLoading(true);
        getStates()
            .then((res) => {
                setstatesLoading(false);
                setstates(res.data);
            });
    };

    const getAllCities = () => {
        setcitiesLoading(true);
        getCities().
            then((res) => {
                setcitiesLoading(false);
                setcities(res.data);
            });
    };

    const getAllCountries = () => {
        setcitiesLoading(true);
        getCountries().
            then((res) => {
                setcountriesLoading(false);
                setcountries(res.data);
            });
    };

    const getFilteredCountries = () => {
        if (inputCountryValue === "") return countries;
    
        // Filtered list based on input
        const filtered = countries.filter((country) =>
            country.country_name.toLowerCase().includes(inputCountryValue.toLowerCase())
        );
    
        // Non-matching countries follow
        const nonMatching = countries.filter(
            (country) => !country.country_name.toLowerCase().includes(inputCountryValue.toLowerCase())
        );
    
        return [...filtered, ...nonMatching]; // Matching countries on top, rest follow
    };    

    // Filter states based on input ( Modified to filter based on selected country )
    const getFilteredStates = () => {
        let filteredStates = states;
    
        if (selectedCountry !== 0) {
            // Filter states based on selected country
            filteredStates = states.filter((state) => state.country_id === selectedCountry);
        }
    
        if (inputStateValue === "") return filteredStates;
    
        // Filtered list based on input
        const filtered = filteredStates.filter((state) =>
            state.state_name.toLowerCase().includes(inputStateValue.toLowerCase())
        );
    
        // Non-matching states follow
        const nonMatching = filteredStates.filter(
            (state) => !state.state_name.toLowerCase().includes(inputStateValue.toLowerCase())
        );
    
        return [...filtered, ...nonMatching]; // Matching states on top, rest follow
    };

    // Filter cities based on input and selected state
    const getFilteredCities = () => {
        let filteredCities = cities;
        if (selectedState !== 0) {
            // Filter cities based on selected state
            filteredCities = cities.filter((city) => city.state_id === selectedState);
        }
        if (inputCityValue === "") return filteredCities;

        // Filter based on city name input
        const filtered = filteredCities.filter((city) =>
            city.city_name.toLowerCase().includes(inputCityValue.toLowerCase())
        );

        const nonMatching = filteredCities.filter(
            (city) => !city.city_name.toLowerCase().includes(inputCityValue.toLowerCase())
        );

        return [...filtered, ...nonMatching];
    };

    // Handle state input change
    const handleStateInputChange = (e) => {
        setInputStateValue(e.target.value);
        setStateDropdownVisible(true);
        setCityDropdownVisible(false);
        setCountryDropdownVisible(false);
    };

    // Handle city input change
    const handleCityInputChange = (e) => {
        setInputCityValue(e.target.value);
        setStateDropdownVisible(false);
        setCountryDropdownVisible(false);
        setCityDropdownVisible(true);
    };

    // Hanle country input change
    const handleCountryInputChange = (e) => {
        setInputCountryValue(e.target.value);
        setStateDropdownVisible(false);
        setCityDropdownVisible(false);
        setCountryDropdownVisible(true);
    };

    // Handle state selection
    const handleStateOptionClick = (state) => {
        if (!vendorMetaData.logged_In || !vendorMetaData.subscription) {
            setOpenAuthModal(true);
        } else {
            const countryItem = countries.find((item) => item.id === state.country_id);
            setInputStateValue(countryItem.country_name);
            setselectedCountry(state.country_id);
            setInputStateValue(state.state_name);
            setselectedState(state.id);
            setInputCityValue("");
            setselectedCity(0);
            setStateDropdownVisible(false);
        }
    };

    // Handle city selection
    const handleCityOptionClick = (city) => {
        if (!vendorMetaData.logged_In || !vendorMetaData.subscription) {
            setOpenAuthModal(true);
        } else {
            const stateItem = states.find((item) => item.id === city.state_id);
            setInputStateValue(stateItem.state_name);
            setselectedState(city.state_id);
            setInputCityValue(city.city_name);
            setselectedCity(city.id);
            setCityDropdownVisible(false);
        }
    };

    // Handle country selection
    const handleCountryOptionClick = (country) => {
        if (!vendorMetaData.logged_In || !vendorMetaData.subscription) {
            setOpenAuthModal(true);
        } else {
            setInputCountryValue(country.country_name);
            setselectedCountry(country.id);
            setInputCityValue("");
            setInputStateValue("");
            setselectedCity(0);
            setselectedState(0);
            setCountryDropdownVisible(false);
        }
    };

    return (
        <div className="autocomplete">
            {/* Country Autocomplete */}
            <div ref={countryRef} className="country-wrapper selection-dropdown">
                <input
                    type="text"
                    value={inputCountryValue}
                    onChange={handleCountryInputChange}
                    placeholder="Select or type a country"
                    onFocus={() => setCountryDropdownVisible(true)}
                    className="mt-2"
                />
                {isCountryDropdownVisible && (
                    <ul className="dropdown">
                        {getFilteredCountries().length > 0 ? (
                            getFilteredCountries().map((country) => (
                                <li
                                    key={country.id}
                                    onClick={() => handleCountryOptionClick(country)}
                                    className="dropdown-item"
                                >
                                    {country.country_name}
                                </li>
                            ))
                        ) : (
                            <li className="dropdown-item">No results found</li>
                        )}
                    </ul>
                )}
            </div>

            {/* State Autocomplete */}
            <div ref={stateRef} className="state-wrapper selection-dropdown">
                <input
                    disabled={selectedCountry == 0}
                    type="text"
                    value={inputStateValue}
                    onChange={handleStateInputChange}
                    placeholder="Select or type a state"
                    onFocus={() => setStateDropdownVisible(true)}
                    className="mt-2"
                />
                {isStateDropdownVisible && (
                    <ul className="dropdown">
                        {getFilteredStates().length > 0 ? (
                            getFilteredStates().map((state) => (
                                <li
                                    key={state.id}
                                    onClick={() => handleStateOptionClick(state)}
                                    className="dropdown-item"
                                >
                                    {state.state_name}
                                </li>
                            ))
                        ) : (
                            <li className="dropdown-item">No results found</li>
                        )}
                    </ul>
                )}
            </div>

            {/* City Autocomplete */}
            <div ref={cityRef} className="city-wrapper selection-dropdown">
                <input
                    disabled={selectedState == 0}
                    type="text"
                    value={inputCityValue}
                    onChange={handleCityInputChange}
                    placeholder="Select or type a city"
                    onFocus={() => setCityDropdownVisible(true)}
                    className="mt-2"
                />
                {isCityDropdownVisible && (
                    <ul className="dropdown">
                        {getFilteredCities().length > 0 ? (
                            getFilteredCities().map((city) => (
                                <li
                                    key={city.id}
                                    onClick={() => handleCityOptionClick(city)}
                                    className="dropdown-item"
                                >
                                    {city.city_name}
                                </li>
                            ))
                        ) : (
                            <li className="dropdown-item">No results found</li>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default LocationFilter;
