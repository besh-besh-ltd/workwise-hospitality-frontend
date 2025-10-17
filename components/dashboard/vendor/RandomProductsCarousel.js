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
    return () => {
      mounted = false;
    };
  }, []);

  if (randomLoading) return <p className="text-center text-muted">Loading products...</p>;
  if (!randomProducts || randomProducts.length === 0) return null;

  return (
    <div className={`mt-5 ${className}`}>
      <h3 className="fw-bold text-center mb-4 text-primary">
        You may also be interested in
      </h3>

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
            <div
              className="card h-100 p-3 text-center border-2 rounded-4 shadow-sm transition-all"
              style={{
                borderColor: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.25s ease-in-out',
              }}
            >
              <Link
                href={`/vendor/${p.slug || p.name || ''}`}
                className="text-decoration-none text-dark"
              >
                <div
                  className="p-2"
                  style={{
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <h6 className="fw-semibold text-truncate mb-2">
                    {p.name || p.title || p.slug}
                  </h6>
                  
                </div>
              </Link>
            </div>
          </div>
        ))}
      </Slider>

      <style jsx>{`
        .card {
          background: #fff;
        }

        .card:hover {
          transform: scale(1.03);
          border-color: #0d6efd;
          background-color: #f8f9fa;
          box-shadow: 0 4px 12px rgba(13, 110, 253, 0.15);
        }

        h3 {
          letter-spacing: 0.3px;
        }
      `}</style>
    </div>
  );
};

export default RandomProductsCarousel;
