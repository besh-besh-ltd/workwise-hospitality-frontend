import React, { useState } from 'react';

const FaqAccordion = React.forwardRef(({ 
  className, 
  questions = [],
  ...props 
}, ref) => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div
      className={`accordion ${className || ''}`}
      ref={ref}
      {...props}
    >
      {questions.map((faq, index) => (
        <div
          key={index}
          className="accordion-item border-0 shadow-sm mb-3"
        >
          {/* Question Header */}
          <button
            className={`accordion-button ${openIndex === index ? '' : 'collapsed'} w-100 text-start d-flex align-items-center justify-content-between p-4 bg-white`}
            onClick={() => toggleQuestion(index)}
            style={{ border: 'none', outline: 'none' }}
          >
            <span className="fw-semibold text-dark">
              {faq.question}
            </span>
          </button>

          {/* Answer */}
          <div
            className={`accordion-collapse ${openIndex === index ? 'show' : 'collapse'}`}
          >
            <div className="accordion-body pt-0 pb-4 px-4">
              <p className="text-muted mb-0">
                {faq.answer}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

FaqAccordion.displayName = "FaqAccordion";

export { FaqAccordion }; 