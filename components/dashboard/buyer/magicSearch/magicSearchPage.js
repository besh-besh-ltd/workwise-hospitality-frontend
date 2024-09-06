import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import Link from 'next/link'
import React from 'react'

function magicSearchPage() {
    return (
        <>
            <section className="vendor-common-header sc-pt-80">
                <div className="container-fluid  text-center">
                    <h1 className="heading">Magic Search</h1>
                    <Link
                        href="/products"
                        className="page-link backBtn"
                    >
                        {" "}
                        <FontAwesomeIcon icon={faArrowLeft} /> Go back
                    </Link>
                </div>
            </section>


            <section className="search-sec-1">
                <div className="container-fluid product-search">
                    <div className="row">
                        <div className="col-md-12">

                            <input type="file" accept=".xlsx, .xls" />

                        </div>
                    </div>
                </div>
            </section>

            <section className="search-sec-2">
                <div className="container-fluid">
                    <textarea rows="3" />
                </div>
            
            <div className="btn btn-secondary mt-0 mb-0"> Submit</div>


            </section>


        </>
    )
}

export default magicSearchPage