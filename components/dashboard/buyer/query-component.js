import PlaceholderLoading from "react-placeholder-loading";

const QueryComponent = () => {
  return (
    <>
      <div className="container-fluid">
        <h1 className="heading">
          <PlaceholderLoading shape="rect" width={600} height={50} />
        </h1>
      </div>

      {/* main container */}
      <div className="d-flex flex-column flex-lg-row p-4 gap-4 h-100">
        {/* vendor list (left part) */}
        <div className="flex-column flex-lg-row-auto w-lg-30% mb-10 mb-lg-0 h-100">
          <div className="card card-flush">
            <div className="card-body pt-5">
              <div className="scroll-y me-n5 pe-5 h-200px h-lg-auto">
                {/* vendor detail card */}
                <div className="d-flex flex-stack py-4">
                  <img src="" alt="Vendor" className="img-thumbnail" style={{ width: '50px', height: '50px' }} />
                  <div>
                    <p className="m-0">Mukul</p>
                    <span>mukul@letsworkwise.com</span>
                  </div>
                </div>
                {/* vendor detail card over here */}
              </div>
            </div>
          </div>
        </div>

        {/* main content (right part) */}
        <div className="flex-lg-row-fluid w-100 ms-lg-7 w-lg-70% ms-xl-10">
          <div className="card">
            <div className="card-header">
              <h3>Vendor Header</h3>
            </div>
            <div className="card-body">
              {/* Other content for the right section */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QueryComponent;
