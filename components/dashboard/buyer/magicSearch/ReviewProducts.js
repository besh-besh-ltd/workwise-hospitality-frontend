import Accordion from 'react-bootstrap/Accordion';
import FileLink from "@/components/shared/FileLink";
import { faClose, faCloudArrowUp, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Select from 'react-select';
import { getCities, getCountries, getStates } from '@/services/cms';
import { toast } from 'react-toastify';
import _ from 'lodash';
import { vendorConditions } from '../../vendor/search';

const customeStyles = {
    control: (provided) => ({
        ...provided,
        height: '20px',
        fontSize: '14px'
    }),
    input: (provided) => ({
        ...provided,
        margin: 0,
        fontSize: '14px',
    }),
    placeholder: (provided) => ({
        ...provided,
        fontSize: '14px',
    }),
    singleValue: (provided) => ({
        ...provided,
        fontSize: '14px',
    }),
    option: (provided) => ({
        ...provided,
        fontSize: '14px',
    })
}

const ReviewProducts = ({
    data, changeProductData, handleFiles, removeItem,
    globalFilters, vendorMap, setVendorMap, states: _states, cities: _cities, countries, vendorTypes }) => {

    const [globalStates, setGlobalStates] = useState(null);
    const [globalCities, setGlobalCities] = useState(null);
    const [isLocalFilterVisible, setIsLocalFilterVisible] = useState({});

    const [cities, setCities] = useState(new Map());
    const [states, setStates] = useState(new Map());

    const [localFilterMap, setLocalFilterMap] = useState(new Map());

    const updateVendorList = () => {
        const vMap = new Map();

        for (const prodItem of data) {
            const prodKey = `prod_${prodItem.product_id}_${prodItem.variant}`;
            let updatedVendors = prodItem.vendors || [];

            const filter = localFilterMap.get(prodKey);
            if (filter?.vendor_info?.value) {
                updatedVendors = updatedVendors.filter(
                    (vendorItem) => _.isEqual(vendorItem.vendor_info, filter.vendor_info.value)
                );
            }
            if ((filter?.from != "" && parseInt(filter?.from) > 0) || (filter?.to != "" && parseInt(filter?.to) > 0)) {
                if((filter?.from != "" && parseInt(filter?.from) > 0) && (filter?.to != "" && parseInt(filter?.to) > 0)) {
                    updatedVendors = updatedVendors.filter(
                        (vendorItem) => vendorItem.turnover >= parseInt(filter.from) && vendorItem.turnover <= parseInt(filter.to)
                    );
                } else if ((filter?.from != "" && parseInt(filter?.from) > 0)) {
                    updatedVendors = updatedVendors.filter(
                        (vendorItem) => vendorItem.turnover >= parseInt(filter.from)
                    );
                } else if ((filter?.to != "" && parseInt(filter?.to) > 0)) {
                    updatedVendors = updatedVendors.filter(
                        (vendorItem) => vendorItem.turnover <= parseInt(filter.to)
                    );
                }
            }
            if(filter?.vendor_type && filter.vendor_type?.length > 0) {
                updatedVendors = updatedVendors.filter(
                    (vendorItem) => filter.vendor_type.some(type => type.value.toLowerCase() == (vendorItem.nature_of_business ?? "").toLowerCase())
                );
            }
            if(filter?.prev_worked_with?.value) {
                const prev_worked_with_value = filter?.prev_worked_with?.value
                if(prev_worked_with_value == 'prev_finalized')
                    updatedVendors = updatedVendors.filter(
                        (vendorItem) =>
                            vendorItem.vendor_info.prev_finalized
                    );
                else
                    updatedVendors = updatedVendors.filter(
                        (vendorItem) =>
                            vendorItem.vendor_info.rfq_added
                    );
            }
            if (filter?.country && filter.country.length > 0) {
                updatedVendors = updatedVendors.filter(
                    (vendorItem) => filter.country.some(country => country.label.toLowerCase() == (vendorItem?.country_name ?? "India").toLowerCase())
                );
            }
            if (filter?.city && filter.city.length > 0) {
                updatedVendors = updatedVendors.filter(
                    (vendorItem) => filter.city.some(city => city.label.toLowerCase() == vendorItem.city_name?.toLowerCase())
                );
            }
            if (filter?.state && filter.state.length > 0) {
                updatedVendors = updatedVendors.filter(
                    (vendorItem) => filter.state.some(state => state.label.toLowerCase() == vendorItem.state_name?.toLowerCase())
                );
            }
            vMap.set(prodKey, updatedVendors)
        }
        setVendorMap(vMap);
    }

    const handleGenericInputChange = (prodKey, event) => {
        const fMap = new Map(localFilterMap);
        let filters = fMap.get(prodKey);
        console.log(filters)
        fMap.set(prodKey, {
            ...filters,
            [event.target.name]: event.target.value
        })
        if(event.target.name == 'country' && (!event.target.value || event.target.value.length <= 0)) {
          fMap.set(prodKey, {
            ...filters,
            'state': [],
            'city': []
          })
        }
        if(event.target.name == 'state' && (!event.target.value || event.target.value.length <= 0)) {
          fMap.set(prodKey, {
            ...filters,
            'city': []
          })
        }
        setLocalFilterMap(fMap);
        getAllStates(prodKey, event.target.name == 'country' ? event.target.value : null);
        getAllCities(prodKey, event.target.name == 'state' ? event.target.value : null, event.target.name == 'country' ? event.target.value : null);
    }

    const handleLocalFilterChange = (prodKey, selectedOption, actionMeta) => {
        let fMap = new Map(localFilterMap);
        let filters = fMap.get(prodKey);
        if(actionMeta.name == 'country' && (!selectedOption || selectedOption.length <= 0)) {
          console.log("Coming in country")
          fMap = fMap.set(prodKey, {
            ...filters,
            'state': [],
            'city': []
          })
          filters = fMap.get(prodKey);
        }
        if(actionMeta.name == 'state' && (!selectedOption.value || selectedOption.length <= 0)) {
          console.log("Coming in state")
          fMap = fMap.set(prodKey, {
            ...filters,
            'city': []
          })
          filters = fMap.get(prodKey);
        }
        fMap = fMap.set(prodKey, {
            ...filters,
            [actionMeta.name]: selectedOption
        })
        setLocalFilterMap(fMap);
        getAllStates(prodKey, actionMeta.name == 'country' ? selectedOption : filters?.country);
        getAllCities(prodKey, actionMeta.name == 'state' ? selectedOption : filters?.state, actionMeta.name == 'country' ? selectedOption : filters?.country);
    }
    
    const getAllStates = (prod_key, country) => {
        if(!prod_key || !country) return;
        try {
            setStates((prev) => {
                const prevStates = globalStates
                const updatedStates = prev.set(
                    prod_key,
                    prevStates.filter(state => country.some(c => c.value == state.country_id))
                  )
                return updatedStates
            }
            );
        } catch (error) {
            toast.error(error.message)
            return [];
        }
    };

    const getAllCities = async (prod_key, state, country) => {
        if(!prod_key) return;
        try {
            setCities((prev) => {
                const prevCities = globalCities
                const updatedCities = prev.set(
                    prod_key,
                    state && state.length > 0 ? prevCities.filter(city => {console.log("Filtering cities from state"); return state.some(s => s.value == city.state_id)})
                    : country && country.length > 0 ? prevCities.filter(city => {console.log("Filtering cities from country"); return country.some(c => c.value == city.country_id)})
                    : prevCities
                )
                return updatedCities
            });
        } catch (error) {
            toast.error(error.message)
            return [];
        }
    };

    const fetchStates = async () => {
        try {
            const res = await getStates();
            setGlobalStates(
                res.data.map((state) => ({
                    label: state.state_name,
                    value: state.id,
                    country_id: state.country_id,
                }))
            )
        } catch (error) {
            toast.error(error.message)
            return [];
        }
    };
    
    const fetchCities = async () => {
        try {
            const res = await getCities();
            setGlobalCities(
                res.data.map((city) => ({
                    label: city.city_name,
                    value: city.id,
                    state_id: city.state_id,
                    country_id: city.country_id
                }))
            )
        } catch (error) {
            toast.error(error.message)
            return [];
        }
    };

    useEffect(()=> {
        updateVendorList();
    }, [localFilterMap]);

    useEffect(() => {
        fetchStates();
        fetchCities();
    }, [])

    useEffect(() => {
        setLocalFilterMap((prevState) => {
            const lFMap = new Map(prevState);
            for (const [key, value] of lFMap.entries()) {
                lFMap.set(key, globalFilters);
            }
            return lFMap;
        })
        cities.keys().forEach(city => {
            getAllCities(city, globalFilters.state, globalFilters.country)
        }
    )
        states.keys().forEach(state => getAllStates(state, globalFilters.country))
    }, [globalFilters]);

    useEffect(() => {
        // Local Filter Map (lMap)
        const lMap = new Map();
        // Vendors Map (vMap)
        const vMap = new Map();
        // States Map (sMap)
        const sMap = new Map();
        // Cities Map (sMap)
        const cMap = new Map();
        // Filter Visible Map (fMap);
        const fMap = {};

        data.forEach((prodItem) => {
            const prodKey = `prod_${prodItem.product_id}_${prodItem.variant}`;
            vMap.set(prodKey, prodItem.vendors);

            lMap.set(prodKey, {
                city: null,
                state: null,
                country: null,
                is_private: null,
                from: "",
                to: "",
            });
            
            const statesResult = _states.map((state) => ({
                label: state.state_name,
                value: state.id,
                country_id: state.country_id,
            }))
            
            const citiesResult = _cities.map((city) => ({
                label: city.city_name,
                value: city.id,
                state_id: city.state_id,
            }))
            
            sMap.set(prodKey, statesResult)
            cMap.set(prodKey, citiesResult)
            fMap[prodKey] = false
        });

        setLocalFilterMap(lMap);
        setVendorMap(vMap);
        setStates(sMap);
        setCities(cMap);
        setIsLocalFilterVisible(fMap);
    }, [data]);


    return (
        <Accordion alwaysOpen >
            {data &&
                data.map((prodItem, index) => {
                    let tempSpec = {};
                    prodItem.spec?.map((specItem) => {
                        tempSpec[specItem.title] = specItem.value
                    })
                    const prodKey = `prod_${prodItem.product_id}_${prodItem.variant}`;
                    console.log("PROD KEY: ", prodKey)

                    return (
                      <Accordion.Item
                        key={prodKey}
                        eventKey={index}
                        className="border-0"
                      >
                        <div className="border border-2 rounded-3 mb-2 p-2">
                          <Accordion.Header>
                            <h2 className="h6 mb-0">
                              Product Name: {prodItem.name}
                            </h2>
                          </Accordion.Header>

                          <Accordion.Body className="row py-0">
                            <hr style={{ margin: "8px 0" }} />
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                alignItems: "center",
                                gap: "0.8rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 18,
                                  fontWeight: 500,
                                }}
                              >
                                Local Filters
                              </span>
                              <button
                                onClick={() =>
                                    setIsLocalFilterVisible((prev) => ({
                                        ...prev,
                                        [prodKey]: !prev[prodKey],
                                    }))
                                }
                                style={{
                                  width: "fit-content",
                                  fontSize: 19,
                                  padding: "0.1rem 0.5rem",
                                  backgroundColor: "var(--primary-color)",
                                  color: "white",
                                  borderRadius: 6,
                                  border: 0,
                                }}
                              >
                                {!!isLocalFilterVisible[prodKey] ? 'X' : '+'}
                              </button>
                            </div>
                              <div className={`local-filter-container ${isLocalFilterVisible[prodKey] ? "show" : ""}`}>
                                <div className="col-md-5"></div>
                                <div className="pt-3 mb-3">
                                  <div className="row">
                                    <div className="col-md-3">
                                      <div>
                                        <p className="fw-medium  mb-2">
                                          Country
                                        </p>
                                        <Select
                                          className='overflow-dropdown'
                                          isMulti
                                          name="country"
                                          options={countries}
                                          value={
                                            localFilterMap.get(prodKey)?.country
                                          }
                                          placeholder="Country"
                                          isClearable
                                          isSearchable
                                          onChange={(
                                            selectedOption,
                                            actionMeta
                                          ) =>
                                            handleLocalFilterChange(
                                              prodKey,
                                              selectedOption,
                                              actionMeta
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className="col-md-3">
                                      <div>
                                        <p className="fw-medium  mb-2">State</p>
                                        <Select
                                          isDisabled={
                                            !localFilterMap.get(prodKey)
                                              ?.country ||
                                            localFilterMap.get(prodKey).country
                                              .length <= 0
                                          }
                                          isMulti
                                          name="state"
                                          options={states.get(prodKey)}
                                          value={
                                            localFilterMap.get(prodKey)?.state
                                          }
                                          placeholder="State"
                                          isClearable
                                          isSearchable
                                          onChange={(
                                            selectedOption,
                                            actionMeta
                                          ) =>
                                            handleLocalFilterChange(
                                              prodKey,
                                              selectedOption,
                                              actionMeta
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className="col-md-3">
                                      <div>
                                        <p className="fw-medium  mb-2">City</p>
                                        <Select
                                          isDisabled={
                                            !localFilterMap.get(prodKey)
                                              ?.country ||
                                            localFilterMap.get(prodKey).country
                                              .length <= 0
                                          }
                                          isMulti
                                          name="city"
                                          options={cities.get(prodKey)}
                                          value={
                                            localFilterMap.get(prodKey)?.city
                                          }
                                          placeholder="City"
                                          isClearable
                                          isSearchable
                                          onChange={(
                                            selectedOption,
                                            actionMeta
                                          ) =>
                                            handleLocalFilterChange(
                                              prodKey,
                                              selectedOption,
                                              actionMeta
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className="col-md-3">
                                      <div>
                                        <p className="fw-medium  mb-2">
                                          My Vendors
                                        </p>
                                        <Select
                                          options={[
                                            {
                                              label: "All Vendors",
                                              value: {
                                                is_private: 0,
                                                is_linked_with_buyer: 0,
                                              },
                                            },
                                            {
                                              label: "Private Vendors",
                                              value: {
                                                is_private: 1,
                                                is_linked_with_buyer: 1,
                                              },
                                            },
                                            {
                                              label: "Public Vendors",
                                              value: {
                                                is_private: 0,
                                                is_linked_with_buyer: 1,
                                              },
                                            },
                                          ]}
                                          value={
                                            localFilterMap.get(prodKey)
                                              ?.vendor_info
                                          }
                                          onChange={(
                                            selectedOption,
                                            actionMeta
                                          ) =>
                                            handleLocalFilterChange(
                                              prodKey,
                                              selectedOption,
                                              actionMeta
                                            )
                                          }
                                          name="vendor_info"
                                          placeholder="Select"
                                          isClearable
                                          isSearchable
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="row mt-3">
                                    {/* <div className="col-md-6">
                                      <p className="fw-medium  mb-2">
                                        Turnover Filters
                                      </p>
                                      <div className="row">
                                        <div className="col-md-6">
                                          <div>
                                            <p className="fw-medium  mb-2">
                                              FROM
                                            </p>
                                            <input
                                              type="text"
                                              name="from"
                                              className="form-control"
                                              placeholder="FROM ( IN CR )"
                                              value={
                                                localFilterMap.get(prodKey)
                                                  ?.from
                                              }
                                              onChange={(event) =>
                                                handleGenericInputChange(
                                                  prodKey,
                                                  event
                                                )
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className="col-md-6">
                                          <div>
                                            <p className="fw-medium  mb-2">
                                              TO
                                            </p>
                                            <input
                                              type="text"
                                              name="to"
                                              className="form-control"
                                              placeholder="TO ( IN CR )"
                                              value={
                                                localFilterMap.get(prodKey)?.to
                                              }
                                              onChange={(event) =>
                                                handleGenericInputChange(
                                                  prodKey,
                                                  event
                                                )
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div> */}
                                    <div className="col-md-6">
                                      <p className="fw-medium  mb-2 opacity-0">
                                        x
                                      </p>
                                      <div className="row">
                                        <div className="col-md-6">
                                          <div>
                                            <p className="fw-medium  mb-2">
                                              Vendor Type
                                            </p>
                                            <Select
                                              options={vendorTypes}
                                              isMulti
                                              style={customeStyles.input({})}
                                              value={
                                                localFilterMap.get(prodKey)
                                                  ?.vendor_type
                                              }
                                              onChange={(
                                                selectedOption,
                                                actionMeta
                                              ) =>
                                                handleLocalFilterChange(
                                                  prodKey,
                                                  selectedOption,
                                                  actionMeta
                                                )
                                              }
                                              name="vendor_type"
                                              placeholder="Select"
                                              isClearable
                                              isSearchable
                                            />
                                          </div>
                                        </div>
                                        <div className="col-md-6">
                                          <div>
                                            <p className="fw-medium  mb-2">
                                              Previously Worked With
                                            </p>
                                            <Select
                                              options={vendorConditions}
                                              value={
                                                localFilterMap.get(prodKey)
                                                  ?.prev_worked_with
                                              }
                                              onChange={(
                                                selectedOption,
                                                actionMeta
                                              ) =>
                                                handleLocalFilterChange(
                                                  prodKey,
                                                  selectedOption,
                                                  actionMeta
                                                )
                                              }
                                              name="prev_worked_with"
                                              placeholder="Select"
                                              isClearable
                                              isSearchable
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <hr style={{
                                    marginTop: 12
                                }}/>
                              </div>
                            {/* Spec, Size, Quantity, Unit Section */}
                            <div className="col-sm-12 col-md-6 col-lg-4 pe-0">
                              <div className="row">
                                <div className="col-12 mb-2">
                                  <label
                                    htmlFor={`spec_${prodItem.product_id}_${prodItem.variant}`}
                                    className="form-label small mb-1 "
                                  >
                                    Product Specification
                                  </label>
                                  <textarea
                                    style={{ width: "100%" }}
                                    rows={4}
                                    name="Spec"
                                    id={`spec_${prodItem.product_id}_${prodItem.variant}`}
                                    value={tempSpec?.Spec}
                                    onChange={(e) =>
                                      changeProductData("spec", e, prodItem)
                                    }
                                    className="form-control text-sm opacity-75"
                                  />
                                </div>
                                <div className="col-12 mb-2">
                                  <label
                                    htmlFor={`size_${prodItem.product_id}_${prodItem.variant}`}
                                    className="form-label small mb-1 "
                                  >
                                    Product Size
                                  </label>
                                  <input
                                    type="text"
                                    name="Size"
                                    id={`size_${prodItem.product_id}_${prodItem.variant}`}
                                    value={tempSpec?.Size}
                                    onChange={(e) =>
                                      changeProductData("spec", e, prodItem)
                                    }
                                    className="form-control text-sm opacity-75 "
                                  />
                                </div>
                                <div className="col-6 mb-2">
                                  <label
                                    htmlFor={`qty_${prodItem.product_id}_${prodItem.variant}`}
                                    className="form-label small mb-1 "
                                  >
                                    Product Quantity{" "}
                                    <span className="text-danger">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    name="Quantity"
                                    id={`qty_${prodItem.product_id}_${prodItem.variant}`}
                                    value={tempSpec?.Quantity}
                                    required
                                    onChange={(e) =>
                                      changeProductData("spec", e, prodItem)
                                    }
                                    className="form-control text-sm opacity-75 "
                                  />
                                </div>
                                <div className="col-6 mb-2">
                                  <label
                                    htmlFor={`unit_${prodItem.product_id}_${prodItem.variant}`}
                                    className="form-label small mb-1 "
                                  >
                                    Product Unit{" "}
                                    <span className="text-danger">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    name="Unit"
                                    id={`unit_${prodItem.product_id}_${prodItem.variant}`}
                                    value={tempSpec?.Unit}
                                    required
                                    onChange={(e) =>
                                      changeProductData("spec", e, prodItem)
                                    }
                                    className="form-control text-sm opacity-75 "
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Files and Comment Section */}
                            <div className="col-sm-12 col-md-6 col-lg-4 pe-0">
                              <div className="mb-2">
                                <label
                                  htmlFor={`files_${prodItem.product_id}_${prodItem.variant}`}
                                  className="form-label small mb-1 "
                                >
                                  Files Section
                                </label>
                                <div
                                  className="form-control "
                                  id={`vendor_list_${prodItem.product_id}_${prodItem.variant}`}
                                  style={{ height: "8rem" }}
                                >
                                  <div className="row my-2">
                                    <div className="col-4">
                                      <label
                                        htmlFor={`spec_file${prodItem.product_id}_${prodItem.variant}`}
                                        className="upload uploadInlineFile d-flex justify-content-center align-items-center p-1 "
                                      >
                                        <FontAwesomeIcon
                                          icon={faCloudArrowUp}
                                          className="me-2"
                                        />
                                        Spec
                                        <input
                                          type="file"
                                          id={`spec_file${prodItem.product_id}_${prodItem.variant}`}
                                          accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                          onChange={(e) =>
                                            handleFiles(
                                              "spec_file",
                                              e,
                                              prodItem,
                                              false
                                            )
                                          }
                                          style={{
                                            padding: "0.25rem 0.5rem",
                                            width: "100px",
                                          }}
                                        />
                                      </label>
                                      <FileLink
                                        Files={prodItem.spec_file}
                                        RemoveFile={(type, fileLink) =>
                                          handleFiles(
                                            type,
                                            null,
                                            prodItem,
                                            true,
                                            fileLink
                                          )
                                        }
                                        FileType="spec_file"
                                      />
                                    </div>
                                    <div className="col-4 ">
                                      <label
                                        htmlFor={`datasheet_file${prodItem.product_id}_${prodItem.variant}`}
                                        className="upload uploadInlineFile d-flex justify-content-center align-items-center p-1 "
                                      >
                                        <FontAwesomeIcon
                                          icon={faCloudArrowUp}
                                          className="me-2"
                                        />
                                        TDS
                                        <input
                                          type="file"
                                          id={`datasheet_file${prodItem.product_id}_${prodItem.variant}`}
                                          accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                          onChange={(e) =>
                                            handleFiles(
                                              "datasheet_file",
                                              e,
                                              prodItem,
                                              false
                                            )
                                          }
                                          style={{
                                            padding: "0.25rem 0.5rem",
                                            width: "100px",
                                          }}
                                        />
                                      </label>
                                      <FileLink
                                        Files={prodItem.datasheet_file}
                                        RemoveFile={(type, fileLink) =>
                                          handleFiles(
                                            type,
                                            null,
                                            prodItem,
                                            true,
                                            fileLink
                                          )
                                        }
                                        FileType="datasheet_file"
                                      />
                                    </div>
                                    <div className="col-4 ">
                                      <label
                                        htmlFor={`qap_file${prodItem.product_id}_${prodItem.variant}`}
                                        className="upload uploadInlineFile d-flex justify-content-center align-items-center p-1 "
                                      >
                                        <FontAwesomeIcon
                                          icon={faCloudArrowUp}
                                          className="me-2"
                                        />
                                        QAP
                                        <input
                                          type="file"
                                          id={`qap_file${prodItem.product_id}_${prodItem.variant}`}
                                          accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                          onChange={(e) =>
                                            handleFiles(
                                              "qap_file",
                                              e,
                                              prodItem,
                                              false
                                            )
                                          }
                                          style={{
                                            padding: "0.25rem 0.5rem",
                                            width: "100px",
                                          }}
                                        />
                                      </label>
                                      <FileLink
                                        Files={prodItem.qap_file}
                                        RemoveFile={(type, fileLink) =>
                                          handleFiles(
                                            type,
                                            null,
                                            prodItem,
                                            true,
                                            fileLink
                                          )
                                        }
                                        FileType="qap_file"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mb-2">
                                <label
                                  htmlFor={`cmnt_${prodItem.product_id}_${prodItem.variant}`}
                                  className="form-label small mb-1 "
                                >
                                  Product Comment
                                </label>
                                <textarea
                                  style={{ width: "100%" }}
                                  rows={3}
                                  name="comment"
                                  id={`cmnt_${prodItem.product_id}_${prodItem.variant}`}
                                  value={prodItem.comment}
                                  onChange={(e) =>
                                    changeProductData("comment", e, prodItem)
                                  }
                                  className="form-control text-sm opacity-75"
                                />
                              </div>
                            </div>

                            {/* Vendor List Section */}
                            <div className="col-sm-12 col-md-6 col-lg-4 flex-grow-1 ">
                              <div className="mb-2 h-100">
                                <label
                                  htmlFor={`vendor_list_${prodItem.product_id}_${prodItem.variant}`}
                                  className="form-label small mb-1 "
                                >
                                  Vendor List
                                </label>
                                <div
                                  className="form-control overflow-y-auto"
                                  id={`vendor_list_${prodItem.product_id}_${prodItem.variant}`}
                                  style={{
                                    height: "15.3rem",
                                    maxHeight: "15.3rem",
                                  }}
                                >
                                  {vendorMap &&
                                    vendorMap.get(prodKey)?.map((vendor) => {
                                      return (
                                        <span
                                          key={vendor.user_id}
                                          className="badge fw-normal me-2 mb-2"
                                          style={{
                                            backgroundColor:
                                              "var(--secondary-color)",
                                            color: "#fff",
                                          }}
                                        >
                                          <Link
                                            href={`/vendor/vendor-profile?id=${vendor.user_id}`}
                                            target="_blank"
                                            className="text-white"
                                          >
                                            {vendor.name}
                                          </Link>
                                          <FontAwesomeIcon
                                            icon={faClose}
                                            className="ms-2"
                                            onClick={() =>
                                              removeItem(
                                                "vendor",
                                                prodItem,
                                                vendor.user_id
                                              )
                                            }
                                          />
                                        </span>
                                      );
                                    })}
                                </div>
                              </div>
                            </div>

                            <div className="d-flex justify-content-end my-2">
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                style={{
                                  padding: "0.25rem 0.5rem",
                                  width: "130px",
                                }}
                                onClick={() => removeItem("product", prodItem)}
                              >
                                <FontAwesomeIcon
                                  icon={faTrash}
                                  className="me-2"
                                />
                                Remove
                              </button>
                            </div>
                          </Accordion.Body>
                        </div>
                      </Accordion.Item>
                    );
                })
            }
        </Accordion>
    );
}

export default ReviewProducts;