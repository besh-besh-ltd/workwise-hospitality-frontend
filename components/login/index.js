import {
  faFacebookF,
  faGoogle,
  faLinkedin,
} from "@fortawesome/free-brands-svg-icons";
import { faEye, faEyeSlash } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Field, Form, Formik } from "formik";
import { ToastContainer, toast } from "react-toastify";
import * as yup from "yup";
import { useRouter } from "next/router";

import storageInstance from "../../utils/storageInstance";
import axiosInstance from "@/lib/axios";
import { LoginService, SWSubscribe, handleSocialLogin } from "@/services/Auth";
import Loader from "../shared/Loader";
import FullLoader from "../shared/FullLoader";

import {
  GoogleOAuthProvider,
  GoogleLogin,
  useGoogleLogin,
} from "@react-oauth/google";
import { useLinkedIn } from "react-linkedin-login-oauth2";
import axios from "axios";
import { useSelector } from "react-redux";

const Login = (props) => {
  const {
    loginSubmitHandler,
    loading,
    setEmail,
    setPassword,
    setloading,
    loginWithGoogle,
  } = props;
  const swSubscription = useSelector((data) => data.swSubscription);
  const router = useRouter();
  const { code } = router.query;
  const LINKEDIN_CLIENT_SECRET = "Nj013dgpw51YIi1Z";
  const LINKEDIN_CLIENT_ID = "77xquc68cjr3s6";
  const LINKEDIN_CALLBACK_URL = "http://localhost:8111";
  const linkedinOAuthURL = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    LINKEDIN_CALLBACK_URL
  )}&scope=profile`;
  const [showPassword, setShowPassword] = useState(false);
  // const [loading, setloading] = useState(false);
  // Set State Change
  const handleChange = (setState) => (event) => {
    setState(event);
  };
  // Login Initial Value
  const initialValues = {
    email: "",
    password: "",
  };
  // Login Initial Validations
  const validateSchema = yup.object().shape({
    email: yup
      .string()
      .email()
      .matches(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter valid email address"
      )
      .required("Email is required"),
    password: yup
      .string()
      .required("Password is required")
      .min(8, "Password must be 8 characters long")
      .matches(/[0-9]/, "Password requires a number")
      .matches(/[a-z]/, "Password requires a lowercase letter")
      .matches(/[A-Z]/, "Password requires an uppercase letter")
      .matches(/[^\w]/, "Password requires a symbol"),
  });

  // const loginSubmitHandler = (values, isFromOtherModal = false) => {
  //   setloading(true);
  //   LoginService(values, isFromOtherModal)
  //     .then((response) => {
  //       // subscribe to SW
  //       SWSubscribe({subscription:swSubscription, token:response.token}).then(res=>{
  //         console.log("PUSH SENT")
  //       }).catch(err=>{})
  //       setloading(false);
  //       toast.success(response.message, {
  //         position: "top-center",
  //       });

  //       let userType = "";
  //       if (response.profile[0].user_type == 2) {
  //         userType = "buyer";
  //       } else if (response.profile[0].user_type == 3) {
  //         userType = "vendor";
  //       }else if (response.profile[0].user_type == 4) {
  //         userType = "other";
  //       }
  //       storageInstance.setStorage("current-user-type", userType);

  //       props.closeModal();
  //       router.push(`/dashboard/${userType}`);
  //       //router.push(`/dashboard`);
  //     })
  //     .catch((error) => {
  //       setloading(false);
  //       if(error.message.response.status === 400){
  //         toast.error(error.message.response.data.message, {
  //           position: "top-center",
  //         });
  //         setTimeout(()=>{
  //           props.closeModal();
  //         },2000)

  //         setTimeout(()=>{
  //           props.handleOtherDeviceLoginModalOpen();
  //         },1000)
  //       }
  //       else if (error?.message?.response?.data) {
  //         toast.error(error.message.response.data.message, {
  //           position: "top-center",
  //         });
  //       }

  //       if (error.response?.status === 400) {
  //       } else {
  //         toast.error(error.message, {
  //           position: "top-center",
  //         });
  //       }
  //     });
  // };

  // const login = useGoogleLogin({
  //   onSuccess: (tokenResponse) => {
  //     handleSocialLogin({
  //       login_type: "google",
  //       access_token: tokenResponse.access_token,
  //     }, false)
  //       .then((response) => {
  //         // subscribe to SW
  //         SWSubscribe({subscription:swSubscription, token:response.token}).then(res=>{
  //           console.log("PUSH SENT")
  //         }).catch(err=>{})
  //         setloading(false);
  //         toast.success(response.message, {
  //           position: "top-center",
  //         });

  //         let userType = "";
  //         if (response.profile.user_type == 2) {
  //           userType = "buyer";
  //         } else if (response.profile.user_type == 3) {
  //           userType = "vendor";
  //         }
  //         storageInstance.setStorage("current-user-type", userType);
  //         props.closeModal();
  //         router.push(`/dashboard/${userType}`);
  //       })
  //       .catch((error) => {
  //         setloading(false);
  //         console.log(error?.message?.response,"response *")
  //         if (error.message.response.status === 400 && error?.message?.response?.data?.status === 4) {
  //           toast.error(error.message.response.data.message, {
  //             position: "top-center",
  //           });
  //           // setTimeout(() => {
  //           //   props.closeModal();
  //           // }, 2000)

  //           // setTimeout(() => {
  //           //   props.handleOtherDeviceLoginModalOpen();
  //           // }, 1000)
  //         }
  //         else if (error?.message?.response?.data) {
  //           toast.error(error.message.response.data.message, {
  //             position: "top-center",
  //           });
  //         }
  //       });
  //   },
  //   onError: (error) => {
  //     setloading(false);
  //   },
  // });

  // const { linkedInLogin } = useLinkedIn({
  //   clientId: '77xquc68cjr3s6',
  //   redirectUri: `http://localhost:8111`,
  //   scope: 'email',
  //   onSuccess: (code) => {
  //     console.log(code);
  //   },
  //   onError: (error) => {
  //     console.log(error);
  //   },
  // });

  const handleLinkdedinLogin = () => {
    window.location.href = linkedinOAuthURL;
  };

  useEffect(() => {
    if (code) {
      // handleLogin(code);
    }
  }, [router, code]);

  const handleLogin = async (code) => {
    axios
      .get(
        `http://www.linkedin.com/oauth/v2/accessToken?grant_type=authorization_code&client_id=${LINKEDIN_CLIENT_ID}&client_secret=${LINKEDIN_CLIENT_SECRET}&code=${code}&redirect_uri=${LINKEDIN_CALLBACK_URL}`
      )
      .then(async (res) => {
        console.log(res.data.access_token);
        let accessToken = res.data.access_token;
        const userProfile = await fetch(
          "http://api.linkedin.com/v2/me?projection=(id,firstName,lastName)",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        console.log("userProfile", userProfile);
      });
  };

  return (
    <>
      <div className="login-form hasFullLoader">
        {loading && <FullLoader />}
        <h3 className="tab-title">Login</h3>
        <Formik
          initialValues={initialValues}
          validationSchema={validateSchema}
          onSubmit={(values) => {
            setEmail(values.email);
            setPassword(values.password);
            loginSubmitHandler(values);
          }}
        >
          {({ errors, touched }) => (
            <Form>
              {/* ------- User name / Email ------ */}
              <div className="form-group">
                <label htmlFor="username">
                  Email <sup>*</sup>
                </label>
                <Field
                  type="email"
                  id="email"
                  name="email"
                  placeholder="@example.com"
                />
                {touched.email && errors.email && (
                  <div className="form-error">{errors.email}</div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="password">
                  Password <sup>*</sup>
                </label>
                {/* ------- Password ------ */}
                <div className="password-input-container">
                  <Field
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="********"
                  />
                  <div
                    className="eye-icon"
                    onClick={() => {
                      handleChange(setShowPassword(!showPassword));
                    }}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
                  </div>
                  {touched.password && errors.password && (
                    <div className="form-error">{errors.password}</div>
                  )}
                </div>
              </div>

              <div>
                <Link
                  href="/forget-password"
                  onClick={() => props.closeModal()}
                  className="for-pass"
                >
                  Forgot Password
                </Link>
                <span className="for-new text-right">
                  Are you a new user?&nbsp;
                  <Link href="#" onClick={() => props.setActiveTab("register")}>
                    Register here.
                  </Link>
                </span>
              </div>
              <button type="submit" className="btn btn-secondary">
                Login
              </button>
            </Form>
          )}
        </Formik>
        <form>
          <div className="form-group">
            <div className="text-center">OR</div>
            <div className="text-center">
              <p>You may login with </p>
            </div>

            <button
              type="button"
              className="btn-google"
              onClick={() => {
                setloading(true);
                loginWithGoogle();
              }}
            >
              <FontAwesomeIcon icon={faGoogle} /> Login with Google
            </button>
            <button
              type="button"
              onClick={handleLinkdedinLogin}
              className="btn-facebook"
            >
              <FontAwesomeIcon icon={faLinkedin} /> Login with Linkedin
            </button>
            <p>
              <sub>*</sub> marks are mandatory
            </p>
          </div>
        </form>
      </div>
      <ToastContainer />
    </>
  );
};

export default Login;
