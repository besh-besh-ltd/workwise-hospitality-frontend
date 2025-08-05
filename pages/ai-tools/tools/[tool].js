import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Upload, 
  CheckCircle, 
  Users, 
  Shield, 
  Download,
  Phone,
  ArrowRight,
  FileText,
  Calculator,
  Zap,
  Clock,
  Share2,
  Brain,
  Eye,
  Lock,
  CloudArrowUp
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExcel, faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';

// Import components
import { HeroSection } from '@/components/ui/HeroSection';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { CtaSection } from '@/components/ui/CtaSection';
import { RegisterFormModal } from '@/components/ui/RegisterFormModal';
import AiToolPreview from '@/components/aiTools/AiToolPreview';

// Import data
import { aiToolsData } from '@/components/constants/aiToolsData';

const AiToolPage = () => {
  const router = useRouter();
  const { tool } = router.query;
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !router.isReady) {
    return <div>Loading...</div>;
  }

  // Get tool data based on slug
  const getToolData = () => {
    const toolMap = {
      'boq-simplification': aiToolsData.boqSimplifier,
      'cost-estimation': aiToolsData.costEstimator,
      'tender-summary': aiToolsData.tenderSummary,
      'technical-summary': aiToolsData.technicalSummary
    };
    return toolMap[tool] || aiToolsData.boqSimplifier;
  };

  const toolData = getToolData();

  // If tool doesn't exist, redirect to AI tools page
  if (!toolData) {
    router.push('/ai-tools');
    return null;
  }

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile?.name || '');
  };

  const handleUpload = () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }
    setShowFormModal(true);
  };

  const handleFormSubmit = async (formData) => {
    // Here you would typically send the form data and file to your backend
    console.log('Form submitted:', formData);
    console.log('File:', file);
    setShowFormModal(false);
    setShowSuccessModal(true);
    
    // Reset file after successful submission
    setTimeout(() => {
      setFile(null);
      setFileName('');
      setShowSuccessModal(false);
    }, 3000);
  };



  const handleBookCall = () => {
    console.log('Book a Call clicked');
  };

  const handleDownload = () => {
    console.log('Download clicked');
  };

  // Icon mapping for benefits
  const getBenefitIcon = (iconName) => {
    const iconMap = {
      skip: Clock,
      'never-miss': CheckCircle,
      share: Share2,
      breakdown: Calculator,
      'market-rates': Zap,
      rapid: Brain,
      extract: FileText,
      deadlines: Clock,
      compliance: Shield,
      simplify: Brain,
      insights: Eye
    };
    return iconMap[iconName] || CheckCircle;
  };

  return (
    <>
      <Head>
        <title>{`${toolData.title} | Workwise AI Tools`}</title>
        <meta name="description" content={`${toolData.hero.subtitle} - ${toolData.hero.title}`} />
      </Head>

      <div className="min-vh-100">
        {/* Hero Section */}
        <HeroSection
          title={toolData.hero.title}
          subtitle={toolData.hero.subtitle}
          layout="centered"
          size="small"
          textAlign="left"
          showVisual={false}
        />

        {/* File Upload Section */}
        <section className="py-5 bg-white">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="text-center mb-4">
                  <h3 className="fw-bold mb-3">Upload Your File</h3>
                  <p className="text-muted">
                    Select your file and we'll process it using our AI technology
                  </p>
                </div>
                
                <div className="bg-light rounded-4 p-4">
                  <div
                    className="file-drop-area text-center rounded py-5 mb-4"
                    style={{
                      border: "2px dashed #007bff",
                      cursor: "pointer",
                      backgroundColor: "#fff",
                      color: "#007bff",
                      transition: "all 0.3s ease"
                    }}
                    onClick={() => document.getElementById("fileInput").click()}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = "#0056b3";
                      e.target.style.backgroundColor = "#f8fbff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = "#007bff";
                      e.target.style.backgroundColor = "#fff";
                    }}
                  >
                    <FontAwesomeIcon
                      icon={fileName ? faFileExcel : faCloudArrowUp}
                      style={{ fontSize: "45px" }}
                    />
                    <p className="fw-semibold mb-0 mt-3">
                      {fileName || "Upload/Drag & drop your file here"}
                    </p>
                    <p className="text-muted small mb-0 mt-2">
                      Supported formats: Excel (.xlsx, .xls), PDF, Word (.docx, .doc)
                    </p>
                  </div>

                  <input
                    id="fileInput"
                    type="file"
                    accept=".xlsx,.xls,.pdf,.docx,.doc"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />

                  {fileName && (
                    <div className="text-center mb-4">
                      <div className="d-inline-flex align-items-center bg-success bg-opacity-10 rounded-3 px-3 py-2">
                        <CheckCircle size={16} className="text-success me-2" />
                        <span className="text-success fw-medium">{fileName}</span>
                      </div>
                    </div>
                  )}

                  <div className="text-center">
                    <button
                      onClick={handleUpload}
                      className="btn btn-primary px-4 py-2 fw-medium"
                      disabled={!file}
                    >
                      <Upload size={16} className="me-2" />
                      {toolData.hero.primaryButton.label}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* How It Works Section */}
        <section className="py-5 bg-light">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fs-2 fw-bold text-dark mb-3">
                {toolData.howItWorks.title}
              </h2>
            </div>
            <div className="row g-4">
              {toolData.howItWorks.steps.map((step, index) => (
                <div key={index} className="col-md-4">
                  <div className="text-center">
                    <div className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3"
                         style={{ width: '60px', height: '60px' }}>
                      <span className="fw-bold fs-5">{step.step}</span>
                    </div>
                    <h5 className="fw-bold mb-2">{step.title}</h5>
                    <p className="text-muted">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Output Preview Section */}
        <section className="py-5 bg-white">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fs-2 fw-bold text-dark mb-3">
                {toolData.outputPreview.title}
              </h2>
              <p className="text-muted mb-4">
                {toolData.outputPreview.previewNote}
              </p>
            </div>
            <div className="row g-4">
              {toolData.outputPreview.previews.map((preview, index) => (
                <div key={index} className="col-md-6">
                  <AiToolPreview
                    title={preview.title}
                    description={preview.description}
                    image={preview.image}
                    onDownload={handleDownload}
                    onView={() => console.log('View preview')}
                  />
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <small className="text-muted">{toolData.outputPreview.note}</small>
            </div>
          </div>
        </section>

        {/* Trust Signals Section */}
        <section className="py-5 bg-light">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fs-2 fw-bold text-dark mb-3">
                {toolData.trustSignals.title}
              </h2>
            </div>
            
            {/* Logos */}
            <div className="row justify-content-center mb-5">
              {toolData.trustSignals.logos.map((logo, index) => (
                <div key={index} className="col-auto">
                  <div className="bg-white rounded-3 p-3 shadow-sm">
                    <span className="fw-bold text-primary">{logo}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonials */}
            <div className="row g-4 mb-4">
              {toolData.trustSignals.testimonials.map((testimonial, index) => (
                <div key={index} className="col-md-6">
                  <div className="bg-white rounded-4 p-4 shadow-sm h-100">
                    <p className="text-muted mb-3">"{testimonial.text}"</p>
                    <small className="fw-medium text-dark">{testimonial.author}</small>
                  </div>
                </div>
              ))}
            </div>

            {/* Badges */}
            <div className="text-center mb-3">
              {toolData.trustSignals.badges.map((badge, index) => (
                <span key={index} className="badge bg-primary me-2 mb-2">
                  {badge}
                </span>
              ))}
            </div>

            <div className="text-center">
              <p className="text-muted small">{toolData.trustSignals.tagline}</p>
            </div>
          </div>
        </section>

        {/* Register Form Modal */}
        <RegisterFormModal
          show={showFormModal}
          onClose={() => setShowFormModal(false)}
          title={toolData.leadForm.title}
          subtitle={toolData.leadForm.subtitle}
          fields={toolData.leadForm.fields}
          onSubmit={handleFormSubmit}
          successMessage="Your file has been uploaded successfully! You will receive an email once it's processed."
        />

        {/* Success Modal */}
        {showSuccessModal && (
          <div 
            className="modal show d-block" 
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1050
            }}
          >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
              <div className="modal-content border-0 shadow">
                <div className="modal-body text-center py-5">
                  <div className="mb-4">
                    <div 
                      className="rounded-circle d-inline-flex align-items-center justify-content-center"
                      style={{
                        width: '80px',
                        height: '80px',
                        backgroundColor: '#d4edda',
                        color: '#155724'
                      }}
                    >
                      <CheckCircle size={40} />
                    </div>
                  </div>
                  <h4 className="fw-bold text-dark mb-3">File Uploaded Successfully!</h4>
                  <p className="text-muted mb-4">
                    Your file has been uploaded and is being processed. You will receive an email with the results once processing is complete.
                  </p>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="btn btn-primary px-4 py-2"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Output View Section */}
        {showPreview && (
          <section className="py-5 bg-white">
            <div className="container">
              <div className="row justify-content-center">
                <div className="col-lg-8">
                  <div className="text-center mb-4">
                    <h3 className="fw-bold mb-2">
                      {toolData.outputView.title}
                    </h3>
                    <p className="text-muted">
                      {toolData.emailResult.message}
                    </p>
                  </div>
                  
                  <div className="bg-light rounded-4 p-4 mb-4">
                    <div className="text-center">
                      <img
                        src={toolData.outputPreview.previews[0].image}
                        alt="Preview"
                        className="img-fluid rounded"
                        style={{ filter: "blur(2px)", maxHeight: "300px" }}
                      />
                    </div>
                  </div>
                  
                  <div className="d-flex justify-content-center gap-3 flex-wrap">
                    <button
                      onClick={handleDownload}
                      className="btn btn-outline-primary px-4 py-2"
                    >
                      <Download size={16} className="me-2" />
                      {toolData.outputView.downloadText}
                    </button>
                    <button
                      onClick={handleBookCall}
                      className="btn btn-primary px-4 py-2"
                    >
                      {toolData.outputView.cta}
                    </button>
                  </div>
                  
                  {/* Chatbot Teaser */}
                  <div className="text-center mt-4">
                    <div className="bg-primary bg-opacity-10 rounded-3 p-3">
                      <h6 className="fw-bold text-primary mb-2">
                        {toolData.outputView.chatbotTeaser.title}
                      </h6>
                      <p className="text-muted small mb-0">
                        {toolData.outputView.chatbotTeaser.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA Section */}
        <CtaSection
          title={toolData.bottomCta.title}
          primaryButton={{
            ...toolData.bottomCta.button,
            variant: "white",
            onClick: handleBookCall
          }}
        />
      </div>
    </>
  );
};

export default AiToolPage; 