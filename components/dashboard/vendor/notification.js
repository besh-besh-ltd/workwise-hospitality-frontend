import Image from "next/image";
import React from "react";

const EditProfile = () => {
  return (
    <>
      <section className="vendor-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Notification</h1>
        </div>
      </section>

      <section className="notification-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-10">
              <div className="notification-sec-con unread">
                <h4 className="title">12 December, 2023 at 10:17 pm</h4>
                <p>
                  Lorem Ipsum is simply dummy text of the printing and
                  typesetting industry. Lorem Ipsum has been the industry's
                  standard dummy text ever since the 1500s, lorem . Lorem Ipsum
                  is simply dummy text of the printing.
                </p>
              </div>
              <div className="notification-sec-con unread">
                <h4 className="title">12 December, 2023 at 10:17 pm</h4>
                <p>
                  Lorem Ipsum is simply dummy text of the printing and
                  typesetting industry. Lorem Ipsum has been the industry's
                  standard dummy text ever since the 1500s, lorem . Lorem Ipsum
                  is simply dummy text of the printing.
                </p>
              </div>
              <div className="notification-sec-con">
                <h4 className="title">12 December, 2023 at 10:17 pm</h4>
                <p>
                  Lorem Ipsum is simply dummy text of the printing and
                  typesetting industry. Lorem Ipsum has been the industry's
                  standard dummy text ever since the 1500s, lorem . Lorem Ipsum
                  is simply dummy text of the printing.
                </p>
              </div>
              <div className="notification-sec-con">
                <h4 className="title">12 December, 2023 at 10:17 pm</h4>
                <p>
                  Lorem Ipsum is simply dummy text of the printing and
                  typesetting industry. Lorem Ipsum has been the industry's
                  standard dummy text ever since the 1500s, lorem . Lorem Ipsum
                  is simply dummy text of the printing.
                </p>
              </div>
              <div className="notification-sec-con">
                <h4 className="title">12 December, 2023 at 10:17 pm</h4>
                <p>
                  Lorem Ipsum is simply dummy text of the printing and
                  typesetting industry. Lorem Ipsum has been the industry's
                  standard dummy text ever since the 1500s, lorem . Lorem Ipsum
                  is simply dummy text of the printing.
                </p>
              </div>

              <div className="notification-action">
                <button type="submit" className="btn">
                  Mark All As Read
                </button>

                <button type="submit" className="btn btn-primary">
                  Show More
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default EditProfile;
