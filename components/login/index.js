import { useState } from "react";
import { Field, Form, Formik } from "formik";
import * as yup from "yup";
import { toast } from "react-toastify";
import FullLoader from "../shared/FullLoader";
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiArrowRight, FiArrowLeft, FiKey } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { forgetPasswordService, forgetPasswordValiationService } from "../../services/Auth";
import { ForgetPasswordOtpValidation } from "../../utils/schema";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());

const loginSchema = yup.object().shape({
  identifier: yup
    .string()
    .trim()
    .required("Email ID or Employee Code is required"),
  password: yup.string().required("Password is required"),
});

const forgotIdentifierSchema = yup.object().shape({
  identifier: yup
    .string()
    .trim()
    .required("Email ID or Employee Code is required"),
});

const loginInitialValues = { identifier: "", password: "" };
const forgotIdentifierInitialValues = { identifier: "" };
const forgotResetInitialValues = { otp: "", password: "", confirm_password: "" };

const buildForgotPayload = (identifier) => {
  const trimmed = (identifier || "").trim();
  return isEmail(trimmed)
    ? { email: trimmed }
    : { employee_code: trimmed };
};

const loginCSS = `
  .lf-wrapper * { box-sizing: border-box; }

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
    cursor: pointer;
    display: inline-block;
    text-align: right;
    width: 100%;
  }
  .lf-forgot:hover { color: #1e4a8a; text-decoration: underline; }

  .lf-register-link {
    color: #428B41;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
  }
  .lf-register-link:hover { color: #367035; text-decoration: underline; }

  .lf-back {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-family: Poppins, sans-serif;
    font-weight: 500;
    padding: 4px 0;
    margin-bottom: 8px;
    transition: color 0.2s ease;
  }
  .lf-back:hover { color: #2E5BA8; }

  .lf-back-icon {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    font-size: 18px;
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 99;
    transition: color 0.2s ease;
  }
  .lf-back-icon:hover { color: #2E5BA8; }

  .lf-resend {
    background: none;
    border: none;
    color: #2E5BA8;
    cursor: pointer;
    font-size: 12.5px;
    font-family: Poppins, sans-serif;
    font-weight: 500;
    padding: 0;
    transition: color 0.2s ease;
  }
  .lf-resend:hover { color: #1e4a8a; text-decoration: underline; }
  .lf-resend:disabled { color: #94a3b8; cursor: not-allowed; text-decoration: none; }

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
    loginError,
  } = props;

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [view, setView] = useState("login"); // "login" | "forgot_email" | "forgot_reset"
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resending, setResending] = useState(false);

  const resetPayload = buildForgotPayload(resetIdentifier);
  const resetIsEmail = isEmail(resetIdentifier);

  const handleForgotIdentifierSubmit = async ({ identifier }) => {
    const trimmed = identifier.trim();
    if (setloading) setloading(true);
    try {
      const res = await forgetPasswordService(buildForgotPayload(trimmed));
      if (res?.status) {
        setResetIdentifier(trimmed);
        setView("forgot_reset");
        toast.success(res?.message || "OTP sent to your registered email", { position: "top-right" });
      } else {
        toast.error(res?.message || "Unable to send OTP", { position: "top-right" });
      }
    } catch (e) {
      // Axios interceptor already toasts field-level messages from `errors`; skip the generic fallback in that case
      const data = e?.message?.response?.data;
      if (!data?.errors) {
        toast.error(
          data?.message || "Something went wrong",
          { position: "top-right" }
        );
      }
    } finally {
      if (setloading) setloading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!resetIdentifier) return;
    setResending(true);
    try {
      const res = await forgetPasswordService(resetPayload);
      if (res?.status) {
        toast.success(res?.message || "OTP resent", { position: "top-right" });
      } else {
        toast.error(res?.message || "Unable to resend OTP", { position: "top-right" });
      }
    } catch (e) {
      const data = e?.message?.response?.data;
      if (!data?.errors) {
        toast.error(
          data?.message || "Unable to resend OTP",
          { position: "top-right" }
        );
      }
    } finally {
      setResending(false);
    }
  };

  const handleResetSubmit = async ({ otp, password, confirm_password }) => {
    if (setloading) setloading(true);
    try {
      const res = await forgetPasswordValiationService({ otp, password, confirm_password });
      const ok = res?.status === 1 || res?.status === true;
      if (ok) {
        toast.success(res?.message || "Password updated", { position: "top-right" });
        setEmail(resetIsEmail ? resetIdentifier : "");
        setPassword(password);
        if (setEmployeeCode) setEmployeeCode(resetIsEmail ? "" : resetIdentifier);
        loginSubmitHandler({ ...resetPayload, password });
      } else {
        toast.error(res?.message || "Invalid OTP or unable to reset password", { position: "top-right" });
        if (setloading) setloading(false);
      }
    } catch (e) {
      const data = e?.message?.response?.data;
      if (!data?.errors) {
        toast.error(
          data?.message || "Something went wrong",
          { position: "top-right" }
        );
      }
      if (setloading) setloading(false);
    }
  };

  return (
    <div className="login-form lf-wrapper">
      <style>{loginCSS}</style>

      {view === "login" && (
        <>
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

          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 12px', marginBottom: 20,
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 10,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="8" cy="8" r="7" stroke="#1d4ed8" strokeWidth="1.4"/>
              <path d="M8 7v4.5M8 4.5v.5" stroke="#1d4ed8" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: '0.82rem', color: '#1e3a8a', fontFamily: 'Poppins, sans-serif', lineHeight: 1.4, fontWeight: 500 }}>
              <strong>Employees</strong> must login using <strong>Employee Code</strong> only. 
              <br/>
              <strong>Vendors</strong>  can login using their registered <strong>Email ID</strong>.
            </span>
          </div>

          {loginError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', marginBottom: 20,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 10, animation: 'lfFadeIn 0.2s ease forwards',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5"/>
                <path d="M8 5v3.5M8 10.5v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: '0.82rem', color: '#991b1b', fontFamily: 'Poppins, sans-serif', lineHeight: 1.4, fontWeight: 500 }}>
                {loginError}
              </span>
            </div>
          )}

          <Formik
            initialValues={loginInitialValues}
            validationSchema={loginSchema}
            onSubmit={(values) => {
              const identifier = values.identifier.trim();
              const treatAsEmail = isEmail(identifier);
              setEmail(treatAsEmail ? identifier : "");
              setPassword(values.password);
              if (setEmployeeCode) setEmployeeCode(treatAsEmail ? "" : identifier);
              loginSubmitHandler(
                treatAsEmail
                  ? { email: identifier, password: values.password }
                  : { employee_code: identifier, password: values.password }
              );
            }}
          >
            {({ errors, touched }) => (
              <Form className="lf-animated">
                <div className="lf-field">
                  <label className="lf-label">Email ID or Employee Code</label>
                  <div className="lf-input-wrap">
                    <FiUser className="lf-icon" />
                    <Field
                      type="text"
                      name="identifier"
                      placeholder="name@example.com or EMP1234"
                      className="lf-input"
                      id="identifier-login_form"
                      autoComplete="username"
                    />
                  </div>
                  {touched.identifier && errors.identifier && (
                    <div className="lf-error">{errors.identifier}</div>
                  )}
                </div>

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

                  <span
                    type="button"
                    className="lf-forgot"
                    id="forgot_password-login_links-login_form"
                    onClick={() => setView("forgot_email")}
                  >
                    Forgot Password?
                  </span>

                <button
                  type="submit"
                  className="lf-submit"
                  id="login_submit-login_form-login_form"
                  disabled={loading}
                  style={loading ? { opacity: 0.7, cursor: 'not-allowed', transform: 'none' } : {}}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm" style={{ width: 16, height: 16 }} /> Signing In...</>
                  ) : (
                    <>Sign In <FiArrowRight className="lf-arrow" /></>
                  )}
                </button>
              </Form>
            )}
          </Formik>
        </>
      )}

      {view === "forgot_email" && (
        <>
          <button
            type="button"
            className="lf-back-icon"
            onClick={() => setView("login")}
            id="back_to_login-forgot_email-login_form"
            aria-label="Back to sign in"
          >
            <FiArrowLeft />
          </button>
          <h3 style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 700,
            fontSize: '26px',
            lineHeight: '34px',
            color: '#0f172a',
            textAlign: 'center',
            marginBottom: '4px',
          }}>
            Reset your password
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
            Enter your email ID or employee code and we'll send a one-time code to your registered email.
          </p>

          <Formik
            initialValues={forgotIdentifierInitialValues}
            validationSchema={forgotIdentifierSchema}
            onSubmit={handleForgotIdentifierSubmit}
          >
            {({ errors, touched }) => (
              <Form className="lf-animated">
                <div className="lf-field">
                  <label className="lf-label">Email ID or Employee Code</label>
                  <div className="lf-input-wrap">
                    <FiUser className="lf-icon" />
                    <Field
                      type="text"
                      name="identifier"
                      placeholder="name@example.com or EMP1234"
                      className="lf-input"
                      id="identifier-forgot_email-login_form"
                      autoComplete="username"
                    />
                  </div>
                  {touched.identifier && errors.identifier && (
                    <div className="lf-error">{errors.identifier}</div>
                  )}
                </div>

                <button
                  type="submit"
                  className="lf-submit"
                  id="send_otp-forgot_email-login_form"
                  disabled={loading}
                  style={loading ? { opacity: 0.7, cursor: 'not-allowed', transform: 'none' } : {}}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm" style={{ width: 16, height: 16 }} /> Sending OTP...</>
                  ) : (
                    <>Send OTP <FiArrowRight className="lf-arrow" /></>
                  )}
                </button>
              </Form>
            )}
          </Formik>
        </>
      )}

      {view === "forgot_reset" && (
        <>
          <button
            type="button"
            className="lf-back-icon"
            onClick={() => setView("forgot_email")}
            id="back_to_email-forgot_reset-login_form"
            aria-label="Use a different identifier"
          >
            <FiArrowLeft />
          </button>
          <h3 style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 700,
            fontSize: '26px',
            lineHeight: '34px',
            color: '#0f172a',
            textAlign: 'center',
            marginBottom: '4px',
          }}>
            Set a new password
          </h3>
          <p style={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: '14px',
            color: '#64748b',
            textAlign: 'center',
            marginBottom: '24px',
            fontWeight: 400,
            lineHeight: '22px',
          }}>
            {resetIsEmail ? (
              <>Enter the OTP sent to <strong style={{ color: '#0f172a' }}>{resetIdentifier}</strong>.</>
            ) : (
              <>Enter the OTP sent to the email registered for <strong style={{ color: '#0f172a' }}>{resetIdentifier}</strong>.</>
            )}
          </p>

          <Formik
            initialValues={forgotResetInitialValues}
            validationSchema={ForgetPasswordOtpValidation}
            onSubmit={handleResetSubmit}
          >
            {({ errors, touched }) => (
              <Form className="lf-animated">
                <div className="lf-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 8 }}>
                    <label className="lf-label" style={{ marginBottom: 0, flex: 1, textAlign: 'left' }}>One-time Code</label>
                    <button
                      type="button"
                      className="lf-resend"
                      onClick={handleResendOtp}
                      disabled={resending}
                      id="resend_otp-forgot_reset-login_form"
                      style={{ flex: 1, textAlign: 'right' }}
                    >
                      {resending ? "Resending..." : "Resend OTP"}
                    </button>
                  </div>
                  <div className="lf-input-wrap" style={{ marginTop: 7 }}>
                    <FiKey className="lf-icon" />
                    <Field
                      type="text"
                      name="otp"
                      placeholder="Enter the 6-digit code"
                      className="lf-input"
                      id="otp-forgot_reset-login_form"
                      autoComplete="one-time-code"
                    />
                  </div>
                  {touched.otp && errors.otp && (
                    <div className="lf-error">{errors.otp}</div>
                  )}
                </div>

                <div className="lf-field">
                  <label className="lf-label">New Password</label>
                  <div className="lf-input-wrap">
                    <FiLock className="lf-icon" />
                    <Field
                      type={showNewPassword ? "text" : "password"}
                      name="password"
                      placeholder="Create a strong password"
                      className="lf-input lf-input-pw"
                      id="password-forgot_reset-login_form"
                      autoComplete="new-password"
                    />
                    <div
                      className="lf-eye"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      id="toggle_new_password_visibility-forgot_reset-login_form"
                    >
                      {showNewPassword ? <FiEye /> : <FiEyeOff />}
                    </div>
                  </div>
                  {touched.password && errors.password && (
                    <div className="lf-error">{errors.password}</div>
                  )}
                </div>

                <div className="lf-field">
                  <label className="lf-label">Confirm Password</label>
                  <div className="lf-input-wrap">
                    <FiLock className="lf-icon" />
                    <Field
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm_password"
                      placeholder="Re-enter new password"
                      className="lf-input lf-input-pw"
                      id="confirm_password-forgot_reset-login_form"
                      autoComplete="new-password"
                    />
                    <div
                      className="lf-eye"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      id="toggle_confirm_password_visibility-forgot_reset-login_form"
                    >
                      {showConfirmPassword ? <FiEye /> : <FiEyeOff />}
                    </div>
                  </div>
                  {touched.confirm_password && errors.confirm_password && (
                    <div className="lf-error">{errors.confirm_password}</div>
                  )}
                </div>

                <button
                  type="submit"
                  className="lf-submit"
                  id="change_password-forgot_reset-login_form"
                  disabled={loading}
                  style={loading ? { opacity: 0.7, cursor: 'not-allowed', transform: 'none' } : {}}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm" style={{ width: 16, height: 16 }} /> Updating...</>
                  ) : (
                    <>Change Password & Sign In <FiArrowRight className="lf-arrow" /></>
                  )}
                </button>
              </Form>
            )}
          </Formik>
        </>
      )}
    </div>
  );
};

export default Login;
