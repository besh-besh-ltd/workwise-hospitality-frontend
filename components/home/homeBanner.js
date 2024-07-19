import Link from "next/link";
import Slider from "react-slick";
import Image from 'next/image'
export default function HomeBanner(props) {
  const keyStr =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const homeSlider = {
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    autoplay: true,
    dots: true,
    arrows: false,
  };
  const removeHTML = (string) => {
    const regex = /(<([^>]+)>)/gi;
    return string.replace(regex, " ");
  };
  const triplet = (e1, e2, e3) =>
  keyStr.charAt(e1 >> 2) +
  keyStr.charAt(((e1 & 3) << 4) | (e2 >> 4)) +
  keyStr.charAt(((e2 & 15) << 2) | (e3 >> 6)) +
  keyStr.charAt(e3 & 63);

const rgbDataURL = (r, g, b) =>
  `data:image/gif;base64,R0lGODlhAQABAPAA${
    triplet(0, r, g) + triplet(b, 255, 255)
  }/yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==`;

  return (
    <>
      <section className="home-banner">
        <div className="home-banner-content">
          <div className="container">
            {props.bannerContent.map((item) => {
              if (item.section_name == "banner-contents") {
                return (
                  <div
                  key={Date.now()}
                    dangerouslySetInnerHTML={{
                      __html: item.content,
                    }}
                  ></div>
                );
              }
            })}
          </div>
        </div>
        <div className="home-banner-navarea"></div>
        <div className="home-banner-item">
          <div className="home-banner-img">
            {props?.content && props?.content.length > 0 && (
              <>
                <Image
                  src={props?.content[0].image_url}
                  alt="Workwise"
                  width={1920}
                  height={820}                  
                  placeholder="blur"                
                  blurDataURL={rgbDataURL(2, 129, 210)}
                />
                {/* <img
                  src={props?.content[0].image_url}
                  alt="Workwise"
                  width="1920"
                  height="820"
                  priority="true"
                /> */}
              </>
            )}
          </div>
        </div>
        {/* <Slider {...homeSlider}>
					{props?.content.map((item) => {
						return (
							<div className="home-banner-item" key={item.id}>
								<div className="home-banner-img">
									<img
										src={item.image_url}
										alt="Workwise"
										width="1920"
										height="820"
										priority="true"
									/>
								</div>
							</div>
						);
					})}
				</Slider> */}
      </section>
    </>
  );
}
