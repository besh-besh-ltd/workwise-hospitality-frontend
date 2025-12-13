// components/shared/LocationModal.js
import React, { useState, useEffect } from "react";
import { Formik, Form } from "formik";
import CommonFormInput from "@/components/shared/CommonFormInput";
import { getStates, getCities } from "@/services/cms";

const LocationModal = ({ 
  show, 
  onClose, 
  onSave, 
  initialData, 
  countries,
  isEditing = false 
}) => {
  const [locationOptions, setLocationOptions] = useState({
    states: [],
    cities: []
  });
  const [loading, setLoading] = useState(false);

  const initialValues = {
    id: initialData?.id || null,
    street_address: initialData?.street_address || initialData?.address || "", // Added fallback to address
    postal_code: initialData?.postal_code || "",
    country: initialData?.country || null,
    state: initialData?.state || null,
    city: initialData?.city || null,
  };

  // Fetch states when country is selected
  const fetchStates = async (countryId) => {
    if (!countryId) return;
    try {
      const res = await getStates(countryId);
      setLocationOptions(prev => ({
        ...prev,
        states: res.data || [],
        cities: [] // Reset cities when country changes
      }));
    } catch (error) {
      console.error("Error fetching states:", error);
      setLocationOptions(prev => ({ ...prev, states: [] }));
    }
  };

  // Fetch cities when state is selected
  const fetchCities = async (stateId) => {
    if (!stateId) return;
    try {
      const res = await getCities(stateId);
      setLocationOptions(prev => ({
        ...prev,
        cities: res.data || []
      }));
    } catch (error) {
      console.error("Error fetching cities:", error);
      setLocationOptions(prev => ({ ...prev, cities: [] }));
    }
  };

  // Initialize location data when modal opens with existing data
  useEffect(() => {
    if (show && initialData?.country?.value) {
      fetchStates(initialData.country.value);
    }
    if (show && initialData?.state?.value) {
      fetchCities(initialData.state.value);
    }
  }, [show, initialData]);

  const handleCountryChange = async (option, setFieldValue) => {
    setFieldValue("country", option);
    setFieldValue("state", null);
    setFieldValue("city", null);
    setLocationOptions(prev => ({ ...prev, states: [], cities: [] }));
    
    if (option?.value) {
      await fetchStates(option.value);
    }
  };

  const handleStateChange = async (option, setFieldValue) => {
    setFieldValue("state", option);
    setFieldValue("city", null);
    setLocationOptions(prev => ({ ...prev, cities: [] }));
    
    if (option?.value) {
      await fetchCities(option.value);
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    setLoading(true);
    try {
      console.log("Form values before save:", values);
      await onSave(values);
      onClose();
    } catch (error) {
      console.error("Error saving location:", error);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {isEditing ? "Edit Location" : "Add New Location"}
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>
          <div className="modal-body">
            <Formik
              initialValues={initialValues}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ values, errors, touched, setFieldValue, handleChange, handleBlur, isSubmitting }) => (
                <Form>
                  <div className="row">
                    <div className="col-12 mb-3">
                      <label htmlFor="street_address" className="form-label">
                        Street Address <span className="text-danger">*</span>
                      </label>
                      <textarea
                        id="street_address"
                        name="street_address"
                        className={`form-control ${touched.street_address && errors.street_address ? 'is-invalid' : ''}`}
                        value={values.street_address}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. 271 Business Park, Western Express Highway"
                        rows="3"
                        required
                      />
                      {touched.street_address && errors.street_address && (
                        <div className="invalid-feedback">{errors.street_address}</div>
                      )}
                    </div>
                    
                    <div className="col-md-6 mb-3">
                      <CommonFormInput
                        name="postal_code"
                        label="Postal Code"
                        touched={touched}
                        errors={errors}
                        required
                        placeholder="e.g. 110001"
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <CommonFormInput
                        name="country"
                        label="Country"
                        type="select"
                        isClearable={false}
                        isMulti={false}
                        options={countries.map(c => ({
                          label: c.country_name,
                          value: c.id,
                        }))}
                        values={values.country}
                        onChange={(option) => handleCountryChange(option, setFieldValue)}
                        required
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <CommonFormInput
                        name="state"
                        label="State"
                        type="select"
                        isClearable={false}
                        isMulti={false}
                        options={locationOptions.states.map(s => ({
                          label: s.state_name,
                          value: s.id,
                        }))}
                        values={values.state}
                        onChange={(option) => handleStateChange(option, setFieldValue)}
                        required
                        disabled={!values.country}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <CommonFormInput
                        name="city"
                        label="City"
                        type="select"
                        isClearable={false}
                        isMulti={false}
                        options={locationOptions.cities.map(c => ({
                          label: c.city_name,
                          value: c.id,
                        }))}
                        values={values.city}
                        onChange={(option) => setFieldValue("city", option)}
                        required
                        disabled={!values.state}
                      />
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={onClose}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading || isSubmitting}
                    >
                      {loading ? "Saving..." : "Save Location"}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationModal;