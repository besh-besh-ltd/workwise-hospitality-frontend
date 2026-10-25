import React, { useCallback } from "react";
import { useRouter } from "next/router";
import ReceivePage from "@/components/inventory/receive/ReceivePage";

// /dashboard/buyer/inventory/receive/[poId]?hotelId=&dispatch=
// The picked hotel is written back to the URL (shallow) so a refresh keeps it.
const ReceivePoPage = ({ poId, hotelId, dispatch }) => {
  const router = useRouter();
  const onHotelChange = useCallback(
    (id) => {
      router.replace({ pathname: router.pathname, query: { ...router.query, hotelId: id } }, undefined, { shallow: true });
    },
    [router]
  );
  return (
    <ReceivePage
      key={poId}
      poId={poId}
      initialHotelId={hotelId}
      dispatchId={dispatch || null}
      onHotelChange={onHotelChange}
    />
  );
};

export default ReceivePoPage;
