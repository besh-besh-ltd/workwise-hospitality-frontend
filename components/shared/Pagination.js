import React from 'react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleLeft, faAngleDoubleRight } from '@fortawesome/free-solid-svg-icons';


const Pagination = ({ limit, totalData, page, setPage, setLimit }) => {

    const totalPages = Math.ceil(totalData / limit);

    // Helper to generate pagination numbers based on current page
    const getPaginationNumbers = () => {
        let pages = [];
        if (totalPages <= 5) {
            // Show all pages if total is less than or equal to 5
            pages = [...Array(totalPages).keys()].map(i => i + 1);
        } else {
            // Show pagination with '...'
            if (page <= 4) {
                pages = [1, 2, 3, 4, '...'];
            } else if (page >= totalPages - 3) {
                pages = ['...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
            } else {
                pages = [page-3, page-2, page - 1, page, '...'];
            }
        }
        return pages;
    };


    return (
        <div className="table-footer row">
            <div className='col-md-6 col-lg-4 d-flex text-md-center text-lg-start mb-2'>
                <span className='my-auto'>Showing {`${((page - 1) * 10) + 1}-${page * 10 < totalData ? page * 10 : totalData}`} of {totalData} results</span>
            </div>
            {/* <div className='col-md-6 col-lg-3 mb-2'>
                <label htmlFor="pageLimit">Rows Per Page</label>
                <select name="pageLimit" id="pageLimit" value={limit} onChange={(e)=> setLimit(e.target.value)}>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                </select>
            </div> */}
            <div className="pagination col-md-12 col-lg-8 justify-content-md-center justify-content-lg-end mb-2">
                <ul>
                    <li
                        className={page <= 1 ? 'disabled-pagination' : ''}
                        onClick={() => setPage(page > 1 ? page - 1 : 1)}
                    >
                        <FontAwesomeIcon icon={faAngleDoubleLeft} />
                        Previous
                    </li>

                    {/* Dynamic page numbers with ellipses */}
                    {getPaginationNumbers().map((item, index) => (
                        <li
                            key={index}
                            onClick={() => typeof item === 'number' && setPage(item)}
                            className={`${item === page ? 'current' : ''} ${typeof item !== 'number' ? 'disabled-pagination' : ''}`}
                        >
                            {item}
                        </li>
                    ))}

                    <li
                        className={page >= totalPages ? 'disabled-pagination' : ''}
                        onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
                    >Next
                        <FontAwesomeIcon icon={faAngleDoubleRight} />
                    </li>
                </ul>
            </div>
        </div>
    )
}

export default Pagination
