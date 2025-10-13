import React, { useEffect, useState } from 'react';
import Slider from 'react-slick';
import Link from 'next/link';
import { getRandomProducts } from '@/services/products';

const RandomProductsCarousel = ({ className = '' }) => {
  const [randomProducts, setRandomProducts] = useState([]);
  const [randomLoading, setRandomLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setRandomLoading(true);
    getRandomProducts()
      .then((rsp) => {
        const data = rsp?.data ?? rsp;
        const arr = Array.isArray(data) ? data : data?.data ?? [];
        if (mounted) setRandomProducts(arr);
      })
      .catch((e) => {
        console.error('Error fetching random products', e);
        if (mounted) setRandomProducts([]);
      })
      .finally(() => {
        if (mounted) setRandomLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (randomLoading) return <p className="text-center">Loading products...</p>;
  if (!randomProducts || randomProducts.length === 0) return null;

  return (
    <div className={className}>
      <h3 className="fw-bold text-center mb-3">You may also be interested in</h3>
      <Slider
        dots={false}
        infinite={true}
        speed={500}
        slidesToShow={4}
        slidesToScroll={1}
        responsive={[
          { breakpoint: 992, settings: { slidesToShow: 3 } },
          { breakpoint: 768, settings: { slidesToShow: 2 } },
          { breakpoint: 480, settings: { slidesToShow: 1 } },
        ]}
      >
        {randomProducts.map((p) => (
          <div key={p.id || p.slug} className="p-2">
            <div className="card h-100 p-3 text-center">
              <Link href={`/vendor/${p.slug || p.name || ''}`}>
                <>
                  <h6 className="mb-2 text-truncate">{p.name || p.title || p.slug}</h6>
                  <p className="small text-muted">{p.sku || ''}</p>
                </>
              </Link>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default RandomProductsCarousel;
