import React from "react";

const ItemInput = ({value, type="text",handleSpecValue,field}) => {
  return (
    <>
      <input
        type={type}
        value={value}
        onChange={(e) => handleSpecValue({field}, e.target.value)}
        name={field}
        id={`spec_${data.product_id}_size`}
        placeholder="Size"
      />
    </>
  );
};

export default ItemInput;
