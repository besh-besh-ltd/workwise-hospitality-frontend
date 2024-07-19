import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import FormikField from "@/components/shared/FormikField";
import * as yup from "yup";
import { ErrorMessage, Field, FieldArray, Form, Formik } from "formik";
import { categoryList, vendorApproveList } from "@/services/rfq";
import Select from "react-select";
import UploadFiles from "@/components/shared/ImagesUpload";
import Loader from "@/components/shared/Loader";
import { ToastContainer, toast } from "react-toastify";
import {
  addProducts,
  approvedProductList,
  productDetails,
} from "@/services/products";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { faEye } from "@fortawesome/free-regular-svg-icons";

const AddProducts = () => {
  const id = Date.now().toString();
  const parentSelectRef = useRef();
  const levelOneSelectRef = useRef();
  const levelTwoSelectRef = useRef();
  const levelThreeSelectRef = useRef();
  const levelFourSelectRef = useRef();
  const levelFiveSelectRef = useRef();
  const levelSixSelectRef = useRef();

  const [catloading, setcatloading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [cat_id, setCat_id] = useState("");
  const [levelOneCat, setlevelOneCat] = useState([]);
  const [levelTwoCat, setlevelTwoCat] = useState([]);
  const [levelThreeCat, setlevelThreeCat] = useState([]);
  const [levelFourCat, setlevelFourCat] = useState([]);
  const [levelFiveCat, setlevelFiveCat] = useState([]);
  const [levelSixCat, setlevelSixCat] = useState([]);
  const [vendorApprovedList, setVendorApprovedList] = useState([]);
  const [vendorProductLists, setVendorProductLists] = useState([]);
  const [selectedGalleryFilesReset, setSelectedGalleryFilesReset] =
    useState(false);
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState([]);
  const [selectedFeaturedFilesReset, setSelectedFeaturedFilesReset] =
    useState(false);
  const [selectedFeaturedFiles, setSelectedFeaturedFiles] = useState([]);
  const [selectedQapFilesReset, setSelectedQapFilesReset] = useState(false);
  const [selectedQapFiles, setSelectedQapFiles] = useState([]);
  const [selectedTdsFilesReset, setSelectedTdsFilesReset] = useState(false);
  const [selectedTdsFiles, setSelectedTdsFiles] = useState([]);

  const [levelOneCatSelected, setlevelOneCatSelected] = useState("");
  const [levelTwoCatSelected, setlevelTwoCatSelected] = useState("");
  const [levelThreeCatSelected, setlevelThreeCatSelected] = useState("");
  const [levelFourCatSelected, setlevelFourCatSelected] = useState("");
  const [levelFiveCatSelected, setlevelFiveCatSelected] = useState("");
  const [levelSixCatSelected, setlevelSixCatSelected] = useState("");
  const [masterId, setMasterId] = useState("");
  const [masterProductName, setMasterProductName] = useState("");
  const [mainLoading, setMainLoading] = useState(false);
  const [productDetailsData, setProductDetailsData] = useState([]);
  const [variantData, setVariantData] = useState("");
  const [categoryData, setCategoryData] = useState([]);

  const [parentSelectValue, setParentSelectValue] = useState([]);
  const [levelOneSelectValue, setlevelOneSelectValue] = useState([]);
  const [levelTwoSelectValue, setlevelTwoSelectValue] = useState([]);
  const [levelThreeSelectValue, setlevelThreeSelectValue] = useState([]);
  const [levelFourSelectValue, setlevelFourSelectValue] = useState([]);
  const [levelFiveSelectValue, setlevelFiveSelectValue] = useState([]);
  const [levelSixSelectValue, setlevelSixSelectValue] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);

  const router = useRouter();
  const uploadedImage = React.useRef(null);

  useEffect(() => {
    getCategories();
    getVendorApproveList();
    getVendorProductList();
  }, []);

  useEffect(() => {
    if (
      categoryData.length > 0 &&
      productDetailsData &&
      categories.length > 0 &&
      parentCategories.length > 0
    ) {
      setParentSelectValue(categoryData[0]);
      setlevelOneSelectValue(categoryData[1]);
      setlevelTwoSelectValue(categoryData[2]);
      setlevelThreeSelectValue(categoryData[3]);
      setlevelFourSelectValue(categoryData[4]);
      setlevelFiveSelectValue(categoryData[5]);
      setlevelSixSelectValue(categoryData[6]);

      parentSelectRef?.current?.setValue(categoryData[0]);
      levelOneSelectRef?.current?.setValue(categoryData[1]);
      levelTwoSelectRef?.current?.setValue(categoryData[2]);
      levelThreeSelectRef?.current?.setValue(categoryData[3]);
      levelFourSelectRef?.current?.setValue(categoryData[4]);
      levelFiveSelectRef?.current?.setValue(categoryData[5]);
      levelSixSelectRef?.current?.setValue(categoryData[6]);
    }
  }, [
    categoryData,
    categories,
    parentCategories,
    levelOneCatSelected,
    levelTwoCatSelected,
    levelThreeCatSelected,
    levelFourCatSelected,
    levelFiveCatSelected,
    levelSixCatSelected,
  ]);

  useEffect(() => {
    getGalleryImage();
  }, [productDetailsData]);

  const getGalleryImage = () => {
    let image = [];
    productDetailsData?.product_images?.map((img) => {
      if (img.is_featured == 0) {
        image.push(img.product_image_url);
      }
    });
    setGalleryImages(image);
  };

  const validationSchema = yup.object().shape({
    name: yup.string(),
    // name: yup.string().required("Name is required"),
    // description: yup.string(),
    master_id: yup.string(),
    // master_id: yup.string().required("Product is required"),
    // manufacturer: yup.string(),
    // availability: yup.string(),
    // categories: yup.array().required("Categories id is required"),
    // variations: yup.array().required("Variation id is required"),
    approved_id: yup.array(),
    // approved_name: yup.string().when("approved_id", {
    // 	is: (type) => type == "o",
    // 	then: () => yup.string().required("Approved name is required"),
    // }),
    // variations: yup.array().of(
    // 	yup.object().shape({
    // 		attribute: yup.string().required("Attribute is required"),
    // 		attributeValue: yup.string().required("Attribute value is required"),
    // 	})
    // ),
  });

  const initialValues = {
    master_id: "",
    name: "",
    description: productDetailsData ? productDetailsData.description : "",
    categories: productDetailsData
      ? [productDetailsData.product_categories]
      : [],
    featured: productDetailsData ? productDetailsData.featured : "",
    status: 1,
    approved_id: "",
    /*  productDetailsData && productDetailsData.vendor_approved_by?.length > 0
        ? productDetailsData.vendor_approved_by?.map((item) => item)
        : "", */
    approved_name: productDetailsData ? productDetailsData.approved_name : "",
    variations:
      variantData.length != 0 && productDetailsData
        ? variantData
        : [{ attribute: "", attributeValue: "" }],
    // vendor: productDetailsData.vendor ? productDetailsData.vendor : ""
  };

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      height: 50,
      minHeight: 50,
    }),
  };

  const getCategories = () => {
    setcatloading(true);
    categoryList()
      .then((rsp) => {
        setcatloading(false);
        let options = [];
        let parentOptions = [];
        rsp.data.map((item) => {
          options.push({ value: item?.id, label: item?.title });
          if (item.parent_id == 0) {
            parentOptions.push({ value: item?.id, label: item?.title });
          }
        });
        setCategories(rsp.data);
        setParentCategories(parentOptions);
      })
      .catch((error) => {
        setcatloading(false);
      });
  };
  const getChildCategories = (id, level) => {
    let childItems = categories.filter((item) => item.parent_id == id);
    let options = [];
    if (childItems.length > 0) {
      childItems.map((item) => {
        options.push({ value: item?.id, label: item?.title });
      });
    }
    //console.log("categories", categories);
    //console.log("childItems", childItems);
    //console.log(id, options, level);
    if (level == 1) {
      setlevelOneCat(options);
      setlevelOneCatSelected(id);
      setlevelTwoCatSelected("");
      setlevelThreeCatSelected("");
      setlevelFourCatSelected("");
      setlevelFiveCatSelected("");
      setlevelSixCatSelected("");
    } else if (level == 2) {
      setlevelTwoCat(options);
      setlevelTwoCatSelected(id);
      setlevelThreeCatSelected("");
      setlevelFourCatSelected("");
      setlevelFiveCatSelected("");
      setlevelSixCatSelected("");
    } else if (level == 3) {
      setlevelThreeCat(options);
      setlevelThreeCatSelected(id);
      setlevelFourCatSelected("");
      setlevelFiveCatSelected("");
      setlevelSixCatSelected("");
    } else if (level == 4) {
      setlevelFourCat(options);
      setlevelFourCatSelected(id);
      setlevelFiveCatSelected("");
      setlevelSixCatSelected("");
    } else if (level == 5) {
      setlevelFiveCat(options);
      setlevelFiveCatSelected(id);
      setlevelSixCatSelected("");
    } else if (level == 6) {
      setlevelSixCat(options);
      setlevelSixCatSelected(id);
    } else {
    }
  };

  const getVendorApproveList = () => {
    vendorApproveList().then((res) => {
      let lists = res.data.map((s) => ({
        label: s.vendor_approve,
        value: s.id,
      }));
      setVendorApprovedList(lists);
    });
  };

  const getVendorProductList = () => {
    approvedProductList().then((res) => {
      let lists = res.data.map((s) => ({
        label: s.name,
        value: s.id,
      }));
      lists.push({ label: "Other", value: "01" });
      setVendorProductLists(lists);
    });
  };

  const submitHandler = (values) => {
    const payload = new FormData();
    payload.append(`master_id`, masterId == "01" ? "" : masterId);
    payload.append(`name`, masterProductName ? masterProductName : values.name);
    payload.append(`description`, values.description);
    // payload.append(`manufacturer`, values.manufacturer);
    // payload.append(`availability`, values.availability);
    payload.append(`status`, 1);
    payload.append(
      `approved_id`,
      values.approved_id == "o" ? "" : JSON.stringify(values.approved_id)
    );
    payload.append(
      `approved_name`,
      values.approved_id == "o" ? values.approved_name : ""
    );
    payload.append(`variations`, JSON.stringify(values.variations));
    selectedGalleryFiles.forEach((file, i) => {
      payload.append(`gallery`, file, file.name);
    });
    selectedFeaturedFiles.forEach((file, i) => {
      payload.append(`featured`, file, file.name);
    });
    selectedQapFiles.forEach((file, i) => {
      payload.append(`qap`, file, file.name);
    });
    selectedTdsFiles.forEach((file, i) => {
      payload.append(`tds`, file, file.name);
    });
    let selectedCategories = [];
    if (masterId != "01") {
      values.categories[0].forEach((cats) => {
        selectedCategories.push(cats.id);
      });
    } else {
      selectedCategories = [
        levelOneCatSelected,
        levelTwoCatSelected,
        levelThreeCatSelected,
        levelFourCatSelected,
        levelFiveCatSelected,
        levelSixCatSelected,
      ];
      selectedCategories = selectedCategories.filter(
        (v) => v != "" && v !== null
      );
    }
    // console.log("selectedCategories ==>", selectedCategories);
    payload.append(`categories`, JSON.stringify(selectedCategories));
    console.log(payload);
    setMainLoading(true);
    addProducts(payload)
      .then((res) => {
        setMainLoading(false);
        router.push("/dashboard/vendor/product-management");
        toast(res.message);
      })
      .catch((error) => {
        //console.log(error);
        setMainLoading(false);
      });
  };

  const getProductDetails = (id) => {
    productDetails(id)
      .then((response) => {
        setProductDetailsData(response.data);
        let category = [];
        response.data.product_categories?.map((data) => {
          category.push({
            label: data.category_name,
            value: data.id,
          });
        });
        setCategoryData(category);
        let variant = [];
        response.data.product_variants.map((data) => {
          variant.push({
            attribute: data.variant_name,
            attributeValue: data.variant_value,
          });
        });
        setVariantData(variant);
      })
      .catch((error) => {
        setcatloading(false);
      });
  };

  return (
    <>
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Product Management</h1>
          <Link
            href="/dashboard/vendor/product-management"
            className="page-link backBtn"
          >
            {" "}
            <FontAwesomeIcon icon={faArrowLeft} /> Go back
          </Link>
        </div>
      </section>
      <ToastContainer />
      <section className="add-prod-sec-1">
        {mainLoading && <Loader />}
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="add-prod-con">
                <span className="title">Add Products</span>
                <Formik
                  enableReinitialize={true}
                  initialValues={initialValues}
                  validationSchema={validationSchema}
                  onSubmit={(values, { resetForm }) => {
                    console.log("values", values);
                    submitHandler(values);
                  }}
                >
                  {({
                    errors,
                    touched,
                    values,
                    handleChange,
                    setFieldValue,
                  }) => (
                    <Form>
                      <div className="row add-product">
                        <div className="col-md-12">
                          <Select
                            options={vendorProductLists}
                            placeholder="Product Name"
                            isClearable={false}
                            styles={customSelectStyles}
                            onChange={(options) => {
                              setFieldValue("master_id", options.value);
                              setMasterId(options.value);

                              if (options.value != "01") {
                                getProductDetails(options.value);
                                setFieldValue("name", options.label);
                                setMasterProductName(options.label);
                              } else {
                                setMasterProductName("");
                                setProductDetailsData(null);
                                setFieldValue("name", "");
                                setFieldValue("description", "");
                                setFieldValue("categories", []);
                                setFieldValue("featured", "");
                                setFieldValue("approved_id", "");
                                setFieldValue("approved_name", "");
                                setFieldValue("variations", [
                                  { attribute: "", attributeValue: "" },
                                ]);
                                setlevelOneCat([]);
                                setlevelTwoCat([]);
                                setlevelThreeCat([]);
                                setlevelFourCat([]);
                                setlevelFiveCat([]);
                                setlevelSixCat([]);
                              }
                            }}
                          />
                          <ErrorMessage
                            name={"master_id"}
                            component="div"
                            className="form-error"
                          />
                        </div>

                        {masterId == "01" && (
                          <div className="col-md-12">
                            <FormikField
                              label="Product Name"
                              placeholder="Ex. HDPE Ball Valve"
                              isRequired={true}
                              name="name"
                              touched={touched}
                              errors={errors}
                            />
                          </div>
                        )}

                        {!catloading && masterId == "01" && (
                          <>
                            <div className="col-md-3 category-ab">
                              <div className="form-group">
                                <Select
                                  id={id}
                                  ref={parentSelectRef}
                                  options={parentCategories}
                                  value={parentSelectValue}
                                  placeholder="Select Category"
                                  isClearable={true}
                                  isDisabled={masterId != "01" ? true : false}
                                  styles={customSelectStyles}
                                  onChange={(e) => {
                                    setlevelOneCat([]);
                                    setlevelTwoCat([]);
                                    setlevelThreeCat([]);
                                    setlevelFourCat([]);
                                    setlevelFiveCat([]);
                                    setlevelSixCat([]);
                                    if (e && e.value) {
                                      getChildCategories(e.value, "1");
                                      setParentSelectValue({
                                        label: e.label,
                                        value: e.value,
                                      });
                                      setCat_id(e.value);
                                      setFieldValue("categories", [e.value]);
                                    } else {
                                      setFieldValue("categories", []);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            {levelOneCat && levelOneCat.length > 0 && (
                              <div className="col-md-3">
                                <div className="form-group">
                                  <Select
                                    ref={levelOneSelectRef}
                                    options={levelOneCat}
                                    value={levelOneSelectValue}
                                    placeholder="Select Sub Category"
                                    isClearable={true}
                                    styles={customSelectStyles}
                                    isDisabled={masterId != "01" ? true : false}
                                    onChange={(e) => {
                                      if (e && e.value) {
                                        //console.log("---------", e);
                                        setlevelOneSelectValue({
                                          label: e.label,
                                          value: e.value,
                                        });
                                        getChildCategories(e.value, "2");
                                        setCat_id(e.value);
                                      } else {
                                        setCat_id("");
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                            {levelTwoCat && levelTwoCat.length > 0 && (
                              <div className="col-md-3">
                                <div className="form-group">
                                  <Select
                                    ref={levelTwoSelectRef}
                                    options={levelTwoCat}
                                    value={levelTwoSelectValue}
                                    placeholder="Select Sub Category"
                                    isClearable={true}
                                    isDisabled={masterId != "01" ? true : false}
                                    styles={customSelectStyles}
                                    onChange={(e) => {
                                      if (e && e.value) {
                                        setlevelTwoSelectValue({
                                          label: e.label,
                                          value: e.value,
                                        });
                                        getChildCategories(e.value, "3");
                                        setCat_id(e.value);
                                      } else {
                                        setCat_id("");
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                            {levelThreeCat && levelThreeCat.length > 0 && (
                              <div className="col-md-3">
                                <div className="form-group">
                                  <Select
                                    ref={levelThreeSelectRef}
                                    options={levelThreeCat}
                                    value={levelThreeSelectValue}
                                    placeholder="Select Sub Category"
                                    isClearable={true}
                                    isDisabled={masterId != "01" ? true : false}
                                    styles={customSelectStyles}
                                    onChange={(e) => {
                                      if (e && e.value) {
                                        setlevelThreeSelectValue({
                                          label: e.label,
                                          value: e.value,
                                        });
                                        getChildCategories(e.value, "4");
                                        setCat_id(e.value);
                                      } else {
                                        setCat_id("");
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {levelFourCat && levelFourCat.length > 0 && (
                              <div className="col-md-3">
                                <div className="form-group">
                                  <Select
                                    ref={levelFourSelectRef}
                                    options={levelFourCat}
                                    value={levelFourSelectValue}
                                    placeholder="Select Sub Category"
                                    isClearable={true}
                                    isDisabled={masterId != "01" ? true : false}
                                    styles={customSelectStyles}
                                    onChange={(e) => {
                                      if (e && e.value) {
                                        setlevelFourSelectValue({
                                          label: e.label,
                                          value: e.value,
                                        });
                                        getChildCategories(e.value, "5");
                                        setCat_id(e.value);
                                      } else {
                                        setCat_id("");
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {levelFiveCat && levelFiveCat.length > 0 && (
                              <div className="col-md-3">
                                <div className="form-group">
                                  <Select
                                    ref={levelFiveSelectRef}
                                    options={levelFiveCat}
                                    value={levelFiveSelectValue}
                                    placeholder="Select Sub Category"
                                    isClearable={true}
                                    isDisabled={masterId != "01" ? true : false}
                                    styles={customSelectStyles}
                                    onChange={(e) => {
                                      if (e && e.value) {
                                        setlevelFiveSelectValue({
                                          label: e.label,
                                          value: e.value,
                                        });
                                        getChildCategories(e.value, "6");
                                        setCat_id(e.value);
                                      } else {
                                        setCat_id("");
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                            {levelSixCat && levelSixCat.length > 0 && (
                              <div className="col-md-3">
                                <div className="form-group">
                                  <Select
                                    ref={levelSixSelectRef}
                                    options={levelSixCat}
                                    value={levelSixSelectValue}
                                    placeholder="Select Sub Category"
                                    isClearable={true}
                                    isDisabled={masterId != "01" ? true : false}
                                    styles={customSelectStyles}
                                    onChange={(e) => {
                                      if (e && e.value) {
                                        setlevelSixSelectValue({
                                          label: e.label,
                                          value: e.value,
                                        });
                                        getChildCategories(e.value, "7");
                                        setCat_id(e.value);
                                      } else {
                                        setCat_id("");
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {masterId == "01" && (
                          <div className="col-md-12">
                            <FormikField
                              label="Product Description"
                              placeholder="Enter Product Description"
                              type="textarea"
                              isRequired={true}
                              isDisabled={masterId != "01" ? true : false}
                              name="description"
                              touched={touched}
                              errors={errors}
                              className="text-editor-area"
                              cols="30"
                              rows="10"
                            />
                          </div>
                        )}

                        {/* <div className="col-md-8">
													<FormikField
														label="Manufacturer"
														placeholder="Ex. Worksise Private Limited"
														isRequired={true}
														name="manufacturer"
														touched={touched}
														errors={errors}
													/>
												</div> */}

                        {/* <div className="col-md-4">
													<FormikField
														label="Availability"
														type="select"
														placeholder="Product Availability"
														selectOptions={[
															{ label: "Product Availability", value: "" },
															{ label: "Unavailable", value: 0 },
															{ label: "Available", value: 1 },
														]}
														isRequired={true}
														name="availability"
														touched={touched}
														errors={errors}
													/>
												</div> */}

                        <div className="col-md-4">
                          <div className="form-group">
                            <label htmlFor="approved_id">Approved Vendor</label>
                            <Select
                              isMulti
                              name={"approved_id"}
                              options={vendorApprovedList}
                              placeholder="Approved By"
                              isClearable={true}
                              //   isDisabled={masterId != "01" ? true : false}
                              styles={customSelectStyles}
                              value={vendorApprovedList.filter((option) =>
                                values?.approved_id?.includes(option?.value)
                              )}
                              onChange={(options) => {
                                setFieldValue(
                                  "approved_id",
                                  options.map((option) => option.value)
                                );
                              }}
                            />
                            <ErrorMessage
                              name={"approved_id"}
                              component="div"
                              className="form-error"
                            />
                          </div>
                        </div>

                        {values.approved_id == "o" && (
                          <div className="col-md-8">
                            <FormikField
                              label="Approved name"
                              isRequired={true}
                              name="approved_name"
                              touched={touched}
                              errors={errors}
                            />
                          </div>
                        )}

                        {masterId == "01" && (
                          <div className="col-md-12 ">
                            <div className="row">
                              <UploadFiles
                                accept=".png, .jpg, .jpeg, .gif"
                                upload={setSelectedGalleryFiles}
                                reset={selectedGalleryFilesReset}
                                label="Upload Product Images"
                                isDisabled={masterId !== "01" ? true : false}
                              />
                            </div>
                          </div>
                        )}
                        {masterId == "01" && (
                          <div className="gallery-image-pane d-flex mt-2">
                            {galleryImages &&
                              galleryImages.length != 0 &&
                              galleryImages.map((data, index) => {
                                return (
                                  <div className="image-panel">
                                    <img
                                      key={index}
                                      src={data}
                                      style={{
                                        width: "80px",
                                        height: "80px",
                                        objectFit: "cover",
                                      }}
                                    />
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        {masterId == "01" && (
                          <div className="col-md-12">
                            <div className="row">
                              <UploadFiles
                                accept=".png, .jpg, .jpeg, .gif"
                                upload={setSelectedFeaturedFiles}
                                reset={selectedFeaturedFilesReset}
                                label="Upload Featured Image"
                                isMultiple={false}
                                isDisabled={masterId !== "01" ? true : false}
                              />

                              {productDetailsData &&
                                productDetailsData.product_images &&
                                productDetailsData.product_images.length != 0 &&
                                productDetailsData.product_images.map(
                                  (data, index) => {
                                    return (
                                      data.is_featured == 1 && (
                                        <div className="mt-2 mb-2">
                                          <img
                                            key={index}
                                            ref={uploadedImage}
                                            src={data.product_image_url}
                                            style={{
                                              width: "80px",
                                              height: "80px",
                                              objectFit: "cover",
                                            }}
                                          />
                                        </div>
                                      )
                                    );
                                  }
                                )}
                            </div>
                          </div>
                        )}
                        {masterId == "01" && (
                          <div className="col-md-12">
                            <div className="row">
                              <UploadFiles
                                accept=".pdf"
                                upload={setSelectedQapFiles}
                                reset={selectedQapFilesReset}
                                label="Upload QAP File"
                                isMultiple={false}
                                // isDisabled={masterId !== "01" ? true : false}
                                isDisabled={false}
                              />

                              {selectedQapFiles.length > 0 &&
                                productDetailsData &&
                                productDetailsData.qap_new_file_name && (
                                  <div className="mt-2 mb-2">
                                    <a
                                      href={
                                        productDetailsData?.qap_new_file_name
                                      }
                                      target="_blank"
                                    >
                                      <FontAwesomeIcon icon={faEye} />
                                    </a>

                                    <a>
                                      {
                                        productDetailsData?.qap_original_file_name
                                      }
                                    </a>
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                        {masterId == "01" && (
                          <div className="col-md-12">
                            <div className="row">
                              <UploadFiles
                                accept=".pdf"
                                upload={setSelectedTdsFiles}
                                reset={selectedTdsFilesReset}
                                label="Upload TDS File"
                                isMultiple={false}
                                // isDisabled={masterId !== "01" ? true : false}
                                isDisabled={false}
                              />

                              {selectedTdsFiles.length > 0 &&
                                productDetailsData &&
                                productDetailsData.tds_new_file_name && (
                                  <div className="mt-2 mb-2">
                                    <a
                                      href={
                                        productDetailsData?.tds_new_file_name
                                      }
                                      target="_blank"
                                    >
                                      <FontAwesomeIcon icon={faEye} />
                                    </a>

                                    <a>
                                      {
                                        productDetailsData?.tds_original_file_name
                                      }
                                    </a>
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                        {masterId == "01" && (
                          <div className="col-md-12">
                            <div className="prod-spec-sec">
                              <div className="specification ">
                                <FieldArray name="variations">
                                  {({ push, remove }) => (
                                    <>
                                      {values.variations.map((field, index) => (
                                        <div key={index} className="row">
                                          <div className="col-md-3">
                                            <Field
                                              name={`variations.${index}.attribute`}
                                              type="text"
                                              placeholder="Ex. Material"
                                              disabled={
                                                masterId !== "01" ? true : false
                                              }
                                            />
                                            <div className="form-error">
                                              <ErrorMessage
                                                name={`variations.${index}.attribute`}
                                                className="form-error"
                                              />
                                            </div>
                                          </div>

                                          <div className="col-md-3">
                                            <Field
                                              name={`variations.${index}.attributeValue`}
                                              type="text"
                                              placeholder="Ex. Steel"
                                              disabled={
                                                masterId !== "01" ? true : false
                                              }
                                            />
                                            <div className="form-error">
                                              <ErrorMessage
                                                name={`variations.${index}.attributeValue`}
                                                className="form-error"
                                              />
                                            </div>
                                          </div>

                                          {values.variations.length > 1 && (
                                            <div className="col-md-3">
                                              <button
                                                href="/"
                                                onClick={(event) => {
                                                  event.preventDefault();
                                                  remove(index);
                                                }}
                                                className="btn btn-primary"
                                                disabled={
                                                  masterId !== "01"
                                                    ? true
                                                    : false
                                                }
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() =>
                                          push({
                                            attribute: "",
                                            attributeValue: "",
                                          })
                                        }
                                        disabled={
                                          masterId !== "01" ? true : false
                                        }
                                      >
                                        Add Field
                                      </button>
                                    </>
                                  )}
                                </FieldArray>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="page-link btn btn-secondary"
                      >
                        Save
                      </button>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AddProducts;
