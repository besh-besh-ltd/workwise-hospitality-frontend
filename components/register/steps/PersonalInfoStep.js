import React from "react";
import { Field } from "formik";
import { BsEye, BsEyeSlash, BsCheckCircleFill } from "react-icons/bs";
import styles from "../Register.module.css";

const PersonalInfoStep = ({
  values,
  errors,
  touched,
  setFieldValue,
  isHospitality,
  countryCode,
  showPassword,
  setShowPassword,
  showCPassword,
  setShowCPassword,
  emailVerified,
  otpToken,
  otpValue,
  sendingOTP,
  verifyingOTP,
  handleSendOTP,
  handleVerifyOTP,
  setOtpValue,
  setEmailVerified,
  setOtpToken,
}) => {
  return (
    <>
      {/* Name */}
      <div className={styles.formGroup}>
        <label htmlFor="name" className={styles.formLabel}>
          Contact Person Name <span className={styles.formRequired}>*</span>
        </label>
        <Field
          type="text"
          id="name"
          name="name"
          placeholder="Ex. Rahul Patil"
          className={styles.formInput}
        />
        {touched.name && errors.name && (
          <div className={styles.formError}>{errors.name}</div>
        )}
      </div>

      {/* Email + OTP */}
      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.formLabel}>
          Work Email <span className={styles.formRequired}>*</span>
        </label>
        <div className={styles.otpRow}>
          <Field
            type="email"
            id="email"
            name="email"
            placeholder="name@company.com"
            className={styles.formInput}
            disabled={emailVerified && isHospitality}
            onChange={(e) => {
              setFieldValue("email", e.target.value);
              if (isHospitality && emailVerified) {
                setEmailVerified(false);
                setOtpToken(null);
                setOtpValue("");
              }
            }}
          />
          {isHospitality && !emailVerified && (
            <button
              type="button"
              className={styles.btnSmPrimary}
              onClick={() => handleSendOTP(values.email)}
              disabled={sendingOTP || !values.email || !!errors.email}
            >
              {sendingOTP ? "Sending..." : "Send OTP"}
            </button>
          )}
          {isHospitality && emailVerified && (
            <span className={styles.verifiedBadge}>
              <BsCheckCircleFill size={12} /> Verified
            </span>
          )}
        </div>
        {touched.email && errors.email && (
          <div className={styles.formError}>{errors.email}</div>
        )}
        {isHospitality && otpToken && !emailVerified && (
          <div className={styles.otpInputWrap}>
            <input
              type="text"
              className={styles.otpInput}
              placeholder="000000"
              value={otpValue}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtpValue(val);
              }}
              maxLength={6}
            />
            <button
              type="button"
              className={styles.btnSmPrimary}
              onClick={handleVerifyOTP}
              disabled={verifyingOTP || otpValue.length !== 6}
            >
              {verifyingOTP ? "Verifying..." : "Verify"}
            </button>
          </div>
        )}
        {isHospitality && otpToken && !emailVerified && (
          <div className={styles.otpHint}>Check your email for the OTP code</div>
        )}
      </div>

      {/* Organization Name */}
      <div className={styles.formGroup}>
        <label htmlFor="organization_name" className={styles.formLabel}>
          Organization Name <span className={styles.formRequired}>*</span>
        </label>
        <Field
          type="text"
          id="organization_name"
          name="organization_name"
          placeholder="Ex. Workwise Private Limited"
          className={styles.formInput}
        />
        {touched.organization_name && errors.organization_name && (
          <div className={styles.formError}>{errors.organization_name}</div>
        )}
      </div>

      {/* Mobile */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Mobile Number <span className={styles.formRequired}>*</span>
        </label>
        <div className={styles.mobileRow}>
          <Field
            as="select"
            name="countryCode"
            className={styles.countryCodeSelect}
          >
            <option value="+91">IN (+91)</option>
            {countryCode.map((item) => (
              <option key={item.id} value={item.phone_code}>
                {item.country_code} ({item.phone_code})
              </option>
            ))}
          </Field>
          <Field
            type="text"
            id="mobile"
            name="mobile"
            placeholder="XXXXX XXXXX"
            className={styles.formInput}
          />
        </div>
        {touched.mobile && errors.mobile && (
          <div className={styles.formError}>{errors.mobile}</div>
        )}
      </div>

      {/* Password */}
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.formLabel}>
            Password <span className={styles.formRequired}>*</span>
          </label>
          <div className={styles.passwordWrap}>
            <Field
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              placeholder="Min. 8 characters"
              className={styles.formInput}
              style={{ paddingRight: "40px" }}
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <BsEye size={16} /> : <BsEyeSlash size={16} />}
            </button>
          </div>
          {touched.password && errors.password && (
            <div className={styles.formError}>{errors.password}</div>
          )}
          <p style={{ fontSize: "13.5px", color: "#c0392b", margin: "2px 0 0", fontWeight: "bold" }}>
            Kindly note down your password as it will be needed for future logins
          </p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirm_password" className={styles.formLabel}>
            Confirm Password <span className={styles.formRequired}>*</span>
          </label>
          <div className={styles.passwordWrap}>
            <Field
              type={showCPassword ? "text" : "password"}
              id="confirm_password"
              name="confirm_password"
              placeholder="Re-enter password"
              className={styles.formInput}
              style={{ paddingRight: "40px" }}
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowCPassword((prev) => !prev)}
            >
              {showCPassword ? <BsEye size={16} /> : <BsEyeSlash size={16} />}
            </button>
          </div>
          {touched.confirm_password && errors.confirm_password && (
            <div className={styles.formError}>{errors.confirm_password}</div>
          )}
        </div>
      </div>
    </>
  );
};

export default PersonalInfoStep;
