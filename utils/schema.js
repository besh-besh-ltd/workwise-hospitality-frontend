import * as yup from "yup";
export const EditCompanyDetails = yup.object().shape({
  company_name: yup.string().required("Company name is required"),
  name: yup.string().required("Company name is required"),
  email: yup
    .string()
    .email()
    .matches(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      "Please enter valid email address"
    )
    .required("Email is required"),
  mobile: yup
    .string()
    .matches(
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
      "please enter valid mobile number"
    )
    .min(10, "Min 10 digit is required")
    .max(11, "Mobile number not more than 11 digit long")
    .required("Mobile number is required"),
  location: yup.string().required("Location as is required"),
  gstin: yup.string().optional(),
  cin: yup.string().optional(),
});

export const CreateRFQSchema = yup.object().shape({
  comment: yup.string().required("Comment is required"),
  response_email: yup
    .string()
    .email()
    .matches(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      "Please enter valid email address"
    )
    .required("Email is required"),
  contact_number: yup
    .string()
    .matches(
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
      "please enter valid mobile number"
    )
    .min(10, "Min 10 digit is required")
    .max(11, "Mobile number not more than 11 digit long")
    .required("Mobile number is required"),
  location: yup.string().optional(),
  contact_name: yup.string().required("Contact name is required"),
  company_name: yup.string().required("Company name is required"),
  bid_end_date: yup.string().optional("Bid end date is required"),
});

export const EditSocialDetails = yup.object().shape({
  linkedin: yup.string().optional(),
  facebook: yup.string().optional(),
  whatsapp: yup
    .string()
    .matches(
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
      "please enter valid mobile number"
    )
    .min(10, "Min 10 digit is required")
    .max(10, "Whatsapp number not more than 10 digit long")
    .optional(),
  skype: yup.string().optional(),
});

export const EditOnlyProfileSchema = yup.object().shape({
  profile: yup.string().required(),
});

export const ChangePassword = yup.object().shape({
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be 8 characters long")
    .matches(/[0-9]/, "Password requires a number")
    .matches(/[a-z]/, "Password requires a lowercase letter")
    .matches(/[A-Z]/, "Password requires an uppercase letter")
    .matches(/[^\w]/, "Password requires a symbol"),
  confirm_password: yup
    .string()
    .required("Confirm Password is required")
    .oneOf([yup.ref("password"), null], "Passwords must match"),
});

export const ForgetPassword = yup.object().shape({
  email: yup
    .string()
    .email()
    .matches(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      "Please enter valid email address"
    )
    .required("Email is required"),
});
export const ForgetPasswordOtpValidation = yup.object().shape({
  otp: yup.string().required("OTP is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be 8 characters long")
    .matches(/[0-9]/, "Password requires a number")
    .matches(/[a-z]/, "Password requires a lowercase letter")
    .matches(/[A-Z]/, "Password requires an uppercase letter")
    .matches(/[^\w]/, "Password requires a symbol"),
  confirm_password: yup
    .string()
    .required("Confirm Password is required")
    .oneOf([yup.ref("password"), null], "Passwords must match"),
});

export const contactFormSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  email: yup
    .string()
    .email()
    .matches(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      "Please enter valid email address"
    )
    .required("Email is required"),
  phone: yup
    .string()
    .matches(
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
      "please enter valid mobile number"
    )
    .min(10, "Min 10 digit is required")
    .max(11, "Mobile number not more than 8 digit long")
    .required("Mobile number is required"),
  subject: yup.string().required("Subject is required"),
  comment: yup.string().required("Comment is required"),
});
