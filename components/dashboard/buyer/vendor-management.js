import React, { useState } from 'react'

const VendorManagement = () => {
    const [loading, setLoading] = useState(false);
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(null);
    const [products, setProducts] = useState([]);

    return (
        <>
            <section className="vendor-common-header sc-pt-80">
                <div className="container-fluid">
                    <h1 className="heading">Vendor Management</h1>
                </div>
            </section>

            <section className="vendor-mngt-sec-1">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="vendor-mngt-con">
                                {/* Content for Manage RFQs tab */}
                                <span className="title">Add New Vendors</span>


                                {/* <div className="action-btm"> */}
                                {/* <button className="btn dummy-excel">Search</button> */}
                                {/* </div> */}
                                <div className="filter">
                                    {/* {!enableBulkUpload && (

                                        <div className="row ">
                                            <div className="col-5">
                                                <div className="d-flex">
                                                    <Link
                                                        href="add-products"
                                                        className="btn btn-secondary d-flex align-items-center justify-content-center "
                                                    >
                                                        Add Single Product
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary d-flex flex-column justify-content-center align-items-center"
                                                        onClick={() => {
                                                            setuploadProgress(0);
                                                            setEnableBulkUpload(!enableBulkUpload);
                                                        }}
                                                    >
                                                        Add Bulk Products
                                                        <span className="text-sm">(By Uploading Excel File)</span>
                                                    </button>
                                                </div>


                                                <div className="row mt-1">
                                                    <div className="col"></div>
                                                    <a
                                                        title="Download this sample Excel and fill all the mandatory red columns."
                                                        className="col d-flex justify-content-center align-items-center gap-1 p-0 me-3 "
                                                        href={
                                                            "http://143.110.242.57:8112/user_document/1716462955635-82ae96ef-559e-4d17-82a6-16cbcf3d02fb.xlsx"
                                                        }
                                                    //   target="_blank"
                                                    >
                                                        <span className="text-sm download-sample-excel-text">Download Sample Excel Format</span>
                                                        <span>
                                                            <Image
                                                                src="/assets/images/download-icon.png"
                                                                alt="Workwise"
                                                                width={13}
                                                                height={13}
                                                                priority={true}
                                                            />
                                                        </span>
                                                    </a>
                                                </div>


                                            </div>
                                        </div>
                                    )}
                                    {enableBulkUpload && (
                                        <div className="row">
                                            <div className="col-md-8">
                                                <div className="input-group buyers-search">
                                                    <input
                                                        type="file"
                                                        className="form-control"
                                                        name="file"
                                                        accept=".xlsx"
                                                        onChange={uploadToClient}
                                                    />
                                                </div>
                                                <div className="d-flex mt-4 col-md-4">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary mr-2"
                                                        onClick={() => uploadToServer()}
                                                    >
                                                        Upload .xlsx
                                                    </button>
                                                    <div className="d-flex justify-content-end col-md-4">
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary mr-2"
                                                            onClick={() => {
                                                                setFile(null);
                                                                setuploadProgress(0);
                                                                setEnableBulkUpload(false);
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                                {file && (
                                                    <div
                                                        className={`progress mt-4 progress-${uploadProgress}`}
                                                    >
                                                        <div
                                                            className="progress-bar progress-bar-striped progress-bar-animated"
                                                            role="progressbar"
                                                            style={{ width: `${uploadProgress}%` }}
                                                            aria-valuenow={uploadProgress}
                                                            aria-valuemin="0"
                                                            aria-valuemax="100"
                                                        >{`${uploadProgress}%`}</div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-md-4"></div>
                                        </div>
                                    )} */}
                                </div>

                                <span className="title pt-5 pb-2">Your vendors List</span>
                                <div className="details-table p-4 ">
                                    {loading && <Loader />}

                                    <div className="table-responsive">
                                        <table className="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th scope="col">Name of product</th>
                                                    <th scope="col">Product Status</th>
                                                    <th scope="col">Category</th>
                                                    <th scope="col">Sub Category</th>
                                                    <th scope="col">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {products &&
                                                    products.map((item) => {
                                                        return (
                                                            <>
                                                                <tr key={item.id}>
                                                                    <td>
                                                                        <input
                                                                            type="checkbox"
                                                                            name="select_product"
                                                                            checked={item.isChecked}
                                                                            value=""
                                                                            onClick={(e) => selectProduct(e, item)}
                                                                        />
                                                                    </td>
                                                                    <td>{item.name}</td>
                                                                    <td>
                                                                        {item.is_approve == 1
                                                                            ? "Active"
                                                                            : "Inactive"}
                                                                    </td>
                                                                    <td className="subcatstd">
                                                                        <span className="badge badge-warning">
                                                                            {item.product_categories.length > 0
                                                                                ? item.product_categories[0]
                                                                                    .category_name
                                                                                : "-"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="subcatstd">
                                                                        {getSubCats(item)}
                                                                    </td>
                                                                    <td>
                                                                        <span className="me-2">
                                                                            <FontAwesomeIcon icon={faEdit} />
                                                                        </span>
                                                                        <span
                                                                            role="button"
                                                                            className="cursor-pointer"
                                                                            onClick={() => handleUpdateProducts(item)}
                                                                        >
                                                                            Edit
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            </>
                                                        );
                                                    })}
                                                {products.length == 0 && (
                                                    <tr>
                                                        <td colSpan="6">No products found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="pagination">
                                        {Math.ceil(totalPages / limit) > 1 && (
                                            <>
                                                <div
                                                    className="arrow-prev"
                                                    onClick={() => {
                                                        setPage((prevState) => {
                                                            return prevState - 1;
                                                        });
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={faChevronLeft} />
                                                </div>
                                                <div
                                                    className="arrow-next"
                                                    onClick={() => {
                                                        setPage((prevState) => {
                                                            return prevState + 1;
                                                        });
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={faChevronRight} />
                                                </div>
                                            </>
                                        )}

                                        <span>Page</span>
                                        <input type="number" min={1} max={totalPages} value={page} onChange={()=> {}} />
                                        <span> of {totalPages}</span>
                                    </div>
                                    {/* <Pagination pageNo={page} totalPages={totalPages} /> */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}

export default VendorManagement;
