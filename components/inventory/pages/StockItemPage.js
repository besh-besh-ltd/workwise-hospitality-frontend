import React from "react";
import ItemCard from "@/components/inventory/stock/ItemCard";

// /dashboard/buyer/inventory/stock/[hotelId]/[itemId] (the route waits for the router).
const StockItemPage = ({ hotelId, itemId }) => (
  <ItemCard key={`${hotelId}/${itemId}`} hotelId={hotelId} invItemId={itemId} />
);

export default StockItemPage;
