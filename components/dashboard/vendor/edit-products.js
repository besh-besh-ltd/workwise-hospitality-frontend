import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import FormikField from "@/components/shared/FormikField";
import * as yup from "yup";
import { ErrorMessage, Field, FieldArray, Form, Formik } from "formik";
import { categoryList, vendorApproveList } from "@/services/rfq";
import { productDetails, handleUpdateProduct } from "@/services/products";
import Select from "react-select";
import Loader from "@/components/shared/Loader";
import { ToastContainer, toast } from "react-toastify";
import { updateProducts } from "@/services/products";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { faEye } from "@fortawesome/free-regular-svg-icons";

const EditProducts = () => {
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
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState([]);
  const [selectedFeaturedFiles, setSelectedFeaturedFiles] = useState([]);
  const [levelOneCatSelected, setlevelOneCatSelected] = useState("");
  const [levelTwoCatSelected, setlevelTwoCatSelected] = useState("");
  const [levelThreeCatSelected, setlevelThreeCatSelected] = useState("");
  const [levelFourCatSelected, setlevelFourCatSelected] = useState("");
  const [levelFiveCatSelected, setlevelFiveCatSelected] = useState("");
  const [levelSixCatSelected, setlevelSixCatSelected] = useState("");
  const [mainLoading, setMainLoading] = useState(false);
  const [productDetailsData, setProductDetailsData] = useState([]);
  const [variantData, setVariantData] = useState("");
  const [approve, setApprove] = useState(true);
  const [categoryData, setCategoryData] = useState([]);
  const [selectedFile, setSelectedFile] = useState([]);
  const [fileType, setFileType] = useState([]);
  const [images, setImages] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [selectedQapFiles, setSelectedQapFiles] = useState([]);
  const [selectedTdsFiles, setSelectedTdsFiles] = useState([]);
  const [qapFile, setQapFile] = useState(null);
  const [tdsFile, setTdsFile] = useState(null);
  const [parentSelectValue, setParentSelectValue] = useState([]);
  const [levelOneSelectValue, setlevelOneSelectValue] = useState([]);
  const [levelTwoSelectValue, setlevelTwoSelectValue] = useState([]);
  const [levelThreeSelectValue, setlevelThreeSelectValue] = useState([]);
  const [levelFourSelectValue, setlevelFourSelectValue] = useState([]);
  const [levelFiveSelectValue, setlevelFiveSelectValue] = useState([]);
  const [levelSixSelectValue, setlevelSixSelectValue] = useState([]);
  const router = useRouter();
  const { id } = router.query;
  const uploadedImage = React.useRef(null);
  const imageUploader = React.useRef(null);
  let files;
  let gallery;
  const customSelectStyles = {
    control: (base) => ({
      ...base,
      height: 50,
      minHeight: 50,
    }),
  };

  const initialValues = {
    name: productDetailsData.name ? productDetailsData.name : "",
    description: productDetailsData.description
      ? productDetailsData.description
      : "",
    // manufacturer: productDetailsData.manufacturer
    //   ? productDetailsData.manufacturer
    //   : "",
    // availability:
    //   productDetailsData.availability !== undefined
    //     ? productDetailsData.availability
    //     : "",
    categories: productDetailsData.product_categories
      ? [productDetailsData.product_categories]
      : [],
    featured: productDetailsData.featured ? productDetailsData.featured : "",
    status: 1,
    approved_id:
      productDetailsData.vendor_approved_by &&
      productDetailsData.vendor_approved_by?.length > 0
        ? productDetailsData.vendor_approved_by?.map((item) => item)
        : "",
    approved_name: productDetailsData.approved_name
      ? productDetailsData.approved_name
      : "",
    variations:
      variantData.length != 0
        ? variantData
        : [{ attribute: "", attributeValue: "" }],
    // vendor: productDetailsData.vendor ? productDetailsData.vendor : ""
  };

  const getProductDetails = () => {
    productDetails(id)
      .then((response) => {
        if (response?.data?.is_approve == 0) {
          setApprove(false);
        }
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
    console.log("options and id.... *", options, id, level);
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
      // lists.unshift({ label: "Select Vendor list", value: "" });
      // lists.push({ label: "Other", value: "o" });
      console.log("lists", lists);
      setVendorApprovedList(lists);
    });
  };

  useEffect(() => {
    if (
      categoryData.length > 0 &&
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
      parentSelectRef?.current?.setValue(parentSelectValue);
      levelOneSelectRef?.current?.setValue(levelOneSelectValue);
      levelTwoSelectRef?.current?.setValue(levelTwoSelectValue);
      levelThreeSelectRef?.current?.setValue(levelThreeSelectValue);
      levelFourSelectRef?.current?.setValue(levelFourSelectValue);
      levelFiveSelectRef?.current?.setValue(levelFiveSelectValue);
      levelSixSelectRef?.current?.setValue(levelSixSelectValue);
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

  const imageUploadHandler = (events) => {
    const [file] = events.target.files;
    const selectedFiles = Array.from(events.target.files);
    setSelectedFeaturedFiles(selectedFiles);
    if (file) {
      const reader = new FileReader();
      const { current } = uploadedImage;
      current.file = file;
      reader.onload = (events) => {
        current.src = events.target.result;
        setSelectedFile(current.src);
      };
      reader.readAsDataURL(file);
      setFileType(file.type);
    }
  };
  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setImages(selectedFiles);
    setGalleryImages("");
    setSelectedGalleryFiles(selectedFiles);
  };

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

  const submitHandler = (values) => {
    console.log(values, "values *");
    const payload = new FormData();
    payload.append(`name`, values.name);
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
    if (approve) {
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

    payload.append(`categories`, JSON.stringify(selectedCategories));

    setMainLoading(true);
    updateProducts(payload, id)
      .then((res) => {
        setMainLoading(false);
        toast.success(res.message);
        setTimeout(() => {
          router.push("/dashboard/vendor/product-management");
        }, 1000);
      })
      .catch((error) => {
        setMainLoading(false);
        if (error?.message) {
          toast.error(error.message.response.data.message, {
            position: "top-right",
          });
        }

        if (error.response?.status === 400) {
          if (error.response.data.status === 2) {
            let txt = "";
            for (let x in error.response.data.errors) {
              txt = error.response.data.errors[x];
            }
            toast.error(txt, {
              position: "top-right",
            });
          } else if (error.response.data.status === 3) {
            let txt = "";
            for (let x in error.response.data.errors) {
              txt = error.response.data.errors[x];
            }
            toast.error(txt, {
              position: "top-right",
            });
          } else {
            toast.error(error.response.data.message, {
              position: "top-right",
            });
          }
        } else {
          toast.error(error.message, {
            position: "top-right",
          });
        }
      });
  };

  useEffect(() => {
    if (id) {
      getProductDetails();
      getCategories();
      getVendorApproveList();
    }
  }, [id]);
  return (
    <>
      <ToastContainer />
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

      <section className="add-prod-sec-1">
        {mainLoading && <Loader />}
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="add-prod-con">
                <span className="title">Edit Products</span>
                <Formik
                  enableReinitialize={true}
                  initialValues={initialValues}
                  validationSchema={yup.object().shape({
                    name: yup.string().required("Name is required"),
                    description: yup.string(),
                    // manufacturer: yup.string(),
                    // availability: yup.string(),
                    approved_id: yup.array(),
                    // vendor: yup
                    //     .string()
                    //     .required("Vendor is required"),
                  })}
                  onSubmit={(values, { resetForm }) => {
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
                      {productDetailsData && productDetailsData.length != 0 && (
                        <div className="row add-product">
                          <div className="col-md-12">
                            <div className="form-group">
                              <FormikField
                                label="Product Name"
                                isRequired={true}
                                name="name"
                                touched={touched}
                                errors={errors}
                                isDisabled={approve}
                              />
                            </div>
                          </div>

                          {!catloading && !approve && (
                            <>
                              <div className="col-md-3">
                                <div className="form-group">
                                  <Select
                                    ref={parentSelectRef}
                                    options={parentCategories}
                                    placeholder="Select Category"
                                    isClearable={true}
                                    value={parentSelectValue}
                                    styles={customSelectStyles}
                                    onChange={(e) => {
                                      setlevelOneCat([]);
                                      setlevelTwoCat([]);
                                      setlevelThreeCat([]);
                                      setlevelFourCat([]);
                                      setlevelFiveCat([]);
                                      setlevelSixCat([]);
                                      getChildCategories(e?.value, "1");
                                      if (e && e.value) {
                                        setParentSelectValue({
                                          label: e.label,
                                          value: e.value,
                                        });
                                        setFieldValue("categories", [e.value]);
                                        setCat_id(e.value);
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
                                      placeholder="Select Sub Category"
                                      isClearable={true}
                                      value={levelOneSelectValue}
                                      styles={customSelectStyles}
                                      onChange={(e) => {
                                        getChildCategories(e?.value, "2");
                                        if (e && e.value) {
                                          setlevelOneSelectValue({
                                            label: e.label,
                                            value: e.value,
                                          });
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
                                      placeholder="Select Sub Category"
                                      isClearable={true}
                                      value={levelTwoSelectValue}
                                      styles={customSelectStyles}
                                      onChange={(e) => {
                                        getChildCategories(e?.value, "3");
                                        if (e && e.value) {
                                          setlevelTwoSelectValue({
                                            label: e.label,
                                            value: e.value,
                                          });
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
                                      styles={customSelectStyles}
                                      onChange={(e) => {
                                        getChildCategories(e?.value, "4");
                                        if (e && e.value) {
                                          setlevelThreeSelectValue({
                                            label: e.label,
                                            value: e.value,
                                          });
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
                                      styles={customSelectStyles}
                                      onChange={(e) => {
                                        getChildCategories(e?.value, "5");
                                        if (e && e.value) {
                                          setlevelFourSelectValue({
                                            label: e.label,
                                            value: e.value,
                                          });
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
                                      styles={customSelectStyles}
                                      onChange={(e) => {
                                        getChildCategories(e?.value, "6");
                                        if (e && e.value) {
                                          setlevelFiveSelectValue({
                                            label: e.label,
                                            value: e.value,
                                          });
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
                                      styles={customSelectStyles}
                                      onChange={(e) => {
                                        getChildCategories(e?.value, "7");
                                        if (e && e.value) {
                                          setlevelSixSelectValue({
                                            label: e.label,
                                            value: e.value,
                                          });
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

                          {!approve && (
                            <div className="col-md-12">
                              <div className="form-group">
                                <FormikField
                                  label="Product Description"
                                  type="textarea"
                                  isRequired={true}
                                  name="description"
                                  touched={touched}
                                  errors={errors}
                                  className="text-editor-area"
                                  cols="30"
                                  rows="10"
                                />
                              </div>
                            </div>
                          )}

                          {/* <div className="col-md-8">
                            <div className="form-group">
                              <FormikField
                                label="Manufacturer"
                                isRequired={true}
                                name="manufacturer"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div> */}

                          {/* <div className="col-md-4">
                            <div className="form-group">
                              <FormikField
                                label="Availability"
                                type="select"
                                selectOptions={[
                                  { label: "Select Availability", value: "" },
                                  { label: "Unavailable", value: 0 },
                                  { label: "Available", value: 1 },
                                ]}
                                isRequired={true}
                                name="availability"
                                touched={touched}
                                errors={errors}
                              />
                            </div>
                          </div> */}

                          <div className="col-md-4">
                            <div className="form-group">
                              <label htmlFor="approved_id">
                                Approved Vendor
                              </label>
                              <Select
                                isMulti
                                name={"approved_id"}
                                options={vendorApprovedList}
                                placeholder="Select Vendor list"
                                isClearable={true}
                                value={vendorApprovedList.filter((option) =>
                                  values?.approved_id?.includes(option?.value)
                                )}
                                styles={customSelectStyles}
                                onChange={(selectedOptions) => {
                                  const selectedValues = selectedOptions
                                    ? selectedOptions.map(
                                        (option) => option.value
                                      )
                                    : [];
                                  setFieldValue("approved_id", selectedValues);
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
                              <div className="form-group">
                                <FormikField
                                  label="Approved name"
                                  isRequired={true}
                                  name="approved_name"
                                  touched={touched}
                                  errors={errors}
                                />
                              </div>
                            </div>
                          )}

                          {!approve && (
                            <div className="col-md-12 editProduct">
                              <div className="row">
                                <label>Upload Product Images</label>
                                <Field
                                  id="gallery"
                                  name="gallery"
                                  type="file"
                                  className="file-control"
                                  value={undefined}
                                  multiple
                                  ref={imageUploader}
                                  onChange={(event) => {
                                    handleImageChange(event);
                                    gallery = event.target.files;
                                    setFieldValue("gallery", gallery);
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {!approve && (
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
                              {images &&
                                images.length != 0 &&
                                images.map((data, index) => {
                                  return (
                                    <div className="image-panel">
                                      <img
                                        key={index}
                                        src={URL.createObjectURL(data)}
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

                          {!approve && (
                            <div className="col-md-12 editProduct">
                              <div className="row featured-image">
                                <label>Upload Featured Image</label>
                                <Field
                                  id="file"
                                  name="featured"
                                  type="file"
                                  className="file-control"
                                  touched={touched}
                                  errors={errors}
                                  value={undefined}
                                  ref={imageUploader}
                                  onChange={(event) => {
                                    files = event.target.files[0];
                                    setFieldValue("featured", files);
                                    imageUploadHandler(event);
                                  }}
                                />
                                {/* {touched.featured && errors.featured && <div className="form-error">{errors.featured}</div>} */}

                                {productDetailsData.product_images &&
                                  productDetailsData.product_images.length !=
                                    0 &&
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
                          {!approve && (
                            <div className="col-md-12 editProduct">
                              <div className="row featured-image">
                                <label>Upload QAP File</label>
                                <Field
                                  id="qap-file"
                                  name="qap"
                                  accept=".pdf"
                                  type="file"
                                  className="file-control"
                                  touched={touched}
                                  errors={errors}
                                  value={undefined}
                                  ref={imageUploader}
                                  onChange={(e) => {
                                    const qap = e.target.files[0];
                                    setFieldValue("qap", qap);
                                    setQapFile(URL.createObjectURL(qap));
                                    setSelectedQapFiles([qap]);
                                  }}
                                />
                                {/* {touched.featured && errors.featured && <div className="form-error">{errors.featured}</div>} */}

                                {productDetailsData?.qap_new_file_name &&
                                  !qapFile && (
                                    <div className="mt-2 mb-2">
                                      <>
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
                                      </>
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}
                          {!approve && (
                            <div className="col-md-12 editProduct">
                              <div className="row featured-image">
                                <label>Upload TDS File</label>
                                <Field
                                  id="tds-file"
                                  name="tds"
                                  accept=".pdf"
                                  type="file"
                                  className="file-control"
                                  touched={touched}
                                  errors={errors}
                                  value={undefined}
                                  onChange={(e) => {
                                    const tds = e.target.files[0];
                                    setFieldValue("tds", tds);
                                    setTdsFile(URL.createObjectURL(tds));
                                    setSelectedTdsFiles([tds]);
                                  }}
                                />
                                {/* {touched.featured && errors.featured && <div className="form-error">{errors.featured}</div>} */}

                                {productDetailsData?.tds_new_file_name &&
                                  !tdsFile && (
                                    <div className="mt-2 mb-2">
                                      <>
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
                                      </>
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}

                          {!approve && (
                            <div className="prod-spec-sec p-0 pt-3">
                              <div className="col-md-12">
                                <div className="specification ">
                                  <label>Product Variants</label>
                                  <FieldArray name="variations">
                                    {({ push, remove }) => (
                                      <>
                                        {variantData &&
                                          values.variations.map(
                                            (field, index) => (
                                              <div key={index} className="row">
                                                <div className="col-md-3">
                                                  <div className="form-group">
                                                    <Field
                                                      name={`variations.${index}.attribute`}
                                                      type="text"
                                                      placeholder="Attribute"
                                                    />
                                                    <div className="form-error">
                                                      <ErrorMessage
                                                        name={`variations.${index}.attribute`}
                                                        className="form-error"
                                                      />
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="col-md-3">
                                                  <div className="form-group">
                                                    <Field
                                                      name={`variations.${index}.attributeValue`}
                                                      type="text"
                                                      placeholder="Attribute Value"
                                                    />
                                                    <div className="form-error">
                                                      <ErrorMessage
                                                        name={`variations.${index}.attributeValue`}
                                                        className="form-error"
                                                      />
                                                    </div>
                                                  </div>
                                                </div>

                                                {values.variations.length >
                                                  1 && (
                                                  <div className="col-md-3">
                                                    <div className="form-group">
                                                      <Link
                                                        href="/"
                                                        onClick={(event) => {
                                                          event.preventDefault();
                                                          remove(index);
                                                        }}
                                                        className="btn btn-primary"
                                                      >
                                                        Remove
                                                      </Link>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          )}
                                        <button
                                          type="button"
                                          className="btn btn-primary"
                                          onClick={() =>
                                            push({
                                              attribute: "",
                                              attributeValue: "",
                                            })
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
                      )}

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

export default EditProducts;
