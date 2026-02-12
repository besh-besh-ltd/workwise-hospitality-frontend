import { useState } from "react";
import Link from "next/link";
import { Field, Form, Formik } from "formik";
import * as yup from "yup";
import FullLoader from "../shared/FullLoader";
import { FiMail, FiLock, FiEye, FiEyeOff, FiHash, FiArrowRight } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";

const emailSchema = yup.object().shape({
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

const employeeCodeSchema = yup.object().shape({
  employee_code: yup
    .string()
    .trim()
    .required("Employee code is required"),
  password: yup
    .string()
    .required("Password is required"),
});

const emailInitialValues = { email: "", password: "" };
const employeeCodeInitialValues = { employee_code: "", password: "" };

const loginCSS = `
  .lf-wrapper * { box-sizing: border-box; }

  .lf-toggle {
    display: flex;
    position: relative;
    background: #f1f5f9;
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 28px;
  }
  .lf-toggle-pill {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: calc(50% - 4px);
    background: linear-gradient(135deg, #2E5BA8, #3d6ec0);
    border-radius: 10px;
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(46, 91, 168, 0.3);
  }
  .lf-toggle-pill.right {
    transform: translateX(calc(100% + 4px));
  }
  .lf-toggle-btn {
    position: relative;
    z-index: 1;
    flex: 1;
    padding: 12px 8px;
    border: none;
    border-radius: 10px;
    background: transparent;
    font-weight: 500;
    font-size: 13.5px;
    font-family: Poppins, sans-serif;
    cursor: pointer;
    transition: color 0.3s ease;
    letter-spacing: 0.01em;
    color: #64748b;
  }
  .lf-toggle-btn.active {
    color: #fff;
    font-weight: 600;
  }

  .lf-field { margin-bottom: 20px; }
  .lf-label {
    font-size: 13px;
    font-weight: 500;
    color: #475569;
    font-family: Poppins, sans-serif;
    margin-bottom: 7px;
    display: block;
    transition: color 0.25s ease;
  }
  .lf-field:focus-within .lf-label { color: #2E5BA8; }
  .lf-input-wrap { position: relative; }
  .lf-icon {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 17px;
    pointer-events: none;
    z-index: 1;
    transition: color 0.25s ease;
  }
  .lf-field:focus-within .lf-icon { color: #2E5BA8; }
  .lf-eye {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 17px;
    cursor: pointer;
    z-index: 1;
    display: flex;
    align-items: center;
    transition: color 0.2s ease;
    padding: 4px;
  }
  .lf-eye:hover { color: #2E5BA8; }

  .lf-input {
    width: 100%;
    padding: 14px 15px 14px 46px;
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    font-family: Poppins, sans-serif;
    color: #0f172a;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
  }
  .lf-input:focus {
    border-color: #2E5BA8;
    box-shadow: 0 0 0 3.5px rgba(46, 91, 168, 0.1);
  }
  .lf-input::placeholder { color: #a0aec0; }
  .lf-input-pw { padding-right: 46px; }

  .lf-error {
    color: #ef4444;
    font-size: 12px;
    margin-top: 6px;
    font-family: Poppins, sans-serif;
    animation: lfErrorIn 0.2s ease;
  }
  @keyframes lfErrorIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .lf-submit {
    width: 100%;
    padding: 15px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #2E5BA8 0%, #3d6fbe 100%);
    color: #fff;
    font-weight: 600;
    font-size: 15px;
    font-family: Poppins, sans-serif;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    margin-top: 6px;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .lf-submit:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(46, 91, 168, 0.35);
    background: linear-gradient(135deg, #264fa0 0%, #3565b2 100%);
  }
  .lf-submit:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(46, 91, 168, 0.2);
  }
  .lf-submit .lf-arrow { transition: transform 0.25s ease; font-size: 16px; }
  .lf-submit:hover .lf-arrow { transform: translateX(3px); }

  .lf-divider { display: flex; align-items: center; margin: 22px 0; }
  .lf-divider-line { flex: 1; height: 1px; background: #e2e8f0; }
  .lf-divider-text {
    padding: 0 16px;
    color: #94a3b8;
    font-size: 13px;
    font-family: Poppins, sans-serif;
    font-weight: 500;
  }

  .lf-google {
    width: 100%;
    padding: 13px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
    color: #374151;
    font-weight: 500;
    font-size: 14px;
    font-family: Poppins, sans-serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .lf-google:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }
  .lf-google:active { transform: translateY(0); box-shadow: none; }

  .lf-forgot {
    font-size: 13px;
    color: #2E5BA8;
    text-decoration: none;
    font-family: Poppins, sans-serif;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  .lf-forgot:hover { color: #1e4a8a; text-decoration: underline; }

  .lf-register-link {
    color: #428B41;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
  }
  .lf-register-link:hover { color: #367035; text-decoration: underline; }

  @keyframes lfFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .lf-animated { animation: lfFadeIn 0.25s ease forwards; }
`;

const Login = (props) => {
  const {
    loginSubmitHandler,
    loading,
    setEmail,
    setPassword,
    setloading,
    loginWithGoogle,
    setEmployeeCode,
  } = props;

  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState("employee_code");

  const currentSchema = loginMethod === "employee_code" ? employeeCodeSchema : emailSchema;
  const currentInitialValues = loginMethod === "employee_code" ? employeeCodeInitialValues : emailInitialValues;
  const isEmployeeCode = loginMethod === "employee_code";

  return (
    <div className="login-form hasFullLoader lf-wrapper">
      <style>{loginCSS}</style>
      {loading && <FullLoader />}

      <h3 style={{
        fontFamily: 'Poppins, sans-serif',
        fontWeight: 700,
        fontSize: '28px',
        lineHeight: '36px',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: '4px',
      }}>
        Welcome Back
      </h3>
      <p style={{
        fontFamily: 'Poppins, sans-serif',
        fontSize: '14px',
        color: '#64748b',
        textAlign: 'center',
        marginBottom: '28px',
        fontWeight: 400,
        lineHeight: '22px',
      }}>
        Sign in to your account
      </p>

      {/* Sliding Toggle */}
      <div className="lf-toggle">
        <div className={`lf-toggle-pill${isEmployeeCode ? '' : ' right'}`} />
        <button
          type="button"
          className={`lf-toggle-btn${isEmployeeCode ? ' active' : ''}`}
          onClick={() => setLoginMethod("employee_code")}
          id="toggle_employee_code-login_method-login_form"
        >
          Employee Code
        </button>
        <button
          type="button"
          className={`lf-toggle-btn${!isEmployeeCode ? ' active' : ''}`}
          onClick={() => setLoginMethod("email")}
          id="toggle_email-login_method-login_form"
        >
          Email
        </button>
      </div>

      {/* Form */}
      <Formik
        key={loginMethod}
        initialValues={currentInitialValues}
        validationSchema={currentSchema}
        onSubmit={(values) => {
          if (loginMethod === "employee_code") {
            setEmail("");
            setPassword(values.password);
            if (setEmployeeCode) setEmployeeCode(values.employee_code);
            loginSubmitHandler({ employee_code: values.employee_code, password: values.password });
          } else {
            setEmail(values.email);
            setPassword(values.password);
            if (setEmployeeCode) setEmployeeCode("");
            loginSubmitHandler({ email: values.email, password: values.password });
          }
        }}
      >
        {({ errors, touched }) => (
          <Form className="lf-animated">
            {/* Identifier Field */}
            {isEmployeeCode ? (
              <div className="lf-field">
                <label className="lf-label">Employee Code</label>
                <div className="lf-input-wrap">
                  <FiHash className="lf-icon" />
                  <Field
                    type="text"
                    name="employee_code"
                    placeholder="Enter your employee code"
                    className="lf-input"
                    id="employee_code-login_form"
                  />
                </div>
                {touched.employee_code && errors.employee_code && (
                  <div className="lf-error">{errors.employee_code}</div>
                )}
              </div>
            ) : (
              <div className="lf-field">
                <label className="lf-label">Email Address</label>
                <div className="lf-input-wrap">
                  <FiMail className="lf-icon" />
                  <Field
                    type="email"
                    name="email"
                    placeholder="name@example.com"
                    className="lf-input"
                    id="email-login_form"
                  />
                </div>
                {touched.email && errors.email && (
                  <div className="lf-error">{errors.email}</div>
                )}
              </div>
            )}

            {/* Password Field */}
            <div className="lf-field">
              <label className="lf-label">Password</label>
              <div className="lf-input-wrap">
                <FiLock className="lf-icon" />
                <Field
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  className="lf-input lf-input-pw"
                  id="password-login_form"
                />
                <div
                  className="lf-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  id="toggle_password_visibility-password_field-login_form"
                >
                  {showPassword ? <FiEye /> : <FiEyeOff />}
                </div>
              </div>
              {touched.password && errors.password && (
                <div className="lf-error">{errors.password}</div>
              )}
            </div>

            {/* Forgot Password (email only) */}
            {!isEmployeeCode && (
              <div style={{ textAlign: 'right', marginBottom: '18px', marginTop: '-10px' }}>
                <Link
                  href="/forget-password"
                  onClick={() => props.closeModal()}
                  className="lf-forgot"
                  id="forgot_password-login_links-login_form"
                >
                  Forgot Password?
                </Link>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="lf-submit"
              id="login_submit-login_form-login_form"
            >
              Sign In
              <FiArrowRight className="lf-arrow" />
            </button>
          </Form>
        )}
      </Formik>

      {/* Google OAuth (email only) */}
      {!isEmployeeCode && (
        <>
          <div className="lf-divider">
            <span className="lf-divider-line" />
            <span className="lf-divider-text">or</span>
            <span className="lf-divider-line" />
          </div>

          <button
            type="button"
            className="lf-google"
            onClick={() => {
              setloading(true);
              loginWithGoogle();
            }}
            id="login_with_google-social_login-login_form"
          >
            <FcGoogle style={{ fontSize: '20px' }} />
            Continue with Google
          </button>
        </>
      )}

      {/* Register Link */}
      <p style={{
        textAlign: 'center',
        fontSize: '13px',
        color: '#64748b',
        fontFamily: 'Poppins, sans-serif',
        marginTop: '24px',
        marginBottom: 0,
      }}>
        New to Workwise?{' '}
        <Link
          href="#"
          onClick={() => props.setActiveTab("register")}
          className="lf-register-link"
          id="register_here-login_links-login_form"
        >
          Register here
        </Link>
      </p>
    </div>
  );
};

export default Login;
