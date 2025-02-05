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
      <div className="px-4" style={{marginTop:"30px"}} >
        <h2
          style={{
            fontSize: "32px",
            fontWeight: "700",
            textAlign: "center",
            marginTop: "50px",
          }}
        >
          Trusted by industry, proven by results
        </h2>

        <div className="d-flex justify-content-center flex-wrap gap-4 align-items-center  " style={{width:"fit-content",  marginTop:"20px", margin:'auto'  }} >
          {dataObj?.map((item) => (
            <div className=" d-flex justify-content-center  align-items-center flex-column " style={{background:"#DEE8F9", width:"160px", height:"130px", padding:"0px 12.668px", borderRadius:"10px" }} >
              <p className="mb-0 text-center" style={{color:"#305BA6", fontSize:"25px", fontWeight:"700" }}  > {item.value} </p>
              <p className="mb-0 text-center " style={{fontSize:"18px", fontWeight:"600"   }} > {item.msg} </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
