import FullLoader from "@/components/shared/FullLoader";
import { getRFQS } from "@/services/rfq";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import RFQItem from "./Item";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleLeft, faAngleDoubleRight } from "@fortawesome/free-solid-svg-icons";

const ManageRFQ = () => {
  const [loading, setloading] = useState(false);
  const [page, setpage] = useState(1);
  const [limit, setlimit] = useState(10);
  const [myRFQs, setmyRFQs] = useState([]);
  const [totalRFQs, settotalRFQs] = useState(0);
  const [showing, setshowing] = useState(0);

  useEffect(() => {
    getAllRFQs();
  }, []);
  useEffect(() => {
    getAllRFQs();
  }, [page, limit]);

  const getAllRFQs = () => {
    setloading(true);
    getRFQS({ page, limit })
      .then((res) => {
        setloading(false);
        setmyRFQs(res.data);
        settotalRFQs(res.total_items);
        const items = page * limit;
        setshowing(items > res.total_items ? res.total_items : items);
      })
      .catch((err) => {
        setloading(false);
        console.log(err);
      });
  };

  return (
    <>
      <div className="manage-rfq-con">
        {/* Content for Manage RFQs tab */}
        <h3 className="title">Manage RFQs</h3>

        <div className="details-table hasFullLoader">

          {loading && <FullLoader />}
          {!loading && myRFQs.length == 0 && (
            <p>You haven't created any RFQs yet!</p>
          )}
          {!loading && myRFQs && myRFQs.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped ">
                <thead>
                  <tr>
                    <th>Group RFQ Code</th>
                    {/* <th>Category</th> */}
                    <th>Products</th>
                    <th>Published Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myRFQs.map((item) => {
                    return <RFQItem key={`rfq_item_${item.id}`} data={item} />;
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && myRFQs.length > 0 && (
            <div className="table-footer">
              <span>
                Showing {showing} of {totalRFQs} results
              </span>
              <div className="pagination">                
                <ul>
                  <li className={page<=1?'disabled-pagination':''} onClick={()=> setpage(page>1? page-1:1)}><FontAwesomeIcon icon={faAngleDoubleLeft}/> Previous</li>                  
                    {Array.from(Array(Math.ceil(totalRFQs / limit)), (e, i) => {
                      let currentIndex = i + 1;
                      {currentIndex}
                      if(currentIndex>=1 && currentIndex<=3 ){
                        return (
                          <li
                            onClick={() => setpage(currentIndex)}
                            className={`${currentIndex == page ? "current" : ""}`}
                            key={currentIndex}
                          >
                            {currentIndex}
                          </li>
                        );
                      }
                      if(currentIndex>3 && currentIndex<Math.ceil(totalRFQs / limit) ){
                        return(<>...</>)
                      }
                      if(currentIndex == Math.ceil(totalRFQs / limit)){
                        return (
                          <li
                            onClick={() => setpage(currentIndex)}
                            className={`${currentIndex == page ? "current" : ""}`}
                            key={currentIndex}
                          >
                            {currentIndex}
                          </li>
                        );
                      }
                    })}                   
                  
                  <li className={page>=Math.ceil(totalRFQs / limit)?'disabled-pagination':''} onClick={()=> setpage(page<Math.ceil(totalRFQs / limit)? page+1:Math.ceil(totalRFQs / limit))}>Next <FontAwesomeIcon icon={faAngleDoubleRight}/></li>
                </ul>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default ManageRFQ;
