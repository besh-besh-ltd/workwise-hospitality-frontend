import { renderFileLink } from "@/utils/elementFunctions";
import { faCloudArrowUp, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


const ReviewProducts = ({ data, changeFormData }) => {

    const handleChange = (type, e) => {
        const { name, value } = e.target;
        changeFormData(type, name, value);
    }

    return (
        <>
            {data &&
                data.map((prodItem) => {
                    let tempSpec = {};
                    prodItem.spec?.map((specItem) => {
                        tempSpec[specItem.title] = specItem.value
                    })

                    return (
                        <div key={`prod_item${prodItem.product_id}_${prodItem.variant}`} className="border border-2 rounded-3 mb-2 p-2">
                            <div className="d-flex justify-content-between align-items-center   ">
                                <h2 className="h6 mb-0">Product Name: {prodItem.name}</h2>
                                <button type="button" className="btn btn-danger btn-sm" style={{ padding: "0.25rem 0.5rem", width: "130px" }}>
                                    <FontAwesomeIcon icon={faTrash} className="me-2" />
                                    Remove
                                </button>
                            </div>
                            <hr style={{ margin: "8px 0" }} />

                            <div className="row">
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
                                                onChange={(e) => handleChange('spec', e)}
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
                                                onChange={(e) => handleChange('spec', e)}
                                                className="form-control text-sm opacity-75 "
                                            />
                                        </div>
                                        <div className="col-6 mb-2">
                                            <label htmlFor={`qty_${prodItem.product_id}_${prodItem.variant}`} className="form-label small mb-1 ">Product Quantity <span>*</span></label>
                                            <input
                                                type="text"
                                                name="Quantity"
                                                id={`qty_${prodItem.product_id}_${prodItem.variant}`}
                                                value={tempSpec?.Quantity}
                                                required
                                                onChange={(e) => handleChange('spec', e)}
                                                className="form-control text-sm opacity-75 "
                                            />
                                        </div>
                                        <div className="col-6 mb-2">
                                            <label htmlFor={`unit_${prodItem.product_id}_${prodItem.variant}`} className="form-label small mb-1 ">Product Unit <span>*</span></label>
                                            <input
                                                type="text"
                                                name="Unit"
                                                id={`unit_${prodItem.product_id}_${prodItem.variant}`}
                                                value={tempSpec?.Unit}
                                                required
                                                onChange={(e) => handleChange('spec', e)}
                                                className="form-control text-sm opacity-75 "
                                            />
                                        </div>
                                    </div>

                                </div>

                                {/* File Section */}
                                <div className="col-sm-12 col-md-6 col-lg-4 pe-0">
                                    <div className="mb-2">
                                        <label htmlFor={`files_${prodItem.product_id}_${prodItem.variant}`} className="form-label small mb-1 ">Files Section</label>
                                        <div className="form-control " id={`vendor_list_${prodItem.product_id}_${prodItem.variant}`} style={{ height: "15rem" }}>

                                            <div className="d-flex align-items-center text-sm opacity-75">
                                                <input type="checkbox" name="predefined_tds" id="predefined_tds" className="me-2" />
                                                <span className="me-2">Predefined TDS File: </span>
                                                <span className="text-sm">{prodItem.predefined_tds_file ? renderFileLink(prodItem.predefined_tds_file) : "No TDS file found"}</span>
                                            </div>

                                            <div className="d-flex align-items-center text-sm opacity-75">
                                                <input type="checkbox" name="predefined_qap" id="predefined_qap" className="me-2" />
                                                <span className="me-2">Predefined QAP File: </span>
                                                <span className="text-sm">{prodItem.predefined_qap_file ? renderFileLink(prodItem.predefined_qap_file) : "No QAP file found"}</span>
                                            </div>

                                            <div className="row my-2">
                                                <div className="col-4 d-flex justify-content-center border-end-1">
                                                    <button type="button" className="upload uploadInlineFile d-flex align-items-center justify-content-center" style={{ padding: "0.25rem 0.5rem", width: "100px" }}>
                                                        <FontAwesomeIcon icon={faCloudArrowUp} className="me-2" />
                                                        Spec
                                                    </button>
                                                </div>
                                                <div className="col-4 d-flex justify-content-center border-end-1">
                                                    <button type="button" className="upload uploadInlineFile d-flex align-items-center justify-content-center" style={{ padding: "0.25rem 0.5rem", width: "100px" }}>
                                                        <FontAwesomeIcon icon={faCloudArrowUp} className="me-2" />
                                                        TDS
                                                    </button>
                                                </div>
                                                <div className="col-4 d-flex justify-content-center">
                                                    <button type="button" className="upload uploadInlineFile d-flex align-items-center justify-content-center" style={{ padding: "0.25rem 0.5rem", width: "100px" }}>
                                                        <FontAwesomeIcon icon={faCloudArrowUp} className="me-2" />
                                                        QAP
                                                    </button>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>

                                {/* Comment, Vendor List Section */}
                                <div className="col-sm-12 col-md-6 col-lg-4 ">
                                    <div className="mb-2">
                                        <label htmlFor={`cmnt_${prodItem.product_id}_${prodItem.variant}`} className="form-label small mb-1 ">Product Comments</label>
                                        <textarea
                                            style={{ width: "100%" }}
                                            rows={4}
                                            name="Comment"
                                            id={`cmnt_${prodItem.product_id}_${prodItem.variant}`}
                                            value={prodItem.comment}
                                            className="form-control text-sm opacity-75"
                                        />
                                    </div>
                                    <div className="mb-2">
                                        <label htmlFor={`vendor_list_${prodItem.product_id}_${prodItem.variant}`} className="form-label small mb-1 ">Vendor List</label>
                                        <div className="form-control overflow-y-auto" id={`vendor_list_${prodItem.product_id}_${prodItem.variant}`} style={{ height: "6.5rem" }}>
                                            {prodItem.vendors?.map((vendor) => {
                                                console.log(vendor)
                                                return (
                                                    <span key={vendor.user_id} className="badge text-bg-success fw-normal me-2 mb-2">{vendor.name}</span>
                                                )
                                            })}
                                        </div>
                                    </div>

                                </div>

                            </div>
                        </div>
                    )
                })
            }
        </>
    );
}

export default ReviewProducts;