import Accordion from 'react-bootstrap/Accordion';
import FileLink from "@/components/shared/FileLink";
import { faClose, faCloudArrowUp, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Select from 'react-select';

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
    globalFilters, vendorMap, setVendorMap, cities, states }) => {

    const [localFilterMap, setLocalFilterMap] = useState(new Map());

    const updateVendorList = () => {
        const vMap = new Map();

        for (const prodItem of data) {
            const prodKey = `prod_${prodItem.product_id}_${prodItem.variant}`;
            let updatedVendors = prodItem.vendors || [];

            const filter = localFilterMap.get(prodKey);
            if (filter?.is_private?.value == 1) {
                updatedVendors = updatedVendors.filter(
                    (vendorItem) => vendorItem.is_private == 1
                );
            }
            if (filter?.city) {
                updatedVendors = updatedVendors.filter(
                    (vendorItem) => vendorItem.city_name === filter.city.label
                );
            }
            if (filter?.state) {
                updatedVendors = updatedVendors.filter(
                    (vendorItem) => vendorItem.state_name === filter.state.label
                );
            }
            vMap.set(prodKey, updatedVendors)
        }
        setVendorMap(vMap);
    }

    const handleLocalFilterChange = (prodKey, selectedOption, actionMeta) => {
        const fMap = new Map(localFilterMap);
        let filters = fMap.get(prodKey);
        fMap.set(prodKey, {
            ...filters,
            [actionMeta.name]: selectedOption
        })
        setLocalFilterMap(fMap);
    }

    useEffect(()=> {
        updateVendorList();
    }, [localFilterMap]);

    useEffect(() => {
        setLocalFilterMap((prevState) => {
            const lFMap = new Map(prevState);
            for (const [key, value] of lFMap.entries()) {
                lFMap.set(key, globalFilters);
            }
            return lFMap;
        })
    }, [globalFilters]);

    useEffect(() => {
        const lMap = new Map();
        const vMap = new Map();

        data.forEach((prodItem) => {
            const prodKey = `prod_${prodItem.product_id}_${prodItem.variant}`;
            vMap.set(prodKey, prodItem.vendors);

            lMap.set(prodKey, {
                city: null,
                state: null,
                is_private: { label: "All Vendors", value: 0 },
            });
        });

        setLocalFilterMap(lMap);
        setVendorMap(vMap);
    }, [data]);


    return (
        <Accordion flush>
            {data &&
                data.map((prodItem, index) => {
                    let tempSpec = {};
                    prodItem.spec?.map((specItem) => {
                        tempSpec[specItem.title] = specItem.value
                    })
                    const prodKey = `prod_${prodItem.product_id}_${prodItem.variant}`;

                    return (
                        <Accordion.Item key={prodKey} eventKey={index} className="border-0">
                            <div className="border border-2 rounded-3 mb-2 p-2">
                                <Accordion.Header>
                                    <h2 className="h6 mb-0">Product Name: {prodItem.name}</h2>
                                </Accordion.Header>

                                <Accordion.Body className="row py-0">
                                    <hr style={{ margin: "8px 0" }} />

                                    <div className="row px-0 my-2">
                                        <div className="col-md-5"></div>
                                        <div className="col-12 col-md-7 px-0">
                                            <div className="row">
                                                <div className="col-md-4">
                                                    <Select
                                                        name="city"
                                                        options={cities}
                                                        styles={customeStyles}
                                                        value={localFilterMap.get(prodKey)?.city}
                                                        placeholder="Select City"
                                                        isClearable
                                                        isSearchable
                                                        onChange={
                                                            (selectedOption, actionMeta) =>
                                                                handleLocalFilterChange(prodKey, selectedOption, actionMeta)
                                                        }
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <Select
                                                        name="state"
                                                        options={states}
                                                        styles={customeStyles}
                                                        value={localFilterMap.get(prodKey)?.state}
                                                        placeholder="Select State"
                                                        isClearable
                                                        isSearchable
                                                        onChange={
                                                            (selectedOption, actionMeta) =>
                                                                handleLocalFilterChange(prodKey, selectedOption, actionMeta)
                                                        }
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <Select
                                                        options={[
                                                            { label: "All Vendors", value: 0 },
                                                            { label: "Private Vendors", value: 1 }
                                                        ]}
                                                        styles={customeStyles}
                                                        value={localFilterMap.get(prodKey)?.is_private}
                                                        onChange={
                                                            (selectedOption, actionMeta) =>
                                                                handleLocalFilterChange(prodKey, selectedOption, actionMeta)
                                                        }
                                                        name="is_private"
                                                        placeholder="Select"
                                                        isClearable={false}
                                                        isSearchable
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Spec, Size, Quantity, Unit Section */}
                                    <div className="col-sm-12 col-md-6 col-lg-4 pe-0">
                                        <div className="row">
                                            <div className="col-12 mb-2">
                                                <label htmlFor={`spec_${prodItem.product_id}_${prodItem.variant}`} className="form-label small mb-1 ">Product Specification</label>
                                                <textarea
                                                    style={{ width: "100%" }}
                                                    rows={4}
                                                    name="Spec"
                                                    id={`spec_${prodItem.product_id}_${prodItem.variant}`}
                                                    value={tempSpec?.Spec}
                                                    onChange={(e) => changeProductData('spec', e, prodItem)}
                                                    className="form-control text-sm opacity-75"
                                                />
                                            </div>
                                            <div className="col-12 mb-2">
                                                <label htmlFor={`size_${prodItem.product_id}_${prodItem.variant}`} className="form-label small mb-1 ">Product Size</label>
                                                <input
                                                    type="text"
                                                    name="Size"
                                                    id={`size_${prodItem.product_id}_${prodItem.variant}`}
                                                    value={tempSpec?.Size}
                                                    onChange={(e) => changeProductData('spec', e, prodItem)}
                                                    className="form-control text-sm opacity-75 "
                                                />
                                            </div>
                                            <div className="col-6 mb-2">
                                                <label htmlFor={`qty_${prodItem.product_id}_${prodItem.variant}`} className="form-label small mb-1 ">Product Quantity <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    name="Quantity"
                                                    id={`qty_${prodItem.product_id}_${prodItem.variant}`}
                                                    value={tempSpec?.Quantity}
                                                    required
                                                    onChange={(e) => changeProductData('spec', e, prodItem)}
                                                    className="form-control text-sm opacity-75 "
                                                />
                                            </div>
                                            <div className="col-6 mb-2">
                                                <label htmlFor={`unit_${prodItem.product_id}_${prodItem.variant}`} className="form-label small mb-1 ">Product Unit <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    name="Unit"
                                                    id={`unit_${prodItem.product_id}_${prodItem.variant}`}
                                                    value={tempSpec?.Unit}
                                                    required
                                                    onChange={(e) => changeProductData('spec', e, prodItem)}
                                                    className="form-control text-sm opacity-75 "
                                                />
                                            </div>
                                        </div>

                                    </div>

                                    {/* Files and Comment Section */}
                                    <div className="col-sm-12 col-md-6 col-lg-4 pe-0">
                                        <div className="mb-2">
                                            <label htmlFor={`files_${prodItem.product_id}_${prodItem.variant}`} className="form-label small mb-1 ">Files Section</label>
                                            <div className="form-control " id={`vendor_list_${prodItem.product_id}_${prodItem.variant}`} style={{ height: "8rem" }}>

                                                <div className="row my-2">
                                                    <div className="col-4">
                                                        <label htmlFor={`spec_file${prodItem.product_id}_${prodItem.variant}`} className="upload uploadInlineFile d-flex justify-content-center align-items-center p-1 ">
                                                            <FontAwesomeIcon icon={faCloudArrowUp} className="me-2" />
                                                            Spec
                                                            <input
                                                                type="file"
                                                                id={`spec_file${prodItem.product_id}_${prodItem.variant}`}
                                                                accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                                                onChange={(e) => handleFiles("spec_file", e, prodItem, false)}
                                                                style={{ padding: "0.25rem 0.5rem", width: "100px" }}
                                                            />
                                                        </label>
                                                        <FileLink
                                                            Files={prodItem.spec_file}
                                                            RemoveFile={(type, fileLink) => handleFiles(type, null, prodItem, true, fileLink)}
                                                            FileType='spec_file'
                                                        />
                                                    </div>
                                                    <div className="col-4 ">
                                                        <label htmlFor={`datasheet_file${prodItem.product_id}_${prodItem.variant}`} className="upload uploadInlineFile d-flex justify-content-center align-items-center p-1 ">
                                                            <FontAwesomeIcon icon={faCloudArrowUp} className="me-2" />
                                                            TDS
                                                            <input
                                                                type="file"
                                                                id={`datasheet_file${prodItem.product_id}_${prodItem.variant}`}
                                                                accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                                                onChange={(e) => handleFiles("datasheet_file", e, prodItem, false)}
                                                                style={{ padding: "0.25rem 0.5rem", width: "100px" }}
                                                            />
                                                        </label>
                                                        <FileLink
                                                            Files={prodItem.datasheet_file}
                                                            RemoveFile={(type, fileLink) => handleFiles(type, null, prodItem, true, fileLink)}
                                                            FileType='datasheet_file'
                                                        />
                                                    </div>
                                                    <div className="col-4 ">
                                                        <label htmlFor={`qap_file${prodItem.product_id}_${prodItem.variant}`} className="upload uploadInlineFile d-flex justify-content-center align-items-center p-1 ">
                                                            <FontAwesomeIcon icon={faCloudArrowUp} className="me-2" />
                                                            QAP
                                                            <input
                                                                type="file"
                                                                id={`qap_file${prodItem.product_id}_${prodItem.variant}`}
                                                                accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                                                onChange={(e) => handleFiles("qap_file", e, prodItem, false)}
                                                                style={{ padding: "0.25rem 0.5rem", width: "100px" }}
                                                            />
                                                        </label>
                                                        <FileLink
                                                            Files={prodItem.qap_file}
                                                            RemoveFile={(type, fileLink) => handleFiles(type, null, prodItem, true, fileLink)}
                                                            FileType='qap_file'
                                                        />
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                        <div className="mb-2">
                                            <label htmlFor={`cmnt_${prodItem.product_id}_${prodItem.variant}`} className="form-label small mb-1 ">Product Comment</label>
                                            <textarea
                                                style={{ width: "100%" }}
                                                rows={3}
                                                name="comment"
                                                id={`cmnt_${prodItem.product_id}_${prodItem.variant}`}
                                                value={prodItem.comment}
                                                onChange={(e) => changeProductData('comment', e, prodItem)}
                                                className="form-control text-sm opacity-75"
                                            />
                                        </div>
                                    </div>

                                    {/* Vendor List Section */}
                                    <div className="col-sm-12 col-md-6 col-lg-4 flex-grow-1 ">
                                        <div className="mb-2 h-100">
                                            <label htmlFor={`vendor_list_${prodItem.product_id}_${prodItem.variant}`} className="form-label small mb-1 ">Vendor List</label>
                                            <div
                                                className="form-control overflow-y-auto"
                                                id={`vendor_list_${prodItem.product_id}_${prodItem.variant}`}
                                                style={{ height: "15.3rem", maxHeight: "15.3rem" }}
                                            >
                                                {vendorMap && vendorMap.get(prodKey)?.map((vendor) => {
                                                    return (
                                                        <span key={vendor.user_id} className="badge fw-normal me-2 mb-2" style={{ backgroundColor: "var(--secondary-color)", color: "#fff" }}>
                                                            <Link
                                                                href={`/vendor/vendor-profile?id=${vendor.user_id}`}
                                                                target='_blank'
                                                                className="text-white"
                                                            >
                                                                {vendor.name}
                                                            </Link>
                                                            <FontAwesomeIcon icon={faClose} className="ms-2" onClick={() => removeItem("vendor", prodItem, vendor.user_id)} />
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-end my-2" >
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            style={{ padding: "0.25rem 0.5rem", width: "130px" }}
                                            onClick={() => removeItem("product", prodItem)}
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="me-2" />
                                            Remove
                                        </button>
                                    </div>

                                </Accordion.Body>
                            </div>
                        </Accordion.Item>
                    )
                })
            }
        </Accordion>
    );
}

export default ReviewProducts;