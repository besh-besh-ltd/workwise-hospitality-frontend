import ProductDetailPage from '@/components/products/utils/ProductDetailPage'
import React from 'react'
import { useRouter } from "next/router";


const ProductDetail = () => {
  const router = useRouter()
  const { productSlug } = router.query;

  return (
    <div className="p-10"   style={{ paddingTop: "100px"}}>

      <ProductDetailPage pageSlug={productSlug} />
    </div>
  )
}

export default ProductDetail
