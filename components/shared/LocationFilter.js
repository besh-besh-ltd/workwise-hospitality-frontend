'use client';
import React, { useEffect, useRef, useState } from "react";
import { usePathname } from 'next/navigation';
const LocationFilter = ({ address, setAddress, resetKey}) => {
  const {
    selectedCountry,
    selectedState,
    selectedCity,
    countryList,
    stateList,
    cityList,
  } = address;

  const pathname = usePathname(); 

  // -----------------------------
  // useState Section
  // -----------------------------

  const [inputAddress, setInputAddress] = useState({
    country: "",
    state: "",
    city: ""
  });

  const [showDropDown, setShowDropdown] = useState({
    country: false,
    state: false,
    city: false
  });

  const [selectedStateList, setSelectedStateList] = useState([]);
  const [selectedCityList, setSelectedCityList] = useState([]);

  const countryRef = useRef(null);
  const stateRef = useRef(null);
  const cityRef = useRef(null);

  // -----------------------------
  // useEffect Section
  // -----------------------------

  useEffect(() => {
    const handler = (e) => {
      if (!countryRef.current?.contains(e.target))
        setShowDropdown((prev) => ({ ...prev, country: false }));

      if (!stateRef.current?.contains(e.target))
        setShowDropdown((prev) => ({ ...prev, state: false }));

      if (!cityRef.current?.contains(e.target))
        setShowDropdown((prev) => ({ ...prev, city: false }));
    };

      if(!pathname.match(/^\/vendor\/(?:[A-Za-z0-9]+-)*category\d+-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/)){
        localStorage.removeItem('location_filter_city');
      }

      setInputAddress({
        country: "",
        state: "",
        city: ""
      });


    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(()=>{
    if(pathname.match(/^\/vendor\/(?:[A-Za-z0-9]+-)*category\d+-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/)){
    if(localStorage.getItem('location_filter_city')){
      const savedAddress = JSON.parse(localStorage.getItem('location_filter_city'));

      if(savedAddress){
      setInputAddress((prev)=>({
        ...prev,
        state : savedAddress.state_name || "",
        city : savedAddress.city_name || ""
      }));
        addState({id : savedAddress.state_id, state_name : savedAddress.state_name});
        addCity({id : savedAddress.city_id, city_name : savedAddress.city_name});
      }
    }
  }
  else{
    if(localStorage.getItem('location_filter_city')){
      const savedAddress = JSON.parse(localStorage.getItem('location_filter_city'));

      if(savedAddress){
      setInputAddress((prev)=>({
        ...prev,
        state : savedAddress.state_name || "",
        city : savedAddress.city_name || ""
      }));
        addState({id : savedAddress.state_id, state_name : savedAddress.state_name});
        addCity({id : savedAddress.city_id, city_name : savedAddress.city_name});
      }
    }
  }
  },[pathname]);


  useEffect(()=>{
    if(selectedStateList){
      const states = selectedStateList.map((state)=>({  id : state?.id, name : state?.state_name}))
      setAddress((prev)=>({
        ...prev,
        selectedState : states
      }))
    }
  },[selectedStateList]);

  useEffect(()=>{
    const citys = selectedCityList.map((city)=>({  id : city?.id, name : city?.city_name}));

    setAddress((prev)=>({
      ...prev,
      selectedCity : citys
    }))

  },[selectedCityList]);

const isFirstRender = useRef(true);

useEffect(() => {
  if (isFirstRender.current) {
    isFirstRender.current = false;
    return;  // ⛔ skip first run
  }

  // run only on reset button click
  setInputAddress({ country: "", state: "", city: "" });
  setSelectedStateList([]);
  setSelectedCityList([]);
  setShowDropdown({
    country: false,
    state: false,
    city: false
  });
}, [resetKey]);


  // -----------------------------
  // Filtring Logic
  // -----------------------------
  const filteredCountries = countryList.filter((c) =>
    c.country_name.toLowerCase().includes(inputAddress.country.toLowerCase())
  );

  const filteredStates = stateList.filter(
    (s) =>
      (!selectedCountry || s.country_id === selectedCountry.id) &&
      s.state_name.toLowerCase().includes(inputAddress.state.toLowerCase())
  );

  const filteredCities = cityList.filter((c) => {
  if (!selectedState || selectedState.length === 0) return false;

  const stateIds = selectedState.map((s) => s.id);

  return (
    stateIds.includes(c.state_id) &&
    c.city_name.toLowerCase().includes(inputAddress.city.toLowerCase())
  );
});



  // -----------------------------
  // Functions
  // -----------------------------

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setInputAddress((prev) => ({ ...prev, [name]: value }));
    setShowDropdown((prev) => ({ ...prev, [name]: true }));
  };

  // Select Country to get the States
  const selectCountry = (country) => {
    setInputAddress((prev) => ({
      ...prev,
      country: country.country_name,
      state: "",
      city: ""
    }));

    setSelectedStateList([]);
    setSelectedCityList([]);

    setAddress((prev) => ({
      ...prev,
      selectedCountry: { id: country.id, name: country.country_name },
      // selectedState: null,
      // selectedCity: null
    }));

    setShowDropdown((prev) => ({ ...prev, country: false }));
  };


  // MULTI SELECT STATE
  const addState = (state) => {
    setSelectedStateList((prev) => [...prev, state]);
    setShowDropdown((prev) => ({ ...prev, state: false }));
  };

  const removeState = (id) => {
    setSelectedStateList((prev) => prev.filter((s) => s.id !== id));
  };

  // MULTI SELECT CITY
  const addCity = (city) => {
    setSelectedCityList((prev) => [...prev, city]);
    setShowDropdown((prev) => ({ ...prev, city: false }));
  };

  const removeCity = (id) => {
    setSelectedCityList((prev) => prev.filter((c) => c.id !== id));
  };


  // -----------------------------
  // UI
  // -----------------------------

  return (
    <div className="autocomplete">

      {/* COUNTRY */}
      <div ref={countryRef} className="selection-dropdown">
        <input
          typeof="text"
          name="country"
          placeholder="Select or type a country"
          value={inputAddress.country}
          onChange={handleAddressChange}
          onFocus={() =>
            setShowDropdown((prev) => ({ ...prev, country: true }))
          }
        />

        {showDropDown.country && (
          <ul className="dropdown">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c) => (
                <li
                  key={c.id}
                  className="dropdown-item"
                  onClick={() => selectCountry(c)}
                >
                  {c.country_name}
                </li>
              ))
            ) : (
              <li className="dropdown-item">No results found</li>
            )}
          </ul>
        )}
      </div>

      {/* STATE MULTI SELECT */}
      <div ref={stateRef} className="selection-dropdown">
        <input
          disabled={!selectedCountry}
          name="state"
          placeholder="Select or type a state"
          value={inputAddress.state}
          onChange={handleAddressChange}
          onFocus={() =>
            setShowDropdown((prev) => ({ ...prev, state: true }))
          }
        />

        {/* Selected States */}
        <div className="d-flex gap-2 flex-wrap mt-2">
          {
          selectedStateList.map((state) => (
            <div key={state.id} className="selected-country cursor-pointer">
              {state.state_name}
              <button onClick={() => removeState(state.id)}>X</button>
            </div>
          ))}
        </div>

        {showDropDown.state && (
          <ul className="dropdown">
            {(() => {
              const filtered = filteredStates.filter(
                (s) => !selectedStateList.some((sel) => sel.id === s.id)
              );

              if (filteredStates.length === 0)
                return <li className="dropdown-item">Nothing was found</li>;

              if (filtered.length === 0)
                return <li className="dropdown-item">Already added</li>;

              return filtered.map((s) => (
                <li
                  key={s.id}
                  className="dropdown-item"
                  onClick={() => addState(s)}
                >
                  {s.state_name}
                </li>
              ));
            })()}
          </ul>
        )}
      </div>

      {/* CITY MULTI SELECT */}
      <div ref={cityRef} className="selection-dropdown">
        <input
          disabled={selectedState?.length < 1}
          name="city"
          placeholder="Select or type a city"
          value={inputAddress.city}
          onChange={handleAddressChange}
          onFocus={() =>
            setShowDropdown((prev) => ({ ...prev, city: true }))
          }
        />

        {/* Selected Cities */}
        <div className="d-flex gap-2 flex-wrap mt-2">
          {selectedCityList.map((city) => (
            <div key={city.id} className="selected-country">
              {city.city_name}
              <button onClick={() => removeCity(city.id)}>X</button>
            </div>
          ))}
        </div>

        {showDropDown.city && (
          <ul className="dropdown">
            {(() => {
              const filtered = filteredCities.filter(
                (c) => !selectedCityList.some((sel) => sel.id === c.id)
              );

              if (filteredCities.length === 0)
                return <li className="dropdown-item">Nothing was found</li>;

              if (filtered.length === 0)
                return <li className="dropdown-item">Already added</li>;

              return filtered.map((c) => (
                <li
                  key={c.id}
                  className="dropdown-item"
                  onClick={() => addCity(c)}
                >
                  {c.city_name}
                </li>
              ));
            })()}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LocationFilter;