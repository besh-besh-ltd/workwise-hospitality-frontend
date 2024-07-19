import React from "react";
import SearchPage from "@/components/dashboard/vendor/search";
import Head from "next/head";


const Products = () => {
  return (
    <>
      <Head>
        <title>Workwise | Search Page</title>
      </Head>
      <SearchPage title="Search vendors" type="products" />
    </>
  );
};

export default Products;
