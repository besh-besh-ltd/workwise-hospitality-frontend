import { getAllCitiesService, getStates } from "@/services/cms";
import React, { useEffect, useRef, useState } from "react";

const LocationFilter = ({ selectedState, selectedCity, setselectedState, setselectedCity, vendorMetaData, setOpenAuthModal }) => {
    const [states, setstates] = useState([]);
    const [statesLoading, setstatesLoading] = useState(false);
    const [inputStateValue, setInputStateValue] = useState("");
    const [isStateDropdownVisible, setStateDropdownVisible] = useState(false);

    const [cities, setcities] = useState([]);
    const [citiesLoading, setcitiesLoading] = useState(false);
    const [inputCityValue, setInputCityValue] = useState("");
    const [isCityDropdownVisible, setCityDropdownVisible] = useState(false);

    const stateRef = useRef(null);
    const cityRef = useRef(null);

    const handleClickOutside = (event) => {
        if (stateRef.current && !stateRef.current.contains(event.target)) {
            setStateDropdownVisible(false);
        }
        if (cityRef.current && !cityRef.current.contains(event.target)) {
            setCityDropdownVisible(false);
        }
    };

    useEffect(() => {
        getAllStates();
        getAllCities();

        // Add event listener for clicks outside the dropdowns
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (selectedCity == 0 && selectedState == 0) {
            setInputStateValue("");
            setInputCityValue("");
        }
        else if (selectedState !== 0) {
            const stateVal = states?.find((item) => item.id == selectedState)?.state_name;
            setInputStateValue(stateVal || "");
        }
        else if (selectedCity !== 0) {
            const cityVal = cities?.find((item) => item.id == selectedCity)?.city_name;
            setInputCityValue(cityVal || "");
        }

    }, [selectedState, selectedCity]);

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
        getAllCitiesService().
            then((res) => {
                setcitiesLoading(false);
                setcities(res.data);
            });
    };

    // Filter states based on input
    const getFilteredStates = () => {
        if (inputStateValue === "") return states;

        // Filtered list based on input
        const filtered = states.filter((state) =>
            state.state_name.toLowerCase().includes(inputStateValue.toLowerCase())
        );

        // Non-matching states follow
        const nonMatching = states.filter(
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
    };

    // Handle city input change
    const handleCityInputChange = (e) => {
        setInputCityValue(e.target.value);
        setStateDropdownVisible(false);
        setCityDropdownVisible(true);
    };

    // Handle state selection
    const handleStateOptionClick = (state) => {
        if (!vendorMetaData.logged_In || !vendorMetaData.subscription) {
            setOpenAuthModal(true);
        } else {
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

    return (
        <div className="autocomplete">
            {/* State Autocomplete */}
            <div ref={stateRef} className="state-wrapper">
                <input
                    type="text"
                    value={inputStateValue}
                    onChange={handleStateInputChange}
                    placeholder="Select or type a state"
                    onFocus={() => setStateDropdownVisible(true)}
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
            <div ref={cityRef} className="city-wrapper">
                <input
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
