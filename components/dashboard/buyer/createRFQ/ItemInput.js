import React from "react";

// `data` was referenced in the id below but never declared as a prop, so this
// component threw `ReferenceError: data is not defined` on its first render.
// Nothing imports it today, which is the only reason that never surfaced.
// Optional chaining keeps the id stable if a future caller omits `data`.
const ItemInput = ({value, type="text",handleSpecValue,field,data}) => {
  return (
    <>
      <input
        type={type}
        value={value}
        onChange={(e) => handleSpecValue({field}, e.target.value)}
        name={field}
        id={`spec_${data?.product_id}_size`}
        placeholder="Size"
      />
    </>
  );
};

export default ItemInput;
