import React, { useEffect, useState } from "react";
import BuyerVendorChat from "@/components/dashboard/buyer/technical-evaluation/buyerVendorChat";
import {
  getAllComments
} from "@/services/rfq";
const VendorResponseTable = ({ vendor, id, name }) => {
  const [showMessages, setShowMessages] = useState(false);
  const [isModelOpen, setIsModalOpen] = useState(false);
  const [currentUserProfile, setcurrentUserProfile] = useState(null);
  const [allComments,setAllComments] = useState([]);
  console.log("vendor from vrt = ",vendor,"id",id);
  const [clauseId,setClauseId] = useState(null);
  const handleOpenChat = (clause_id) => {
    setShowMessages(!showMessages);
    getAllComments(clause_id).then((res) => {
      const apiResponse = res.data;
      setAllComments(apiResponse);
    })
    setClauseId(clause_id)

  }

 
  

  // const getCurrentUserProfile = async () => {
  //   try {
  //     const res = await getProfile();
  //     setcurrentUserProfile(res.data);
  //   } catch (error) {
  //     console.log(error)
  //   } 
  // };

  // useEffect(() => {
  //   getCurrentUserProfile();
  // }, []);

  return (
    <>
      {id === "vendor" &&
        <div>
          <section className="quote-common-header compare-received-quote sc-pt-80">
            <div className="container-fluid">
              <div className="row">
                <div className="col-md-6">
                  <h3 className="heading">Technical Evaluation</h3>
                </div>
              </div>
            </div>
          </section>
          <div>
            <div className="table-content">
              <div className="table-elements">
                <div className="table-row">
                  <div className="table-col">
                    <div className="table-si-row"></div>
                    <div className="table-si-row">Clause 1</div>
                    <div className="table-si-row">Clause 2</div>
                    <div className="table-si-row table-grey-row">Clause 3</div>
                    <div className="table-si-row">Clause 4</div>
                    <div className="table-si-row">Clause 5</div>
                    <div className="table-si-row">Clause 6</div>
                    <div className="table-si-row">Clause 7</div>
                    <div className="table-si-row">Clause 8</div>
                    <div className="table-si-row">Clause 9</div>
                    <div className="table-si-row">Clause 10</div>
                  </div>

                  <div className="table-col">
                    <div className="table-si-row table-dark-row">
                      <span>Technical Evaluation</span>
                    </div>
                    <div className="table-si-row">
                      <button
                        style={{
                          border: '1px solid lightgreen',
                          color: 'lightgreen',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          marginRight: '10px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Agree
                      </button>
                      <button
                        style={{
                          border: '1px solid lightcoral',
                          color: 'lightcoral',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Don't Agree
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        style={{
                          border: '1px solid lightgreen',
                          color: 'lightgreen',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          marginRight: '10px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Agree
                      </button>
                      <button
                        style={{
                          border: '1px solid lightcoral',
                          color: 'lightcoral',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Don't Agree
                      </button>
                    </div>
                    <div className="table-si-row table-grey-row">
                      <button
                        style={{
                          border: '1px solid lightgreen',
                          color: 'lightgreen',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          marginRight: '10px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Agree
                      </button>
                      <button
                        style={{
                          border: '1px solid lightcoral',
                          color: 'lightcoral',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Don't Agree
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        style={{
                          border: '1px solid lightgreen',
                          color: 'lightgreen',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          marginRight: '10px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Agree
                      </button>
                      <button
                        style={{
                          border: '1px solid lightcoral',
                          color: 'lightcoral',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Don't Agree
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        style={{
                          border: '1px solid lightgreen',
                          color: 'lightgreen',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          marginRight: '10px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Agree
                      </button>
                      <button
                        style={{
                          border: '1px solid lightcoral',
                          color: 'lightcoral',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Don't Agree
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        style={{
                          border: '1px solid lightgreen',
                          color: 'lightgreen',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          marginRight: '10px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Agree
                      </button>
                      <button
                        style={{
                          border: '1px solid lightcoral',
                          color: 'lightcoral',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Don't Agree
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        style={{
                          border: '1px solid lightgreen',
                          color: 'lightgreen',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          marginRight: '10px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Agree
                      </button>
                      <button
                        style={{
                          border: '1px solid lightcoral',
                          color: 'lightcoral',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Don't Agree
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        style={{
                          border: '1px solid lightgreen',
                          color: 'lightgreen',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          marginRight: '10px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Agree
                      </button>
                      <button
                        style={{
                          border: '1px solid lightcoral',
                          color: 'lightcoral',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Don't Agree
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        style={{
                          border: '1px solid lightgreen',
                          color: 'lightgreen',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          marginRight: '10px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Agree
                      </button>
                      <button
                        style={{
                          border: '1px solid lightcoral',
                          color: 'lightcoral',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Don't Agree
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        style={{
                          border: '1px solid lightgreen',
                          color: 'lightgreen',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          marginRight: '10px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Agree
                      </button>
                      <button
                        style={{
                          border: '1px solid lightcoral',
                          color: 'lightcoral',
                          backgroundColor: 'white',
                          padding: '1px 4px',
                          cursor: 'pointer',
                          borderRadius: '5px',
                        }}
                      >
                        I Don't Agree
                      </button>
                    </div>
                  </div>

                  {/* New "Messages" column */}
                  <div className="table-col">
                    <div className="table-si-row table-dark-row">
                      <span>Messages</span>
                    </div>
                    <div className="table-si-row">
                      <button
                        href="#"
                        className="text-dark-blue"
                        style={{
                          fontSize: '0.8rem',
                          padding: '5px 10px',
                          display: 'inline-block',
                          border: 'none',
                          backgroundColor: 'lightblue',
                          color: 'darkblue',
                          textDecoration: 'none',
                        }}
                        onClick={() => handleOpenChat()}
                      >
                        {showMessages === true ? 'Close Chat' : 'Open Chat '}
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        href="#"
                        className="text-dark-blue"
                        style={{
                          fontSize: '0.8rem',
                          padding: '5px 10px',
                          display: 'inline-block',
                          border: 'none',
                          backgroundColor: 'lightblue',
                          color: 'darkblue',
                          textDecoration: 'none',

                        }}
                      >
                        Open Chat
                      </button>
                    </div>
                    <div className="table-si-row table-grey-row">
                      <button
                        href="#"
                        className="text-dark-blue"
                        style={{
                          fontSize: '0.8rem',
                          padding: '5px 10px',
                          display: 'inline-block',
                          border: 'none',
                          backgroundColor: 'lightblue',
                          color: 'darkblue',
                          textDecoration: 'none',

                        }}
                      >
                        Open Chat
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        href="#"
                        className="text-dark-blue"
                        style={{
                          fontSize: '0.8rem',
                          padding: '5px 10px',
                          display: 'inline-block',
                          border: 'none',
                          backgroundColor: 'lightblue',
                          color: 'darkblue',
                          textDecoration: 'none',

                        }}
                      >
                        Open Chat
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        href="#"
                        className="text-dark-blue"
                        style={{
                          fontSize: '0.8rem',
                          padding: '5px 10px',
                          display: 'inline-block',
                          border: 'none',
                          backgroundColor: 'lightblue',
                          color: 'darkblue',
                          textDecoration: 'none',

                        }}
                      >
                        Open Chat
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        href="#"
                        className="text-dark-blue"
                        style={{
                          fontSize: '0.8rem',
                          padding: '5px 10px',
                          display: 'inline-block',
                          border: 'none',
                          backgroundColor: 'lightblue',
                          color: 'darkblue',
                          textDecoration: 'none',

                        }}
                      >
                        Open Chat
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        href="#"
                        className="text-dark-blue"
                        style={{
                          fontSize: '0.8rem',
                          padding: '5px 10px',
                          display: 'inline-block',
                          border: 'none',
                          backgroundColor: 'lightblue',
                          color: 'darkblue',
                          textDecoration: 'none',

                        }}
                      >
                        Open Chat
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        href="#"
                        className="text-dark-blue"
                        style={{
                          fontSize: '0.8rem',
                          padding: '5px 10px',
                          display: 'inline-block',
                          border: 'none',
                          backgroundColor: 'lightblue',
                          color: 'darkblue',
                          textDecoration: 'none',

                        }}
                      >
                        Open Chat
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        href="#"
                        className="text-dark-blue"
                        style={{
                          fontSize: '0.8rem',
                          padding: '5px 10px',
                          display: 'inline-block',
                          border: 'none',
                          backgroundColor: 'lightblue',
                          color: 'darkblue',
                          textDecoration: 'none',

                        }}
                      >
                        Open Chat
                      </button>
                    </div>
                    <div className="table-si-row">
                      <button
                        href="#"
                        className="text-dark-blue"
                        style={{
                          fontSize: '0.8rem',
                          padding: '5px 10px',
                          display: 'inline-block',
                          border: 'none',
                          backgroundColor: 'lightblue',
                          color: 'darkblue',
                          textDecoration: 'none',

                        }}
                      >
                        Open Chat
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            <div >
              {showMessages && <BuyerVendorChat showChat={showMessages} handleOpenChat={handleOpenChat} name="Buyer" />}
            </div>
          </div>
        </div>

      }


      {/* old table */}
      {id === "buyer" &&
          <div>
            <div className="table-content">
              <div className="table-elements">
                {/* Table Header */}
                <div className="table-row table-header">
                  <div className="table-col">
                    <div className="table-si-row ">
                      {/* <span></span> */}
                    </div>
                  </div>
                  <div className="table-col">
                    <div className="table-si-row table-dark-row">
                      <span>Technical Evaluation</span>
                    </div>
                  </div>
                  <div className="table-col">
                    <div className="table-si-row table-dark-row">
                      <span>Messages</span>
                    </div>
                  </div>
                </div>

                {/* Table Rows */}
                {vendor &&
                  vendor.length > 0 && 
                    vendor.map((vendor_response, index) => (
                  <div className="table-row" key={index}>
                    <div className="table-col">
                      <div className="table-si-row">{vendor_response.clause_text}</div>
                    </div>
                    <div className="table-col">
                      <div className="table-si-row">{vendor_response.vendor_response}</div>
                    </div>
                    <div className="table-col">
                      <div className="table-si-row">
                        <button
                          href="#"
                          className="text-dark-blue"
                          style={{
                            fontSize: "0.8rem",
                            padding: "5px 10px",
                            display: "inline-block",
                            border: "none",
                            backgroundColor: "lightblue",
                            color: "darkblue",
                            textDecoration: "none",
                          }}
                          onClick={() => handleOpenChat(vendor_response.clause_id)}
                          key={vendor_response.clause_id}
                        >
                          {showMessages === true ? "Close Chat" : "Open Chat"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              {showMessages && <BuyerVendorChat showChat={showMessages} handleOpenChat={handleOpenChat} name={name} data={allComments} clauseId = {clauseId} createdBy = "2" />}
            </div>
          </div>
        }

    </>
  );
};

export default VendorResponseTable;