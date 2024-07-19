import React, { useEffect, useState } from "react";
import Link from "next/link";
import { faEye } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { useRouter } from "next/router";
import { getRFQById } from "@/services/rfq";
import ViewRFQ from "./manageRFQ/ViewRFQ";

const RfqManagementDetails = () => {
  const router = useRouter();
  const [rfqDetails, setrfqDetails] = useState('')
  const {rfqId} = router.query
  useEffect(() => {
    if(rfqId && rfqId!= ''){
      getRFQById(rfqId).then(res=>{
        setrfqDetails(res.data)
      }).catch(()=>{})
    }
  }, [router])
  
  return (
    <ViewRFQ data={rfqDetails}/>
  );
};

export default RfqManagementDetails;
