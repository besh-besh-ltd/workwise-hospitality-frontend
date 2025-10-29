import Head from 'next/head';
import { Inter } from 'next/font/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faClock, faDollarSign, faGraduationCap, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';

// Import components
import { HeroSection } from '@/components/ui/HeroSection';
import { Button } from '@/components/ui/Button';

import { Formik, Form } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import FormikField from '@/components/shared/FormikField';
import { contactUsFormService } from '@/services/contact';

// Import data
import { careersData } from '@/components/constants/careersData';

const inter = Inter({ subsets: ['latin'] });

const pageInfo = {
  title: "Careers at Workwise - Join Our Mission to Transform Procurement",
  description: "Build the future of industrial procurement with cutting-edge AI. Explore open positions in engineering, product, sales, and more.",
  keywords: "careers, jobs, workwise, procurement, AI, engineering, product management, sales",
  ogImage: "/assets/images/workwise-careers-og.jpg",
  ogUrl: "https://workwise.in/work-with-us/careers"
};

const CareersPage = () => {
  const [selectedPosition, setSelectedPosition] = useState(null);

  const handleApplyNow = (position) => {
    setSelectedPosition(position);
    // Scroll to form
    document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Head>
        <title>{pageInfo.title}</title>
        <meta name="description" content={pageInfo.description} />
        <meta name="keywords" content={pageInfo.keywords} />
        <meta property="og:title" content={pageInfo.title} />
        <meta property="og:description" content={pageInfo.description} />
        <meta property="og:image" content={pageInfo.ogImage} />
        <meta property="og:url" content={pageInfo.ogUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={inter.className}>
        <style jsx>{`
          /* Mobile optimizations */
          @media (max-width: 768px) {
            section {
              padding-top: 3rem !important;
              padding-bottom: 3rem !important;
            }
            
            h1, h2 {
              line-height: 1.3 !important;
            }
            
            h2.fs-1 {
              font-size: 2rem !important;
            }
            
            p {
              line-height: 1.5 !important;
            }
            
            .container {
              padding-left: 1rem !important;
              padding-right: 1rem !important;
            }
          }
          
          /* Enhanced card shadows */
          .card {
            box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
            transition: all 0.3s ease;
          }
          
          .card:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
            transform: translateY(-2px);
          }

          /* Job card styling */
          .job-card {
            border-left: 4px solid transparent;
            transition: all 0.3s ease;
          }
          
          .job-card:hover {
            border-left-color: var(--bs-primary);
            transform: translateX(4px);
          }

          /* Tag styling */
          .job-tag {
            background: rgba(59, 130, 246, 0.1);
            color: #3B82F6;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            margin: 2px;
            display: inline-block;
          }

          /* Stats styling */
          .stat-item {
            text-align: center;
            padding: 2rem;
          }
          
          .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--bs-primary);
            margin-bottom: 0.5rem;
          }
          
          .stat-label {
            color: var(--bs-muted);
            font-weight: 500;
          }
        `}</style>

        {/* Hero Section */}
        <HeroSection
          title={careersData.hero.title}
          subtitle={careersData.hero.subtitle}
          primaryButton={{
            label: "View Open Positions",
            variant: "white",
            onClick: () => document.getElementById('open-positions')?.scrollIntoView({ behavior: 'smooth' })
          }}
          secondaryButton={{
            label: "Learn About Culture",
            variant: "outline-white",
            onClick: () => document.getElementById('company-culture')?.scrollIntoView({ behavior: 'smooth' })
          }}
          visualContent={{
            image: careersData.hero.image
          }}
          layout="centered"
          size="medium"
          textAlign="left"
        />

        {/* Company Culture Section */}
        <section id="company-culture" className="py-5 bg-light">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">
                {careersData.companyCulture.title}
              </h2>
              <p className="text-muted fs-5 mb-0">
                {careersData.companyCulture.subtitle}
              </p>
            </div>

            <div className="row g-4">
              {careersData.companyCulture.values.map((value, index) => (
                <div key={index} className="col-lg-6 col-md-6">
                  <div className="card h-100 border-0 shadow-sm rounded-4">
                    <div className="card-body p-4 text-center">
                      <div 
                        className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                        style={{
                          width: '64px',
                          height: '64px',
                          backgroundColor: value.color,
                          color: 'white'
                        }}
                      >
                        <FontAwesomeIcon icon={value.icon} style={{ fontSize: '24px' }} />
                      </div>
                      <h4 className="fw-bold text-dark mb-3">{value.title}</h4>
                      <p className="text-muted mb-0">{value.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-5">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">
                {careersData.stats.title}
              </h2>
            </div>

            <div className="row g-4">
              {careersData.stats.items.map((stat, index) => (
                <div key={index} className="col-lg-3 col-md-6">
                  <div className="stat-item">
                    <div className="mb-3">
                      <FontAwesomeIcon 
                        icon={stat.icon} 
                        style={{ fontSize: '48px', color: '#3B82F6' }}
                      />
                    </div>
                    <div className="stat-number">{stat.number}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Positions Section */}
        <section id="open-positions" className="py-5 bg-light">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">
                {careersData.openPositions.title}
              </h2>
              <p className="text-muted fs-5 mb-0">
                {careersData.openPositions.subtitle}
              </p>
            </div>

            <div className="row g-4">
              {careersData.openPositions.positions.map((position, index) => (
                <div key={index} className="col-lg-6">
                  <div className="card job-card h-100 border-0 shadow-sm rounded-4">
                    <div className="card-body p-4 d-flex flex-column h-100">
                      {/* Header */}
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h4 className="fw-bold text-dark mb-2">{position.title}</h4>
                          <div className="d-flex align-items-center gap-3 text-muted small mb-2">
                            <span className="d-flex align-items-center">
                              <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                              {position.location}
                            </span>
                            <span className="d-flex align-items-center">
                              <FontAwesomeIcon icon={faClock} className="me-2" />
                              {position.type}
                            </span>
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="badge bg-primary mb-2">{position.department}</div>
                          <div className="text-muted small">{position.experience}</div>
                          <div className="fw-bold text-success">{position.salary}</div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-muted mb-3">{position.description}</p>

                      {/* Tags */}
                      <div className="mb-3">
                        {position.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="job-tag">{tag}</span>
                        ))}
                      </div>

                      {/* Requirements Preview */}
                      <div className="mb-3">
                        <h6 className="fw-bold text-dark mb-2">Key Requirements:</h6>
                        <ul className="list-unstyled mb-0">
                          {position.requirements.slice(0, 3).map((req, reqIndex) => (
                            <li key={reqIndex} className="d-flex align-items-center mb-1">
                              <FontAwesomeIcon icon={faCheck} className="text-success me-2" style={{ fontSize: '12px' }} />
                              <span className="text-muted small">{req}</span>
                            </li>
                          ))}
                          {/* Removed "+N more requirements" line for compactness */}
                        </ul>
                      </div>

                      {/* CTA aligned to bottom */}
                      <div className="mt-auto pt-2">
                        <Button
                          id={`apply_now-${position.title.replace(/\s+/g,'_').toLowerCase()}-careers_page`}
                          label="Apply Now"
                          variant="primary"
                          onClick={() => handleApplyNow(position)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-5">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">
                {careersData.benefits.title}
              </h2>
              <p className="text-muted fs-5 mb-0">
                {careersData.benefits.subtitle}
              </p>
            </div>

            <div className="row g-4">
              {careersData.benefits.categories.map((category, index) => (
                <div key={index} className="col-lg-6 col-md-6">
                  <div className="card h-100 border-0 shadow-sm rounded-4">
                    <div className="card-body p-4">
                      <h5 className="fw-bold text-dark mb-3">{category.title}</h5>
                      <ul className="list-unstyled mb-0">
                        {category.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="d-flex align-items-center mb-2">
                            <FontAwesomeIcon icon={faCheck} className="text-success me-2" style={{ fontSize: '14px' }} />
                            <span className="text-muted">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

                 {/* Application Form Section */}
         <section id="application-form" className="contact-sec-3 sc-pt-80 sc-pb-80">
           <div className="container">
             <div className="row">
               <div className="col-md-4">
                 <div className="contact-sec-3-con">
                   <div className="text-center mb-4">
                     <h3 className="fw-bold text-dark mb-3">
                       {careersData.applicationForm.title}
                     </h3>
                     <p className="text-muted mb-0">
                       {careersData.applicationForm.subtitle}
                     </p>
                     {selectedPosition && (
                       <div className="mt-3">
                         <span className="badge bg-primary fs-6">
                           Applying for: {selectedPosition.title}
                         </span>
                       </div>
                     )}
                   </div>

                 </div>
               </div>
               
               <div className="col-md-8">
                 <div className="contact-sec-3-form">
                   <div className="contact-form">
                    <Formik
                      enableReinitialize={true}
                      initialValues={{
                        name: "",
                        email: "",
                        phone: "",
                        subject: selectedPosition ? selectedPosition.title : "Career Application",
                        comment: "",
                        countryCode: "+91",
                      }}
                      validationSchema={yup.object().shape({
                        name: yup.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters").required("Name is required"),
                        email: yup.string().email("Please enter a valid email").required("Email is required"),
                        phone: yup.string().matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im, "Please enter a valid phone number").min(10, "Phone must be at least 10 digits").max(12, "Phone must be less than 12 digits").required("Phone is required"),
                        subject: yup.string().required("Subject is required"),
                        comment: yup.string().required("Please tell us why you want to join Workwise")
                      })}
                      onSubmit={(values, { resetForm }) => {
                        const fullMobile = `${values.countryCode}-${values.phone.trim().replace(/^0+/, "")}`;
                        const { countryCode, ...updatedValues } = { 
                          ...values, 
                          phone: fullMobile,
                          submitted_from: "1",
                        };
                        
                        contactUsFormService(updatedValues)
                          .then((response) => {
                            resetForm();
                            toast.success("Application submitted successfully! We'll get back to you soon.", {
                              position: "top-center",
                            });
                          })
                          .catch((error) => {
                            toast.error("Failed to submit application. Please try again.", {
                              position: "top-center",
                            });
                          });
                      }}
                    >
                      {({ values, errors, touched, setFieldValue }) => (
                        <Form>
                          <div className="row">
                            <div className="col-md-6">
                              <span className="contacts-title">Name</span>
                              <div className="form-group">
                                <FormikField
                                  label="Your Name"
                                  placeholder="Ex. Manoj Kumar"
                                  isRequired={true}
                                  name="name"
                                  touched={touched}
                                  errors={errors}
                                  nolabel={true}
                                />
                              </div>
                            </div>

                            <div className="col-md-6">
                              <span className="contacts-title">Email</span>
                              <div className="form-group">
                                <FormikField
                                  label="Email"
                                  placeholder="@example.com"
                                  isRequired={true}
                                  name="email"
                                  touched={touched}
                                  errors={errors}
                                  nolabel={true}
                                />
                              </div>
                            </div>

                            <div className="col-md-6">
                              <span className="contacts-title">
                                Phone Number
                              </span>
                              <div className="form-group d-flex align-items-center">
                                <select
                                  name="countryCode"
                                  className="form-control me-2"
                                  style={{ width: "50%", height: "54px", marginBottom:"12px" }}
                                  value={values.countryCode}
                                  onChange={(e) =>
                                    setFieldValue(
                                      "countryCode",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="+91">IN (+91)</option>
                                  <option value="+1">US (+1)</option>
                                  <option value="+44">UK (+44)</option>
                                  <option value="+61">AU (+61)</option>
                                </select>

                                <FormikField
                                  label="Phone Number"
                                  placeholder="Ex. 9123456789"
                                  isRequired={true}
                                  name="phone"
                                  touched={touched}
                                  errors={errors}
                                  nolabel={true}
                                  className="form-control"
                                  style={{ width: "55%", height: "38px" }}
                                />
                              </div>

                              {touched.countryCode && errors.countryCode && (
                                <div className="text-danger mt-1">
                                  {errors.countryCode}
                                </div>
                              )}
                            </div>

                            <div className="col-md-6">
                              <span className="contacts-title">Subject</span>
                              <div className="form-group">
                                <FormikField
                                  label="Subject"
                                  placeholder="Ex. Application for Senior Frontend Developer"
                                  isRequired={true}
                                  name="subject"
                                  touched={touched}
                                  errors={errors}
                                  nolabel={true}
                                />
                              </div>
                            </div>

                            <div className="col-md-12">
                              <span className="contacts-title">Why Workwise?</span>
                              <div className="form-group">
                                <FormikField
                                  label="Comment"
                                  placeholder="Tell us why you'd like to join our team, which role interests you, and what excites you about this opportunity..."
                                  isRequired={true}
                                  name="comment"
                                  type="textarea"
                                  touched={touched}
                                  errors={errors}
                                  nolabel={true}
                                />
                              </div>

                              <button
                                type="submit"
                                className="btn btn-secondary"
                              >
                                Submit Application
                              </button>
                            </div>
                          </div>
                        </Form>
                      )}
                    </Formik>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-5" style={{ background: 'linear-gradient(to bottom, #004B84, #30A07D)' }}>
          <div className="container">
            <div className="row justify-content-center text-center">
              <div className="col-lg-8">
                <h2 className="fs-1 fw-bold text-white mb-4">
                  Ready to Transform Procurement with Us?
                </h2>
                <p className="text-white mb-4" style={{ fontSize: '1.1rem', opacity: 0.9 }}>
                  Join a team that's building the future of industrial procurement. 
                  If you don't see a role that fits, we'd still love to hear from you.
                </p>
                <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                  <Button
                    id="view_all_positions-footer-carrers_page"
                    label="View All Positions"
                    variant="white"
                    onClick={() => document.getElementById('open-positions')?.scrollIntoView({ behavior: 'smooth' })}
                    size="lg"
                  />
                  <Button
                    id="contact_hr-footer-carrers_page"
                    label="Contact HR Team"
                    variant="outline-white"
                    onClick={() => document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' })}
                    size="lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default CareersPage;
