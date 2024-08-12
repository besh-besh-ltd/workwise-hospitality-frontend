import React from 'react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAnglesLeft,
  faAnglesRight
} from "@fortawesome/free-solid-svg-icons";

const Pagination = ({pageNo, totalPages, changePage, goToPrevPage, goToNextPage}) => {
    const arr = [1,2,3,4,5]
    return (
        <div className="d-flex align-items-center justify-content-center" >
            <button className="py-2 px-4" disabled={pageNo === 1} onClick={goToPrevPage}>
                <FontAwesomeIcon icon={faAnglesLeft} size={20} />
            </button>
            {
                arr.map((_, index) => {
                    return (
                        <button key={index} className={`${index+1 === pageNo ? 'bg-indigo-600 text-white' : 'ring-1 ring-inset ring-gray-300 hover:bg-gray-100'}  font-bold py-2 px-4 `} data-pageno={index+1} onClick={changePage}>
                            {index + 1}
                        </button>
                    )
                })
            }
            <button className="font-bold py-2 px-4" disabled={pageNo >= totalPages} onClick={goToNextPage}>
                <FontAwesomeIcon icon={faAnglesRight} size={20} />
            </button>

        </div>
    )
}

export default Pagination
