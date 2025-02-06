import React from 'react';
import Image from 'next/image';


const testimonials = [
  {
    name: "AR Shekhar",
    position: "CEO Vendor",
    text: "Workwise has completely transformed our procurement process. Their platform made it effortless to connect with reliable vendors and compare rates, all while keeping everything organized in one place. The automated rate comparisons and Excel downloads have saved us countless hours, and the comprehensive dashboard gives us real-time insights into every stage of the process.",
    image: "/assets/images/trusted-customer.jpg", 
  },  {
    name: "AR Shekhar",
    position: "CEO Vendor",
    text: "Workwise has completely transformed our procurement process. Their platform made it effortless to connect with reliable vendors and compare rates, all while keeping everything organized in one place. The automated rate comparisons and Excel downloads have saved us countless hours, and the comprehensive dashboard gives us real-time insights into every stage of the process.",
    image: "/assets/images/trusted-customer.jpg", 
  },
];

const Testimonial = () => {
  return (
    <section className="solution-section-4 py-5" aria-label="hear-from-our-customers" style={{ backgroundColor: '#eef3f5' }}>
      <div className="container">
        <h2 className="h3 text-center mb-5">Hear from Our Customers</h2>
        <div className="row">
          {testimonials.map((testimonial, index) => (
            <div className="col-sm-6 p-2 p-lg-0 mb-3" key={index}>
              <div className="text-center">
                <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                  layout="intrinsic"
                  width={300}
                  height={400}
                />
              </div>
              <div className="d-flex h-100 justify-content-start align-items-center">
                <div className="w-100">
                  <FontAwesomeIcon icon={faQuoteLeft} fontSize={24} />
                  <div className="d-flex gap-2 my-2">
                    {[...Array(5)].map((_, i) => (
                      <FontAwesomeIcon key={i} icon={faStar} fontSize={16} className="text-warning" />
                    ))}
                  </div>
                  <p className="mb-4">{testimonial.text}</p>
                  <p className="fw-semibold mb-1">{testimonial.name}</p>
                  <p className="text-sm fw-medium">{testimonial.position}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonial;