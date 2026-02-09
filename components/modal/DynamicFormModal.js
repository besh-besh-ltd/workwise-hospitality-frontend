import React, { useCallback, useEffect, useState } from 'react';
import Modal from "react-modal";
import { Field, Form, Formik } from "formik";
import * as yup from "yup";
import Select, { components } from 'react-select';
import { categoryList, vendorApproveList } from "@/services/rfq";
import {
    approvedProductList,
  } from "@/services/products";
import { faClose } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { toast } from 'react-toastify';
import { getDepartments } from "@/services/rbac";
import { 
    addVendorSchema, 
    dynamicProjectSchema, 
    dynamicProjectEditSchema, 
    dynamicAccountEditSchema, 
    dynamicTeamMemberSchema 
} from '@/utils/schema';
import RoleScopeSelector from "@/components/hospitality/RoleScopeSelector";
import CommonFormInput from '@/components/shared/CommonFormInput';

// Custom styles for Product Select Component
const customStyles = {
    option: (provided, state) => ({
        ...provided,
        marginBottom: '1px solid #000',
        color: state.isSelected ? '#0d6efd' : '#212529',
        backgroundColor: state.isSelected ? '#f0f0f0' : provided.backgroundColor,
    }),
};

// Modified Select Component to show category along with Product Name
const CustomSelectOption = (props) => (
    <components.Option {...props}>
        <div>
            {props.data.label}
            <br />
            <small>{props.data.categories}</small>
        </div>
    </components.Option>
);

const DynamicFormModal = ({
  type,
  projectData,
  accountData,
  teamMemberUsers,
  currentTeamMembers,
  openModal,
  closeModal,
  handleAddVendor,
  handleCreateProject,
  handleEditProject,
  handleEditAccount,
  handleAddTeamMember,
  countryCodes,
  roleOptions,
  projectOptions,
  hospitalityProps,
  initialRoleScopes = [],
  userDepartments = []
}) => {

    const initialVendorValues = {
        vendorName: "",
        email: "",
        phone: "",
        countryCode: "+91",
        is_private: 0
    };

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Tomorrow's date

    const defaultEndDate = new Date(today);
    defaultEndDate.setDate(today.getDate() + 30); // Default to 30 days ahead

    const initialProjectValues = {
        name: projectData?.name || "",
        description: projectData?.description || "",
        location: projectData?.location || "",
        ended_at: projectData?.ended_at?.slice(0, 10) || defaultEndDate.toISOString().slice(0, 10),
        rfq_type: projectData?.rfq_type || "",
        reverse_auction: projectData?.reverse_auction ? 1 : 0,
        ...(type === "edit-project" && { status: projectData?.status !== undefined ? projectData?.status : 1 }),
        budget : projectData?.budget || 0 // Default budget to 0 if not provided
    }

    // For account edit form
    const parseMobile = (mobile) => {
        if (!mobile) return { countryCode: "+91", mobileNumber: "" };
        
        const parts = mobile.split('-');
        if (parts.length === 2) {
            return { countryCode: parts[0], mobileNumber: parts[1] };
        }
        return { countryCode: "+91", mobileNumber: mobile };
    };

    const { countryCode, mobileNumber } = accountData?.mobile
        ? parseMobile(accountData.mobile)
        : { countryCode: "+91", mobileNumber: "" };

    // Employee type options for dropdown
    const employeeTypeOptions = [
        { value: "full-time", label: "Full Time" },
        { value: "part-time", label: "Part Time" },
        { value: "freelance", label: "Freelance" },
        { value: "contracted", label: "Contracted" },
        { value: "other", label: "Other" }
    ];

    // Normalize employee_type to valid enum values
    const normalizeEmployeeType = (raw) => {
        if (!raw) return null;
        const value = String(raw).trim().toLowerCase();
        if (value === "full time" || value === "full-time") return "full-time";
        if (value === "part time" || value === "part-time") return "part-time";
        if (value === "freelance") return "freelance";
        if (value === "contract" || value === "contracted") return "contracted";
        if (value === "other") return "other";
        // Map any other values (like "Permanent") to "other"
        return "other";
    };

    // Get employee type option object from string value
    const getEmployeeTypeOption = (raw) => {
        const normalizedValue = normalizeEmployeeType(raw);
        if (!normalizedValue) return null;
        return employeeTypeOptions.find(opt => opt.value === normalizedValue) || null;
    };

    let statusValue;
    const statusIsActive = 
        accountData?.status === "active";
        
    if (statusIsActive) {
        statusValue = { value: "active", label: "Active" };
    } else {
        statusValue = { value: "inactive", label: "Inactive" };
    }
    
    // Convert userDepartments to select format for initial values
    const initialDepartmentValues = Array.isArray(userDepartments) && userDepartments.length > 0
        ? userDepartments.map(dept => ({
            value: dept.id,
            label: dept.title
        }))
        : [];

    const initialAccountValues = {
        id: accountData?.id || "",
        name: accountData?.name || "",
        email: accountData?.email || "",
        mobile: mobileNumber || "",
        countryCode: countryCode || "+91",
        role: accountData?.role ? roleOptions?.find(r => r.value === accountData.role) : null,
        status: statusValue,
        employee_type: getEmployeeTypeOption(accountData?.employee_type),
        employee_code: accountData?.employee_code || "",
        payroll_company_id: accountData?.payroll_company_id || null,
        department_id: initialDepartmentValues
    };

    const initialTeamMemberValues = {
        user: null
    };

    const [vendorApprovedList, setVendorApprovedList] = useState([]);
    const [vendorProductsList, setVendorProductsList] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productLoading, setProductLoading] = useState(false);
    const [selectedApprovedBy, setSelectedApprovedBy] = useState([]);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [vendorProductDetails, setProductDetails] = useState([]);
    const [roleScopes, setRoleScopes] = useState(initialRoleScopes || []);
    const [departments, setDepartments] = useState([]);

    // Function to fetch vendor approved-by list
    const getVendorApproveList = () => {
        vendorApproveList().then((res) => {
          let lists = res.data.map((s) => ({
            label: s.vendor_approve,
            value: s.id,
          }));
          setVendorApprovedList(lists);
        })
          .catch((error) => {
            console.log(error)
          });
      };

     // Function to format product data along with it's categories
     const formatGroupedData = (groupedData) => {
        return Object.values(groupedData).flatMap(items =>
            items.map(item => ({
                value: item.id,
                label: item.unified_name,
                categories: item.product_categories.map(cat => cat.category_name).join(" | ")
            }))
        );
    }

    const groupBySlug = (data) => {
        const groupedData = data.reduce((acc, item) => {
            const slug = item.slug;
            if (!acc[slug]) acc[slug] = [];

            const isUnique = !acc[slug].some((existingItem) =>
                JSON.stringify(existingItem.product_categories) === JSON.stringify(item.product_categories)
            );
            if (isUnique) acc[slug].push(item);
            return acc;
        }, {});
        return formatGroupedData(groupedData);
    }

     // Search Product Function
  const getVendorProductList = useCallback((search_key) => {
    if(search_key && search_key.length > 2){
        setProductLoading(true);
        approvedProductList(20, 1, search_key)
        .then((res) => {
            if (res && res.data && Array.isArray(res.data)) {
                const product_options = groupBySlug(res.data);
                setVendorProductsList(product_options);
            } else {
                console.error("Invalid product data format:", res);
                setVendorProductsList([]);
            }
          })
          .catch((error) => {
            console.error("Error fetching products:", error);
            setVendorProductsList([]);
          })
          .finally(() => setProductLoading(false));
    } else {
        // Clear product list if search string is too short
        setVendorProductsList([]);
    }
  }, []);


    // Debouncing the search product API call for 300ms
    const debounceGetVendorProductList = useCallback(
        (inputValue) => {
            if (inputValue && inputValue.length > 2) {
                const debounceTimeout = 300; // Reduced timeout for better responsiveness
                clearTimeout(window.debounceTimer);
                window.debounceTimer = setTimeout(() => {
                    getVendorProductList(inputValue);
                }, debounceTimeout);
            }
        },
        [getVendorProductList]
    );

    const getProductDetails = (selectedOption, id) => {
        if (!id) return;

        // Show loading state
        setProductLoading(true);

        // Create a minimal product object from the selected option
        const minimalProduct = {
            master_id: id,
            name: selectedOption.label || 'Unknown Product',
            description: selectedOption.categories || '',
            status: 1,
            approved_id: [],
            approved_name: [],
            categories: []
        };

        // Set the product data directly from the selection
        setCurrentProduct(minimalProduct);
        setSelectedProduct(selectedOption);
        setSelectedApprovedBy([]);
        setProductLoading(false);
    };


        // Function to add approved-by in FormData
        const handleSelectChange = (selectedOption) => {
            // This function now only handles the approvedBy selection
            // Product selection is handled directly in the onChange handler
            if (!currentProduct) {
                toast.error("Please Choose a Product First.", {position: "top-right"})
            } else {
                let approved_ids = [];
                let approved_names = [];
                selectedOption.map((option) => {
                    approved_ids.push(option.value)
                    approved_names.push(option.label)
                })

                setSelectedApprovedBy(selectedOption);
                setCurrentProduct((prevState) => ({
                    ...prevState,
                    approved_id: approved_ids,
                    approved_name: approved_names
                }))
            }
        }

        const handleSingleProductAdd = () => {
            // Check if the product already exists in productDetails
            const isDuplicate = vendorProductDetails.some(
                (product) => product.master_id === currentProduct?.master_id
            );

            if (isDuplicate) {
                toast.error("This product is already added.", { position: "top-right" });
                return; // Exit the function to prevent adding duplicate products
            }

            // Add the product if it does not already exist
            setProductDetails((prevState) => [
                ...prevState,
                currentProduct
            ]);
            setCurrentProduct(null);
            setSelectedProduct(null);
            setSelectedApprovedBy([]);
        };

        useEffect(() => {
            getVendorApproveList();
            // getVendorProductList();
        }, [])

        // Fetch departments when editing account
        useEffect(() => {
            if (type === "edit-account" && openModal) {
                getDepartments()
                    .then((res) => {
                        const depts = (res?.data?.data || res?.data || []).map((d) => ({
                            value: d.id,
                            label: d.title
                        }));
                        setDepartments(depts);
                    })
                    .catch((error) => {
                        console.error("Error fetching departments:", error);
                        setDepartments([]);
                    });
            }
        }, [type, openModal]);

        const processVendorCreate = (values, resetForm) => {
            const fullMobile = `${values.countryCode || '+91'}-${values.phone.trim().replace(/^0+/, '')}`;

            const requestData = {
                vendorName: values.vendorName, // this is org name not vendor spoc name
                email: values.email,
                phone: fullMobile,
                is_private: values.is_private,
                productDetails: vendorProductDetails
            };

            if(currentProduct){
                toast.error("Please Add/Remove The Selected Product First!", { position: "top-right" });
                return;
            }

            handleAddVendor(requestData, vendorProductDetails, resetForm);
            closeModal();
        }
        // Handle account edit form submission
        useEffect(() => {
          if (type === "edit-account") {
            setRoleScopes(initialRoleScopes || []);
          }
        }, [initialRoleScopes, type]);

        const processAccountEdit = (values, resetForm) => {
            // Format mobile with country code
            const formattedMobile = `${values.countryCode}-${values.mobile}`;
            
            // Determine status value - handle all possible formats
            let statusValue;
            if (typeof values.status === 'object' && values.status !== null) {
                statusValue = values.status.value === "active" ? 1 : 0;
            } else if (typeof values.status === 'string') {
                statusValue = values.status === "active" ? 1 : 0;
            } else {
                statusValue = 1; // Default fallback
            }
            
            // Get department IDs from form values (multi-select)
            let departmentIds = [];
            if (values.department_id && Array.isArray(values.department_id)) {
                departmentIds = values.department_id.map(dept => 
                    typeof dept === 'object' ? dept.value : dept
                );
            } else if (values.department_id && !Array.isArray(values.department_id)) {
                departmentIds = [typeof values.department_id === 'object' ? values.department_id.value : values.department_id];
            }
            
            // Also include department IDs from role scopes if any
            const roleScopeDeptIds = Array.from(
              new Set(
                (roleScopes || [])
                  .map((r) => r.department_id)
                  .filter((id) => id !== null && id !== undefined)
              )
            );
            
            // Merge both sources and remove duplicates
            departmentIds = Array.from(new Set([...departmentIds, ...roleScopeDeptIds]));

            // Filter roles to only include allowed fields (remove id and user_id)
            const filteredRoles = (roleScopes || []).map((role) => ({
                role_id: role.role_id,
                role_title: role.role_title || null,
                company_id: role.company_id || null,
                hotel_id: role.hotel_id || null,
                department_id: role.department_id || null,
                permissions: role.permissions || {}
            }));

            // Create account data object
            const accountData = {
                id: values.id,
                name: values.name,
                email: values.email,
                mobile: formattedMobile,
                status: statusValue, // Send as number directly
                roles: filteredRoles,
                department_ids: departmentIds,
                employee_type: values.employee_type?.value || null,
                employee_code: values.employee_code || null,
                payroll_company_id: values.payroll_company_id
            };
            // Call the parent function to save the data
            handleEditAccount(accountData, resetForm);
            closeModal();
        };

        const processTeamMemberAdd = (values, resetForm) => {
            const teamMemberData = {
                user_id: values.user.value,
                role: parseInt(values.user.role)
            };

            handleAddTeamMember(teamMemberData, resetForm);
            closeModal();
        };

        const removeSelectedVendor = (prodItem) => {
            setProductDetails((prevState) =>
                prevState.filter((item) => item.master_id !== prodItem.master_id)
            );
        };

        const placeholderText = `Include details like:
- The scope of work (e.g., fabrication, pipeline installation, civil construction).
- Project timelines and critical milestones.
- Any specific technical requirements or challenges.
- Location of the project or areas it covers.

Example:
'Construction of a 500-meter pipeline at XYZ site, including material procurement, welding, and testing. The project duration is 6 months, with a deadline of [specific date]. Requires adherence to ISO standards and includes three key phases: excavation, installation, and testing.'`;

        // Handle project create form submission
        const processProjectCreate = (values, resetForm) => {
            const projectData = {
                name: values.name,
                description: values.description,
                location: values.location,
                rfq_type: values.rfq_type,
                reverse_auction: Number(values.reverse_auction),
                ended_at: values.ended_at,
                budget: values.budget || 0, // Default budget to 0 if not provided
            };

            // Call the parent function to save the data
            handleCreateProject(projectData, resetForm);
            closeModal();
        };

        // Handle project edit form submission
        const processProjectEdit = (values, resetForm) => {
            const projectData = {
                name: values.name,
                description: values.description,
                location: values.location,
                rfq_type: values.rfq_type,
                reverse_auction: Number(values.reverse_auction),
                ended_at: values.ended_at,
                status: values.status !== undefined ? Number(values.status) : 1,
                budget: Number(values.budget) || 0, // Default budget to 0 if not provided
            };

            // Call the parent function to save the data
            handleEditProject(projectData, resetForm);
            closeModal();
        };

        // Filter out users who are already team members
        const availableUsers = teamMemberUsers?.filter(user => {
            // Get array of user IDs who are already team members
            const currentTeamMemberIds = currentTeamMembers?.map(member => member.user_id) || [];
            // Return only users who are not already in the team
            return !currentTeamMemberIds.includes(user.id);
        }) || [];

        const userOptions = availableUsers.map(user => ({
            value: user.id,
            label: `${user.name} (${user.email})`,
            email: user.email,
            role: user.role,
            name: user.name
        }));

        // Get role label and color
        const getRoleInfo = (roleId) => {
            const role = roleOptions?.find(r => r.value === roleId);
            return role || { label: "Unknown", color: "#000000" };
        };

    return (
      <>
        <Modal
          isOpen={openModal}
          onRequestClose={closeModal}
          ariaHideApp={false}
          contentLabel={
            type === "add-vendor" 
              ? "Add Vendor Modal" 
              : type === "create-project"
              ? "Create Project Modal"
              : type === "edit-project"
              ? "Edit Project Modal"
              : type === "edit-account"
              ? "Edit Account Modal"
              : type === "add-team-member"
              ? "Add Team Member Modal"
              : "Dynamic Form Modal"
          }
          className="login-register"
          style={{
            overlay: {
              backgroundColor: "rgba(0, 0, 0, 0.75)",
            },
            content: {
              position: "absolute",
              top: type === "edit-account" ? "0" : "50%",
              left: type === "edit-account" ? "0" : "50%",
              transform: type === "edit-account" ? "none" : "translate(-50%, -50%)",
              maxWidth: type === "edit-account" ? "100vw" : "90vw",
              width: type === "edit-account" ? "100vw" : "80vw",
              border: "none",
              background: "transparent",
              overflow: "hidden",
              padding: type === "edit-account" ? "20px" : "50px",
              maxHeight: "100vh",
              height: type === "edit-account" ? "100vh" : "90vh",
            },
          }}
        >
          <div className="modal-header">
            <button
              type="button"
              onClick={closeModal}
              className="btn-close"
              aria-label="Close"
            ></button>
          </div>

          <div
            className="modal-body contact-sec-modal"
            style={{
              maxHeight: type === "edit-account" ? "calc(100vh - 80px)" : "calc(90vh - 80px)",
              overflowY: "auto",
              paddingRight: "10px",
            }}
          >
            <div className="contact-sec-3">
              <div className="contact-sec-3-form">
                <div className="contact-form">
                  <h2 className="tab-titlex mb-4">
                    {type === "add-vendor"
                      ? "Add Single Vendor"
                      : type === "create-project"
                      ? "Create Project"
                      : type === "edit-project"
                      ? "Edit Project"
                      : type === "edit-account"
                      ? "Edit Account"
                      : type === "add-team-member"
                      ? "Add Team Member"
                      : ""}
                  </h2>
                  <Formik
                    initialValues={
                      type === "add-vendor"
                        ? initialVendorValues
                        : type === "create-project" || type === "edit-project"
                        ? initialProjectValues
                        : type === "edit-account"
                        ? initialAccountValues
                        : type === "add-team-member"
                        ? initialTeamMemberValues
                        : {}
                    }
                    validationSchema={
                      type === "add-vendor"
                        ? addVendorSchema
                        : type === "create-project"
                        ? dynamicProjectSchema
                        : type === "edit-project"
                        ? dynamicProjectEditSchema
                        : type === "edit-account"
                        ? dynamicAccountEditSchema
                        : type === "add-team-member"
                        ? dynamicTeamMemberSchema
                        : {}
                    }
                    enableReinitialize={true}
                    onSubmit={(values, { resetForm }) => {
                      type === "add-vendor"
                        ? processVendorCreate(values, resetForm)
                        : type === "create-project"
                        ? processProjectCreate(values, resetForm)
                        : type === "edit-project"
                        ? processProjectEdit(values, resetForm)
                        : type === "edit-account"
                        ? processAccountEdit(values, resetForm)
                        : type === "add-team-member"
                        ? processTeamMemberAdd(values, resetForm)
                        : null;
                    }}
                  >
                    {({ errors, isValid, touched, setFieldValue, values }) => {
                      // Check if right column should be shown for edit-account type
                      const showRightColumn = type === "edit-account" ? !(values.role?.value === 7) : true;
                      const leftColumnClass = type === "edit-account" && !showRightColumn ? "col-12" : "col-md-6";
                      const rightColumnClass = showRightColumn ? "col-md-6" : "d-none";
                      const showHospitalitySection = type === "edit-account" && Boolean(hospitalityProps);
                      const hospitalityFormState = hospitalityProps?.formState || {};
                      
                      return (
                        <Form className="row add-vendor-modal-form">
                          <div className={leftColumnClass}>
                            {type === "add-vendor" ? (
                              <>
                                {/* add vendor section */}
                                <div className="form-group">
                                  <label htmlFor="vendorName">
                                    Vendor's Name <sup>*</sup>
                                  </label>
                                  <Field
                                    type="text"
                                    id="vendorName"
                                    name="vendorName"
                                    placeholder="Demo Manufactuters Pvt. Ltd."
                                  />
                                  {touched.vendorName && errors.vendorName && (
                                    <div className="form-error">
                                      {errors.vendorName}
                                    </div>
                                  )}
                                </div>
                                <div className="form-group">
                                  <label htmlFor="email">
                                    Vendor's Email <sup>*</sup>
                                  </label>
                                  <Field
                                    type="email"
                                    id="email"
                                    name="email"
                                    placeholder="example@letsworkwise.com"
                                  />
                                  {touched.email && errors.email && (
                                    <div className="form-error">
                                      {errors.email}
                                    </div>
                                  )}
                                </div>
                                <div className="form-group">
                                  <label htmlFor="phone">
                                    Phone No <sup>*</sup>
                                  </label>

                                  {/* Flexbox container for country code dropdown and phone input */}
                                  <div className="d-flex align-items-center gap-2 position-relative">
                                    {/* Country Code Dropdown */}
                                    <Field name="countryCode">
                                      {({ field, form }) => (
                                        <select
                                          {...field}
                                          className="form-select border border-success"
                                          style={{
                                            width: "30%",
                                            height: "54px",
                                          }}
                                          defaultValue={{
                                            key: "+91",
                                            value: "+91",
                                          }}
                                          onChange={(e) =>
                                            form.setFieldValue(
                                              "countryCode",
                                              e.target.value
                                            )
                                          }
                                        >
                                          {countryCodes.map((country) => (
                                            <option
                                              key={country.phone_code}
                                              value={country.phone_code}
                                            >
                                              {country.country_code} (
                                              {country.phone_code})
                                            </option>
                                          ))}
                                        </select>
                                      )}
                                    </Field>

                                    {/* Phone Number Input */}
                                    <Field
                                      type="text"
                                      id="phone"
                                      name="phone"
                                      className={`form-control border border-success ${
                                        touched.phone && errors.phone
                                          ? "is-invalid"
                                          : ""
                                      }`}
                                      placeholder="Ex. 9123456789"
                                      style={{ flex: "1", height: "54px" }}
                                    />
                                  </div>

                                  {/* Validation Error Message BELOW both fields */}
                                  {touched.phone && errors.phone && (
                                    <div className="invalid-feedback d-block mt-1">
                                      {errors.phone}
                                    </div>
                                  )}
                                </div>

                                <div className="form-group">
                                  <label htmlFor="is_private">
                                    Vendor Type: <sup>*</sup>
                                  </label>
                                  <Field
                                    as="select"
                                    name="is_private"
                                    className={`form-control ${
                                      touched.is_private && errors.is_private
                                        ? "is-invalid"
                                        : ""
                                    }`}
                                    onChange={(e) => {
                                      // Cast the value to a number and manually set the field value
                                      setFieldValue(
                                        "is_private",
                                        Number(e.target.value)
                                      );
                                    }}
                                  >
                                    <option value={0}>Public</option>
                                    <option value={1}>Private</option>
                                  </Field>
                                  {touched.is_private && errors.is_private && (
                                    <div className="form-error">
                                      {errors.is_private}
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : type === "edit-account" ? (
                              <>
                                {/* Account Edit Form Fields (Left Column) */}
                                <CommonFormInput
                                  name="name"
                                  label="Name"
                                  type="text"
                                  placeholder="John Doe"
                                  touched={touched}
                                  errors={errors}
                                  values={values.name}
                                  onChange={setFieldValue}
                                  required={true}
                                />

                                <CommonFormInput
                                  name="email"
                                  label="Email"
                                  type="email"
                                  placeholder="john@example.com"
                                  touched={touched}
                                  errors={errors}
                                  values={values.email}
                                  onChange={setFieldValue}
                                  required={true}
                                />

                                <CommonFormInput
                                  name="mobile"
                                  label="Mobile"
                                  type="mobile"
                                  touched={touched}
                                  errors={errors}
                                  values={values.mobile}
                                  onChange={setFieldValue}
                                  required={true}
                                />


                                {showHospitalitySection && (
                                  <>
                                    <CommonFormInput
                                      name="employee_type"
                                      label="Employee Type"
                                      type="select"
                                      options={employeeTypeOptions}
                                      touched={touched}
                                      errors={errors}
                                      values={values.employee_type}
                                      required={true}
                                    />
                                    <CommonFormInput
                                      name="employee_code"
                                      label="Employee Code"
                                      touched={touched}
                                      errors={errors}
                                      values={values.employee_code}
                                      onChange={setFieldValue}
                                      required={false}
                                    />
                                  </>
                                )}
                                
                                <CommonFormInput
                                  name="department_id"
                                  label="Department"
                                  type="select"
                                  isMulti={true}
                                  options={departments}
                                  touched={touched}
                                  errors={errors}
                                  values={values.department_id}
                                  onChange={setFieldValue}
                                  required={false}
                                />
                              </>
                            ) : type === "add-team-member" ? (
                              <>
                                <div className="form-group">
                                  <label htmlFor="user" className="form-label">
                                    Select User{" "}
                                    <span className="text-danger">*</span>
                                  </label>
                                  <Field name="user">
                                    {({ field, form }) => (
                                      <Select
                                        options={userOptions}
                                        value={field.value}
                                        onChange={(option) =>
                                          form.setFieldValue("user", option)
                                        }
                                        className={`${
                                          touched.user && errors.user
                                            ? "is-invalid"
                                            : ""
                                        }`}
                                        placeholder="Select a user"
                                        styles={{
                                          menuPortal: (base) => ({
                                            ...base,
                                            zIndex: 9999,
                                          }),
                                          menu: (base) => ({
                                            ...base,
                                            maxHeight: "200px",
                                          }),
                                          menuList: (base) => ({
                                            ...base,
                                            maxHeight: "200px",
                                          }),
                                        }}
                                        menuPortalTarget={document.body}
                                        menuPosition={"fixed"}
                                      />
                                    )}
                                  </Field>
                                  {touched.user && errors.user && (
                                    <div className="form-error">
                                      {errors.user}
                                    </div>
                                  )}
                                </div>

                                {values.user && (
                                  <div className="form-group">
                                    <div className="card bg-light">
                                      <div className="card-body">
                                        <h5 className="card-title">
                                          User Details
                                        </h5>
                                        <div className="d-flex justify-content-between mb-2">
                                          <span>Name:</span>
                                          <strong>{values.user.name}</strong>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                          <span>Email:</span>
                                          <strong>{values.user.email}</strong>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                          <span>Role:</span>
                                          <span
                                            className="badge"
                                            style={{
                                              backgroundColor: getRoleInfo(
                                                values.user.role
                                              ).color,
                                              color:
                                                getRoleInfo(values.user.role)
                                                  .color === "#FFE600"
                                                  ? "#000"
                                                  : "#fff",
                                              padding: "6px 10px",
                                            }}
                                          >
                                            {
                                              getRoleInfo(values.user.role)
                                                .label
                                            }
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                {/* project fields section */}
                                <div className="form-group">
                                  <label htmlFor="name">
                                    Project Name <sup>*</sup>
                                  </label>
                                  <Field
                                    type="text"
                                    id="name"
                                    name="name"
                                    placeholder="Demo Project Name"
                                  />
                                  {touched.name && errors.name && (
                                    <div className="form-error">
                                      {errors.name}
                                    </div>
                                  )}
                                </div>
                                <div className="form-group">
                                  <label htmlFor="location">Location</label>
                                  <Field
                                    type="text"
                                    id="location"
                                    name="location"
                                    placeholder="JBR Tech Park, Bengaluru, karnataka"
                                  />
                                  {touched.location && errors.location && (
                                    <div className="form-error">
                                      {errors.location}
                                    </div>
                                  )}
                                </div>
                                <div className="form-group">
                                  <label htmlFor="ended_at">
                                    Project End Date
                                  </label>
                                  <Field
                                    type="date"
                                    id="ended_at"
                                    name="ended_at"
                                    min={tomorrow.toISOString().slice(0, 10)}
                                  />
                                  {touched.ended_at && errors.ended_at && (
                                    <div className="form-error">
                                      {errors.ended_at}
                                    </div>
                                  )}
                                </div>

                                <div className="form-group">
                                  <label htmlFor="rfq_type">
                                    Project Stage
                                  </label>
                                  <Field
                                    as="select"
                                    id="rfq_type"
                                    name="rfq_type"
                                    className={`form-control ${
                                      touched.rfq_type && errors.rfq_type
                                        ? "is-invalid"
                                        : ""
                                    }`}
                                  >
                                    <option value="">
                                      Select Project Stage
                                    </option>
                                    <option value="budgetary">Budgetary</option>
                                    <option value="firm">Firm</option>
                                  </Field>
                                  {touched.rfq_type && errors.rfq_type && (
                                    <div className="form-error">
                                      {errors.rfq_type}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          <div className={rightColumnClass}>
                            {type === "add-vendor" ? (
                              // Here we have to add product dropdown
                              <div className="form-group">
                                <div className="col-md-10 mb-2">
                                  <div className="mb-2">
                                    <label>Search Product</label>
                                    <Select
                                      name="product"
                                      options={vendorProductsList}
                                      value={selectedProduct}
                                      components={{
                                        Option: CustomSelectOption,
                                      }}
                                      styles={customStyles}
                                      isLoading={productLoading}
                                      onInputChange={
                                        debounceGetVendorProductList
                                      }
                                      onChange={(selectedOption) => {
                                        if (selectedOption) {
                                          const prodId = selectedOption.value;
                                          if (prodId) {
                                            getProductDetails(
                                              selectedOption,
                                              prodId
                                            );
                                          }
                                        } else {
                                          // Handle clearing of selection
                                          setSelectedProduct(null);
                                          setCurrentProduct(null);
                                        }
                                      }}
                                      placeholder={
                                        vendorProductsList.length === 0
                                          ? "Please write at least 3 characters..."
                                          : "Search or select an option..."
                                      }
                                      isSearchable
                                      isClearable
                                    />
                                  </div>
                                  <div className="mb-2">
                                    <label>Approved By</label>
                                    <Select
                                      isDisabled={!selectedProduct}
                                      name="approvedBy"
                                      options={vendorApprovedList}
                                      value={selectedApprovedBy}
                                      placeholder="Select Approved By"
                                      onChange={handleSelectChange}
                                      isMulti
                                    />
                                  </div>
                                  {currentProduct && (
                                    <div className="d-flex flex-wrap">
                                      {" "}
                                      <span className="badge bg-danger p-2 me-2 d-flex align-items-center gap-2">
                                        {currentProduct.name}
                                        <FontAwesomeIcon
                                          icon={faClose}
                                          onClick={() =>
                                            setCurrentProduct(null)
                                          }
                                          fontSize={14}
                                        />
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm ms-auto"
                                        onClick={handleSingleProductAdd}
                                      >
                                        Add Product
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {vendorProductDetails.length > 0 && (
                                  <div className="col-12">
                                    <label>Added Products</label>
                                    <div className="d-flex flex-wrap">
                                      {vendorProductDetails.map((prodItem) => (
                                        <div
                                          key={prodItem.master_id}
                                          className="badge bg-success p-2 me-2 d-flex align-items-center gap-2"
                                        >
                                          {prodItem.name}
                                          <FontAwesomeIcon
                                            icon={faClose}
                                            onClick={() =>
                                              removeSelectedVendor(prodItem)
                                            }
                                            fontSize={14}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {touched.vendorProductDetails &&
                                  errors.vendorProductDetails && (
                                    <div className="form-error">
                                      {errors.vendorProductDetails}
                                    </div>
                                  )}
                              </div>
                            ) : type === "edit-account" && showRightColumn ? (
                              // Account Edit Form Fields (Right Column)
                              <>
                                {/* Only show Status field for non-admin roles */}
                                {!(values.role?.value === 7) && (
                                  <CommonFormInput
                                    name="status"
                                    label="Status"
                                    type="select"
                                    options={[
                                      { value: "active", label: "Active" },
                                      { value: "inactive", label: "Inactive" },
                                    ]}
                                    touched={touched}
                                    errors={errors}
                                    values={values.status}
                                    onChange={setFieldValue}
                                    required={true}
                                  />
                                )}
                                {showHospitalitySection && (
                                  <div className="mt-4">
                                    <div className="card border-0 shadow-sm">
                                      <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                          <h5 className="mb-0">Company & Hotel Access</h5>
                                          <span className="text-muted small">
                                            Manage company/hotel scope for this user
                                          </span>
                                        </div>
                                        {(hospitalityProps.mappings || []).length === 0 ? (
                                          <p className="text-muted mb-3">
                                            This user is not mapped to any hospitality scope yet.
                                          </p>
                                        ) : (
                                          (() => {
                                            // Group mappings by company
                                            const groupedByCompany = {};
                                            hospitalityProps.mappings.forEach((mapping) => {
                                              const companyId = mapping.hospitality_company_id;
                                              const companyName = mapping.company_name || "Unknown Company";
                                              
                                              if (!groupedByCompany[companyId]) {
                                                groupedByCompany[companyId] = {
                                                  companyName,
                                                  companyMappings: [],
                                                  hotelMappings: []
                                                };
                                              }
                                              
                                              if (mapping.mapping_type === 0) {
                                                groupedByCompany[companyId].companyMappings.push(mapping);
                                              } else {
                                                groupedByCompany[companyId].hotelMappings.push(mapping);
                                              }
                                            });
                                            
                                            return (
                                              <div className="table-responsive mb-3">
                                                <table className="table table-striped align-middle">
                                                  <thead>
                                                    <tr>
                                                      <th>Company</th>
                                                      <th>Scope</th>
                                                      <th>Hotel / Company Level</th>
                                                      <th>Auto Map Projects</th>
                                                      <th className="text-end">Action</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {Object.entries(groupedByCompany).map(([companyId, group]) => (
                                                      <React.Fragment key={companyId}>
                                                        {/* Company-level mapping row */}
                                                        {group.companyMappings.length > 0 && (
                                                          <tr>
                                                            <td rowSpan={group.hotelMappings.length > 0 ? group.hotelMappings.length + 1 : 1}>
                                                              <strong>{group.companyName}</strong>
                                                              <br />
                                                              <small className="text-muted">
                                                                {group.hotelMappings.length} hotel{group.hotelMappings.length !== 1 ? 's' : ''}
                                                              </small>
                                                            </td>
                                                            <td>
                                                              <span className="badge bg-primary">Company</span>
                                                            </td>
                                                            <td>
                                                              <span className="text-muted">All Hotels</span>
                                                            </td>
                                                            <td>
                                                              <span
                                                                className={`badge ${
                                                                  group.companyMappings[0].auto_map_projects
                                                                    ? "bg-success-subtle text-success"
                                                                    : "bg-light text-muted"
                                                                }`}
                                                              >
                                                                {group.companyMappings[0].auto_map_projects ? "Yes" : "No"}
                                                              </span>
                                                            </td>
                                                            <td className="text-end">
                                                              <button
                                                                type="button"
                                                                className="btn btn-outline-danger btn-sm"
                                                                onClick={() =>
                                                                  hospitalityProps.onRemoveMapping(group.companyMappings[0])
                                                                }
                                                              >
                                                                Remove
                                                              </button>
                                                            </td>
                                                          </tr>
                                                        )}
                                                        {/* Hotel-level mapping rows */}
                                                        {group.hotelMappings.map((mapping, idx) => (
                                                          <tr key={`hotel-mapping-${mapping.id}`}>
                                                            {idx === 0 && group.companyMappings.length === 0 && (
                                                              <td rowSpan={group.hotelMappings.length}>
                                                                <strong>{group.companyName}</strong>
                                                                <br />
                                                                <small className="text-muted">
                                                                  {group.hotelMappings.length} hotel{group.hotelMappings.length !== 1 ? 's' : ''}
                                                                </small>
                                                              </td>
                                                            )}
                                                            <td>
                                                              <span className="badge bg-success">Hotel</span>
                                                            </td>
                                                            <td>
                                                              {mapping.hotel_name || "N/A"}
                                                            </td>
                                                            <td>
                                                              <span
                                                                className={`badge ${
                                                                  mapping.auto_map_projects
                                                                    ? "bg-success-subtle text-success"
                                                                    : "bg-light text-muted"
                                                                }`}
                                                              >
                                                                {mapping.auto_map_projects ? "Yes" : "No"}
                                                              </span>
                                                            </td>
                                                            <td className="text-end">
                                                              <button
                                                                type="button"
                                                                className="btn btn-outline-danger btn-sm"
                                                                onClick={() =>
                                                                  hospitalityProps.onRemoveMapping(mapping)
                                                                }
                                                              >
                                                                Remove
                                                              </button>
                                                            </td>
                                                          </tr>
                                                        ))}
                                                      </React.Fragment>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            );
                                          })()
                                        )}

                                        {hospitalityProps.companies?.length ? (
                                          <div className="row g-3">
                                            <div className="col-12">
                                              <label className="form-label">
                                                Hospitality Company
                                              </label>
                                              <select
                                                className="form-select"
                                                value={hospitalityFormState.selectedCompanyId}
                                                onChange={(e) =>
                                                  hospitalityProps.onCompanyChange(e.target.value)
                                                }
                                              >
                                                <option value="" disabled>
                                                  Select Company
                                                </option>
                                                {hospitalityProps.companies.map((company) => (
                                                  <option key={company.id} value={company.id}>
                                                    {company.name}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>
                                            <div className="col-12">
                                              <label className="form-label">Mapping Level</label>
                                              <select
                                                className="form-select"
                                                value={hospitalityFormState.mappingLevel}
                                                onChange={(e) =>
                                                  hospitalityProps.onMappingLevelChange(
                                                    e.target.value
                                                  )
                                                }
                                              >
                                                <option value="company">Company</option>
                                                <option value="hotel">Specific Hotel</option>
                                              </select>
                                            </div>
                                            {hospitalityFormState.mappingLevel === "hotel" && (
                                              <div className="col-12">
                                                <label className="form-label">Hotel</label>
                                                <select
                                                  className="form-select"
                                                  value={hospitalityFormState.hotelId}
                                                  onChange={(e) =>
                                                    hospitalityProps.onHotelChange(e.target.value)
                                                  }
                                                >
                                                  <option value="">Select Hotel</option>
                                                  {hospitalityProps.hotels?.map((hotel) => (
                                                    <option key={hotel.id} value={hotel.id}>
                                                      {hotel.name}
                                                    </option>
                                                  ))}
                                                  {(!hospitalityProps.hotels ||
                                                    hospitalityProps.hotels.length === 0) && (
                                                    <option value="" disabled>
                                                      No hotels for this company
                                                    </option>
                                                  )}
                                                </select>
                                              </div>
                                            )}
                                            <div className="col-12">
                                              <div className="form-check form-switch">
                                                <input
                                                  className="form-check-input"
                                                  type="checkbox"
                                                  id="autoMapProjectsSwitch"
                                                  checked={Boolean(
                                                    hospitalityFormState.autoMapProjects
                                                  )}
                                                  onChange={(e) =>
                                                    hospitalityProps.onToggleAutoMap(
                                                      e.target.checked
                                                    )
                                                  }
                                                />
                                                <label
                                                  className="form-check-label"
                                                  htmlFor="autoMapProjectsSwitch"
                                                >
                                                  Auto add to active mapped projects
                                                </label>
                                                <small className="text-muted d-block mt-1">
                                                  When enabled, this user will automatically be added to all active projects associated with the selected company/hotel scope
                                                </small>
                                              </div>
                                            </div>
                                            <div className="col-12">
                                              <button
                                                type="button"
                                                className="btn btn-primary w-100"
                                                disabled={hospitalityFormState.submitting}
                                                onClick={hospitalityProps.onSubmit}
                                              >
                                                {hospitalityFormState.submitting
                                                  ? "Mapping..."
                                                  : "Map User"}
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-muted mb-0">
                                            Create a hospitality company to start mapping users.
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                              </>
                            ) : type === "add-team-member" ? (
                              // Empty right column for team member modal
                              <div></div>
                            ) : (
                              <>
                                <div className="form-group">
                                  <label htmlFor="reverse_auction">
                                    Reverse Auction <sup>*</sup>
                                  </label>
                                  <Field
                                    as="select"
                                    id="reverse_auction"
                                    name="reverse_auction"
                                    className={`form-control ${
                                      touched.reverse_auction &&
                                      errors.reverse_auction
                                        ? "is-invalid"
                                        : ""
                                    }`}
                                  >
                                    <option value="1">Enable</option>
                                    <option value="0">Disable</option>
                                  </Field>
                                  {touched.reverse_auction &&
                                    errors.reverse_auction && (
                                      <div className="form-error">
                                        {errors.reverse_auction}
                                      </div>
                                    )}
                                </div>
                                <div className="form-group">
                                  <label htmlFor="budget">Budget</label>
                                  <Field
                                    type="text"
                                    id="budget"
                                    name="budget"
                                    placeholder="Enter Budget In INR"
                                    className="form-control"
                                    value={values.budget || ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Allow only integers (no decimals or leading zeros except for 0 alone)
                                      if (/^(0|[1-9]\d*)?$/.test(value)) {
                                        setFieldValue("budget", value);
                                      }
                                    }}
                                  />
                                  {touched.budget && errors.budget && (
                                    <div className="form-error">
                                      {errors.budget}
                                    </div>
                                  )}
                                </div>

                                <div className="form-group">
                                  <label htmlFor="description">
                                    Project Description
                                  </label>
                                  <Field
                                    component="textarea"
                                    id="description"
                                    name="description"
                                    placeholder={placeholderText}
                                    style={{
                                      resize: "vertical", // Only allow vertical resize
                                      minHeight: "40px",
                                      maxHeight: "154px",
                                    }}
                                  />
                                  {touched.description &&
                                    errors.description && (
                                      <div className="form-error">
                                        {errors.description}
                                      </div>
                                    )}
                                </div>
                              </>
                            )}
                          </div>
                          {type === "edit-account" && showHospitalitySection && (
                            <div className="col-12 mt-5">
                              <div className="card border-0 shadow-sm">
                                <div className="card-body">
                                  <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0">Workflow Roles & Permissions</h5>
                                    <span className="text-muted small">
                                      Assign roles with company / hotel scope and permissions
                                    </span>
                                  </div>
                                  <RoleScopeSelector
                                    onAddRole={(scope) =>
                                      setRoleScopes((prev) => [...prev, scope])
                                    }
                                    existingRoles={roleScopes}
                                    onRemoveRole={(index) =>
                                      setRoleScopes((prev) => prev.filter((_, i) => i !== index))
                                    }
                                    isEditMode={true}
                                    userDepartments={userDepartments}
                                    userId={accountData?.id}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="d-flex justify-content-end">
                            <button
                              disabled={!isValid}
                              class="btn btn-success btn-sm"
                              id={type === "edit-project" ? "update_project-edit_project_modal-project_details_page" : type === "add-vendor" ? "add_vendor-add_vendor_modal-vendor_management_page" : "submit_form-dynamic_form_modal"}
                            >
                              {type === "add-vendor"
                                ? "Add Vendor"
                                : type === "create-project"
                                ? "Create Project"
                                : type === "edit-project"
                                ? "Update Project"
                                : type === "edit-account"
                                ? "Update Account"
                                : type === "add-team-member"
                                ? "Add to Team"
                                : "Submit"}
                            </button>
                          </div>
                        </Form>
                      );
                    }}
                  </Formik>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </>
    );
}

export default DynamicFormModal
