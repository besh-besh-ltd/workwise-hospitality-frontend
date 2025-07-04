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
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [selectedStates, setSelectedStates] = useState([]);
    const [selectedCities, setSelectedCities] = useState([]);
    const [isCountryDropdownVisible, setCountryDropdownVisible] = useState(false);

    const countrySelectionRef = useRef(null);
    const stateSelectionRef = useRef(null);
    const citySelectionRef = useRef(null);
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
        if (!selectedCity && !selectedState && !selectedCountry) {
            setInputStateValue("");
            setInputCityValue("");
            setInputCountryValue("");
            setSelectedCountries([]);
            setSelectedStates([]);
            setSelectedCities([]);
            if(countrySelectionRef.current) {
                countrySelectionRef.current.value = ""
            }
            if(stateSelectionRef.current) {
                stateSelectionRef.current.value = ""
            }
            if(citySelectionRef.current) {
                citySelectionRef.current.value = ""
            }
        }
        else if (!selectedState) {
            const stateVal = states?.find((item) => item.id == selectedState)?.state_name;
            setInputStateValue(stateVal || "");
        }
        else if (!selectedCity) {
            const cityVal = cities?.find((item) => item.id == selectedCity)?.city_name;
            console.log(cityVal)
            setInputCityValue(cityVal || "");
        }
        else if (!selectedCountry) {
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
        if (!inputCountryValue && selectedCountries.length <= 0) return countries;
    
        // Filtered list based on input
        const filtered = countries.filter(country => !selectedCountry.some(c => c.name.toLowerCase() == country.country_name.toLowerCase())).filter((country) =>
            country.country_name.toLowerCase().includes(inputCountryValue.toLowerCase()) && !selectedCountries.some(_country => _country.name.toLowerCase() == inputCountryValue.toLowerCase())
        );
    
        // Non-matching countries follow
        const nonMatching = countries.filter(
            (country) => !country.country_name.toLowerCase().includes(inputCountryValue.toLowerCase()) && !selectedCountries.some(_country => _country.name.toLowerCase() == inputCountryValue.toLowerCase())
        );
    
        return [...filtered, ...nonMatching]; // Matching countries on top, rest follow
    };    

    // Filter states based on input ( Modified to filter based on selected country )
    const getFilteredStates = () => {
        let filteredStates = states;
    
        if (selectedCountry?.length > 0) {
            // Filter states based on selected country
            filteredStates = states.filter(state => !selectedState.some(s => s.name.toLowerCase() == state.state_name.toLowerCase())).filter((state) => selectedCountry.some(country => state.country_id === country.id));
        }
    
        if (inputStateValue === "") return filteredStates;
    
        // Filtered list based on input
        const filtered = filteredStates.filter((state) =>
            state.state_name.toLowerCase().includes(inputStateValue.toLowerCase()) 
                && !selectedState.some(state => state.name.toLowerCase() == inputStateValue.toLowerCase())
        );
    
        // Non-matching states follow
        const nonMatching = filteredStates.filter(
            (state) => !state.state_name.toLowerCase().includes(inputStateValue.toLowerCase())
                && !selectedState.some(state => state.name.toLowerCase() == inputStateValue.toLowerCase())
        );
    
        return [...filtered, ...nonMatching]; // Matching states on top, rest follow
    };

    // Filter cities based on input and selected state
    const getFilteredCities = () => {
        let filteredCities = cities;
        if (selectedCountry?.length > 0) {
            // Filter cities based on selected country
            filteredCities = cities.filter((city) => selectedCountry.some(country => city.country_id === country.id));
        }
        if (selectedState?.length > 0) {
            // Filter cities based on selected state
            filteredCities = cities.filter(city => !selectedCity.some(s => s.name.toLowerCase() == city.city_name.toLowerCase())).filter((city) => selectedState.some(state => city.state_id === state.id));
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
        if (!vendorMetaData.logged_In) {
            setOpenAuthModal(true);
        } else {
            setInputStateValue(state.state_name);
            setselectedState(prev => [...prev, {
                id: state.id,
                name: state.state_name
            }]);
            setInputCityValue("");
            setselectedCity([]);
            setStateDropdownVisible(false);
            if (stateSelectionRef.current) {
                stateSelectionRef.current.value = "";
            }
        }
    };

    // Handle city selection
    const handleCityOptionClick = (city) => {
        if (!vendorMetaData.logged_In) {
            setOpenAuthModal(true);
        } else {
            const stateItem = states.find((item) => item.id === city.state_id);
            setInputStateValue(stateItem.state_name);
            setInputCityValue(city.city_name);
            setselectedCity(prev => [...prev, {
                id: city.id,
                name: city.city_name
            }]);
            setCityDropdownVisible(false);
            if (citySelectionRef.current) {
                citySelectionRef.current.value = "";
            }
        }
    };

    // Handle country selection
    const handleCountryOptionClick = (country) => {
        if (!vendorMetaData.logged_In) {
            setOpenAuthModal(true);
        } else {
            setInputCountryValue(country.country_name);
            setselectedCountry(prev => [...prev, {
                id: country.id,
                name: country.country_name
            }]);
            setInputCityValue("");
            setInputStateValue("");
            setselectedCity([]);
            setselectedState([]);
            setCountryDropdownVisible(false);
            if (countrySelectionRef.current) {
                countrySelectionRef.current.value = "";
            }
        }
    };

    useEffect(() => {
        setSelectedCountries(selectedCountry)
        setSelectedStates(selectedState)
        setSelectedCities(selectedCity)
    }, [selectedCountry, selectedState, selectedCity])

    useEffect(() => {
        setselectedState([]);
        setselectedCity([]);
    }, [selectedCountries]);

    useEffect(() => {
        setselectedCity([]);
    }, [selectedStates]);

    return (
        <div className="autocomplete">
            {/* Country Autocomplete */}
            <div ref={countryRef} className="country-wrapper selection-dropdown">
                <input
                    ref={countrySelectionRef}
                    type="text"
                    onChange={handleCountryInputChange}
                    placeholder="Select or type a country"
                    onFocus={() => setCountryDropdownVisible(true)}
                    className="mt-2"
                />
                <div className="d-flex gap-2 flex-wrap mt-2">
                {selectedCountries.map(country => (
                    <div className="selected-country">
                        {country.name}
                        <button onClick={() => setselectedCountry(prev => prev.filter(_country => !(_country.id == country.id)))}>
                            X
                        </button>
                    </div>
                ))}
                </div>
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
                    ref={stateSelectionRef}
                    disabled={selectedCountry?.length <= 0}
                    type="text"
                    onChange={handleStateInputChange}
                    placeholder="Select or type a state"
                    onFocus={() => setStateDropdownVisible(true)}
                    className="mt-2"
                />
                <div className="d-flex gap-2 flex-wrap mt-2">
                    {selectedStates.map(state => (
                        <div className="selected-country">
                            {state.name}
                            <button onClick={() => setselectedState(prev => prev.filter(_state => !(_state.id == state.id)))}>
                                X
                            </button>
                        </div>
                    ))}
                </div>
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
                    ref={citySelectionRef}
                    disabled={selectedCountry?.length <= 0}
                    type="text"
                    onChange={handleCityInputChange}
                    placeholder="Select or type a city"
                    onFocus={() => setCityDropdownVisible(true)}
                    className="mt-2"
                />
                <div className="d-flex gap-2 flex-wrap mt-2">
                    {selectedCities.map(city => (
                        <div className="selected-country">
                            {city.name}
                            <button onClick={() => setselectedCity(prev => prev.filter(_city => !(_city.id == city.id)))}>
                                X
                            </button>
                        </div>
                    ))}
                </div>
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
