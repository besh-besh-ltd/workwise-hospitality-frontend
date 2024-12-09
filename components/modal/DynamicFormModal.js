import React, { useCallback, useEffect, useState } from 'react';
import Modal from "react-modal";
import { Field, Form, Formik } from "formik";
import * as yup from "yup";
import Select, { components } from 'react-select';
import { categoryList, vendorApproveList } from "@/services/rfq";
import {
    addProducts,
    approvedProductList,
    productDetails,
  } from "@/services/products";
import { faClose } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { toast, ToastContainer } from 'react-toastify';

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
    openModal,
    closeModal,
    handleAddVendor,
    handleCreateProject,
    handleEditProject
}) => {

    const initialVendorValues = {
        vendorName: "",
        email: "",
        phone: "",
        is_private: 0
    };

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Tomorrow's date

    const defaultEndDate = new Date(today);
    defaultEndDate.setDate(today.getDate() + 30); // Default to 30 days ahead

    const initialProjectValues = {
        projectName: projectData?.name || "",
        projectDescription: projectData?.description || "",
        location: projectData?.location || "",
        ended_at: projectData?.ended_at?.slice(0, 10) || defaultEndDate.toISOString().slice(0, 10),
        rfq_type: projectData?.rfq_type || "",
        reverse_auction: (projectData && !projectData.reverse_auction) ? 0 : 1
    }

    const [vendorApprovedList, setVendorApprovedList] = useState([]);
    const [vendorProductsList, setVendorProductsList] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productLoading, setProductLoading] = useState(false);
    const [selectedApprovedBy, setSelectedApprovedBy] = useState([]);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [vendorProductDetails, setProductDetails] = useState([]);


    const validateVendorSchema = yup.object().shape({
        vendorName: yup.string().required("Name is required")
            .min(2, "Name not less than 2 characters short")
            .max(50, "Name not more than 50 characters long"),
        email: yup.string().email()
            .matches(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                "Please enter valid email address"
            )
            .required("Email is required"),
        phone: yup.string()
            .matches(
                /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
                "please enter valid mobile number"
            )
            .min(10, "Min 10 digit is required")
            .max(12, "Mobile number not more than 11 digit long")
            .required("Mobile number is required")
    });

    const validateProjectSchema = yup.object().shape({
        projectName: yup.string().required("Project Name is required")
            .min(2, "Name not less than 2 characters short")
            .max(50, "Name not more than 50 characters long"),
        projectDescription: yup.string(),
        location: yup.string(),
        ended_at: yup.date(),
        rfq_type: yup.string()
            .oneOf(['', 'firm', 'budgetary'], 'Invalid RFQ Type')
            .nullable(),
        reverse_auction: yup.string()
            .oneOf(['0', '1', '-1'], 'Invalid Reverse Auction value')
            .required('Reverse Auction selection is required')
    });

    // for product related

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
                label: item.name,
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

    if(search_key.length > 2){
        setProductLoading(true);
        approvedProductList(20, 1, search_key)
        .then((res) => {
            const product_options = groupBySlug(res.data);
            setVendorProductsList(product_options);
          })
          .catch((error) => {
            console.log(error);
          })
          .finally(() => setProductLoading(false));
    }

  }, []);


    // Debouncing the search product API call for 300ms
    const debounceGetVendorProductList = useCallback(
        (inputValue) => {
            const debounceTimeout = 500;
            clearTimeout(window.debounceTimer);
            window.debounceTimer = setTimeout(() => {
                getVendorProductList(inputValue);
            }, debounceTimeout);
        },
        [getVendorProductList]
    );

    const getProductDetails = (selectedOption, id) => {
        if (!id) return;
        productDetails(id)
            .then((res) => {
                const prodItem = {
                    master_id: res.data.id || '',
                    name: res.data.name || '',
                    description: res.data.description,
                    status: 1,
                    approved_id: [],
                    approved_name: [],
                    categories: res.data.product_categories?.map((data) => data.id)
                }
                setCurrentProduct(prodItem);
                setSelectedProduct(selectedOption);
                setSelectedApprovedBy([]);
            })
            .catch((error) => {
                console.log(error);
            });
    };


        // Function to add product/approved-by in FormData
        const handleSelectChange = (selectedOption, { name }) => {
            if (name === "product") {
                const prodId = selectedOption?.value || null;
                if (prodId) getProductDetails(selectedOption, prodId);
            } else {
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

        const handleSubmit = (values,resetForm) => {

            if(currentProduct){
                toast.error("Please Add/Remove The Selected Product First!", { position: "top-right" });
                return;
            }

            handleAddVendor(values,vendorProductDetails,resetForm);
            closeModal();
        }

        const removeSelectedVendor = (prodItem) => {
            setProductDetails((prevState) =>
                prevState.filter((item) => item.master_id !== prodItem.master_id)
            );
        };

    return (
        <>
            <Modal
                isOpen={openModal}
                onRequestClose={closeModal}
                ariaHideApp={false}
                contentLabel={type === "add-vendor" ? 'Add Vendor Modal' : 'Create Project Modal'}
                className="login-register"
                style={{
                    overlay: {
                        backgroundColor: "rgba(0, 0, 0, 0.75)",
                    },
                    content: {
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        maxWidth: "90vw", // Adjust this value as needed
                        width: "80vw", // Set to 'auto' or a specific value based on your design
                        border: "none",
                        background: "transparent",
                        overflow: "hidden",
                        padding: "50px",
                        maxHeight: "100vh", // Adjust this value as needed\
                        height: "90vh", // Adjust this value as needed
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

                <div className="modal-body contact-sec-modal" style={{}}>
                    <div className="contact-sec-3">
                        <div className="contact-sec-3-form">
                            <div className="contact-form">
                                <h2 className="tab-titlex mb-4">{type === "add-vendor" ? 'Add Single Vendor' : type === "create-project" ? 'Create Project' : 'Edit Project'}</h2>
                                <Formik
                                    initialValues={type === "add-vendor" ? initialVendorValues : initialProjectValues}
                                    validationSchema={type === "add-vendor" ? validateVendorSchema : validateProjectSchema}
                                    onSubmit={(values, { resetForm }) => {
                                        type === "add-vendor"
                                            ? handleSubmit(values, resetForm)
                                            : type === "create-project"
                                                ? handleCreateProject(values, resetForm)
                                                : handleEditProject(values, resetForm)
                                    }}
                                >
                                    {({ errors, isValid, touched,setFieldValue }) => (
                                        <Form className="row add-vendor-modal-form">
                                            <div className="col-md-6">
                                                {type === "add-vendor"
                                                    ?
                                                    <>
                                                        {/* add vendor section */}
                                                        <div className="form-group">
                                                            <label htmlFor="vendorName">Vendor's Name <sup>*</sup></label>
                                                            <Field
                                                                type="text"
                                                                id="vendorName"
                                                                name="vendorName"
                                                                placeholder="Demo Manufactuters Pvt. Ltd."
                                                            />
                                                            {touched.vendorName && errors.vendorName && (
                                                                <div className="form-error">{errors.vendorName}</div>
                                                            )}
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor="email">Vendor's Email <sup>*</sup></label>
                                                            <Field
                                                                type="email"
                                                                id="email"
                                                                name="email"
                                                                placeholder="example@letsworkwise.com"
                                                            />
                                                            {touched.email && errors.email && (
                                                                <div className="form-error">{errors.email}</div>
                                                            )}
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor="phone">Phone No <sup>*</sup></label>
                                                            <Field
                                                                type="text"
                                                                id="phone"
                                                                name="phone"
                                                                placeholder="Ex. 9123456789"
                                                            />
                                                            {touched.phone && errors.phone && (
                                                                <div className="form-error">{errors.phone}</div>
                                                            )}
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor="is_private">Vendor Type: <sup>*</sup></label>
                                                            <Field
                                                                as="select"
                                                                name="is_private"
                                                                className={`form-control ${touched.is_private && errors.is_private ? 'is-invalid' : ''}`}  
                                                                onChange={(e) => {
                                                                    // Cast the value to a number and manually set the field value
                                                                    setFieldValue("is_private", Number(e.target.value));
                                                                }}
                                                            >
                                                                <option value={0}>Public</option>
                                                                <option value={1}>Private</option>
                                                            </Field>
                                                            {touched.is_private && errors.is_private && (
                                                                <div className="form-error">{errors.is_private}</div>
                                                            )}
                                                        </div>
                                                    </>
                                                    : <>
                                                        {/* project fields section */}
                                                        <div className="form-group">
                                                            <label htmlFor="projectName">Project Name <sup>*</sup></label>
                                                            <Field
                                                                type="text"
                                                                id="projectName"
                                                                name="projectName"
                                                                placeholder="Demo Project Name"
                                                                disabled={type === "edit-project"}
                                                            />
                                                            {touched.projectName && errors.projectName && (
                                                                <div className="form-error">{errors.projectName}</div>
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
                                                                <div className="form-error">{errors.location}</div>
                                                            )}
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor="ended_at">End Date</label>
                                                            <Field
                                                                type="date"
                                                                id="ended_at"
                                                                name="ended_at"
                                                                min={tomorrow.toISOString().slice(0, 10)}
                                                            />
                                                            {touched.ended_at && errors.ended_at && (
                                                                <div className="form-error">{errors.ended_at}</div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="form-group">
                                                            <label htmlFor="rfq_type">RFQ Type</label>
                                                            <Field as="select" id="rfq_type" name="rfq_type" className={`form-control ${touched.rfq_type && errors.rfq_type ? 'is-invalid' : ''}`}>
                                                                <option value="">Select RFQ Type</option>
                                                                <option value="budgetary">Budgetary</option>
                                                                <option value="firm">Firm</option>
                                                            </Field>
                                                            {touched.rfq_type && errors.rfq_type && (
                                                                <div className="form-error">{errors.rfq_type}</div>
                                                            )}
                                                        </div>
                                                    </>
                                                }
                                            </div>

                                            <div className="col-md-6">
                                                {type === "add-vendor"
                                                    ?
                                                    // Here we have to add product dropdown

                                                    // <div className="form-group">
                                                    //     <label htmlFor="productList">Product List <sup>*</sup></label>
                                                    //     <Field
                                                    //         component="textarea"
                                                    //         id="productList"
                                                    //         name="productList"
                                                    //         placeholder="Brass Binding Wire, Ceramic Marble..."
                                                    //     />
                                                    //     {touched.productList && errors.productList && (
                                                    //         <div className="form-error">{errors.productList}</div>
                                                    //     )}
                                                    // </div>
                                                    <div className="form-group">
                                                            <div className="col-md-10 mb-2">
                                                                <div className="mb-2">
                                                                    <label>Search Product</label>
                                                                    <Select
                                                                        name="product"
                                                                        options={vendorProductsList}
                                                                        value={selectedProduct}
                                                                        components={{ Option: CustomSelectOption }}
                                                                        styles={customStyles}
                                                                        isLoading={productLoading}
                                                                        onInputChange={debounceGetVendorProductList}
                                                                        onChange={(selectedOption) => {
                                                                            handleSelectChange(selectedOption, { name: "product" });
                                                                            // Handle clearing of selection
                                                                            if (!selectedOption) {
                                                                                setSelectedProduct(null); // Clear selectedProduct state
                                                                            }
                                                                        }}
                                                                        placeholder={vendorProductsList.length===0 ? "Please write at least 3 characters..." : "Search or select an option..."}
                                                                        isSearchable
                                                                        isClearable
                                                                    />
                                                                </div>
                                                                <div className="mb-2">
                                                                    <label>Approved By</label>
                                                                    <Select
                                                                        name="approvedBy"
                                                                        options={vendorApprovedList}
                                                                        value={selectedApprovedBy}
                                                                        placeholder="Select Approved By"
                                                                        onChange={handleSelectChange}
                                                                        isMulti
                                                                    />
                                                                </div>
                                                                    {currentProduct && 
                                                                    <div className="d-flex flex-wrap"> <span className="badge bg-danger p-2 me-2 d-flex align-items-center gap-2">{currentProduct.name}<FontAwesomeIcon icon={faClose} onClick={()=> setCurrentProduct(null)} fontSize={14} /></span>
                                                                    <button type="button" className="btn btn-primary btn-sm ms-auto" onClick={handleSingleProductAdd}>Add Product</button>
                                                                    </div>}
                                                            </div>
                        
                                                            {vendorProductDetails.length > 0 && (
                                                                <div className="col-12">
                                                                    <label>Added Products</label>
                                                                    <div className="d-flex flex-wrap">
                                                                        {vendorProductDetails.map((prodItem) => (
                                                                            <div key={prodItem.master_id} className="badge bg-success p-2 me-2 d-flex align-items-center gap-2">
                                                                                {prodItem.name}
                                                                                <FontAwesomeIcon icon={faClose} onClick={()=> removeSelectedVendor(prodItem)} fontSize={14} />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {touched.vendorProductDetails && errors.vendorProductDetails && (
                                                            <div className="form-error">{errors.vendorProductDetails}</div>
                                                            )}
                                                        </div>

                                                    : 
                                                    <>                                                       
                                                        <div className="form-group">
                                                            <label htmlFor="reverse_auction">Reverse Auction <sup>*</sup></label>
                                                            <Field as="select" id="reverse_auction" name="reverse_auction" className={`form-control ${touched.reverse_auction && errors.reverse_auction ? 'is-invalid' : ''}`}>
                                                                <option value="1">Enable</option>
                                                                <option value="0">Disable</option>
                                                            </Field>
                                                            {touched.reverse_auction && errors.reverse_auction && (
                                                                <div className="form-error">{errors.reverse_auction}</div>
                                                            )}
                                                        </div>

                                                        <div className="form-group">
                                                            <label htmlFor="projectDescription">Description</label>
                                                            <Field
                                                                component="textarea"
                                                                id="projectDescription"
                                                                name="projectDescription"
                                                                placeholder="Enter your text here..."
                                                            />
                                                            {touched.projectDescription && errors.projectDescription && (
                                                                <div className="form-error">{errors.projectDescription}</div>
                                                            )}
                                                        </div>                                                                                                    
                                                    </>
                                                }
                                            </div>

                                            <div className="d-flex justify-content-end">
                                                <button disabled={!isValid} class="btn btn-success btn-sm">
                                                    {type === "add-vendor" ? "Add vendor" : type === "create-project" ? "Create" : "Update"}
                                                </button>
                                            </div>
                                        </Form>
                                    )}
                                </Formik>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default DynamicFormModal
