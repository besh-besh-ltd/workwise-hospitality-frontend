import React from "react";

const dataObj = [
  { msg: "procurement completed", value: "332 Cr." },
  { msg: "saved", value: "21 Cr." },
  { msg: "happy customers", value: "25" },
  { msg: "PSU approved vendors", value: "10,000+" },
];

export default function SecondSection() {
  return (
    <>
      <div className="px-4 " style={{margin:"30px 0px 0px 0px"}} >
        <h2 className="fw-bold text-center header-text">
          Trusted by industry, proven by results
        </h2>

        <div
          className="d-flex justify-content-center flex-wrap gap-lg-4 gap-2 align-items-center"
          style={{
            width: "fit-content",
            margin: "auto",
            marginTop: "20px",
          }}
        >
          {dataObj?.map((item, index) => (
            <div
              key={index}
              className="d-flex justify-content-center align-items-center flex-column card-box"
            >
              <p
                className="mb-0 text-center"
                style={{
                  color: "#305BA6",
                  fontSize: "25px",
                  fontWeight: "700",
                }}
              >
                {item.value}
              </p>
              <p
                className="mb-0 text-center"
                style={{ fontSize: "18px", fontWeight: "600" }}
              >
                {item.msg}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Inline CSS for Media Query */}
      <style>
        {`

          .card-box{
           background: #DEE8F9;
            width: 160px ;
            height: 130px ;
            padding: 12px;
            border-radius: 10px;
          }

          @media (max-width: 768px) {
            .header-text {
              font-size: 32px; /* Smaller header on small screens */
            }
          
            .card-box p:first-child {
              font-size: 20px !important; /* Reduce number font size */
            }
            .card-box p:last-child {
              font-size: 14px !important; /* Reduce text font size */
            }
          }

          @media (max-width: 480px) {

          .header-text{
          font-size:28px !important;
          }

          .card-box{
           width: 155px;
            height: 100px !important;
          }
          }
        `}
      </style>
    </>
  );
}
