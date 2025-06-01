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
      "Please enter valid mobile number"
    )
    .min(10, "Min 10 digit is required")
    .max(11, "Mobile number not more than 11 digit long")
    .required("Mobile number is required"),
  
  // Convert location to an object with required fields
  location: yup.object().shape({
    country: yup.string().optional(),
    state: yup.string().optional(),
    city: yup.string().optional()
  }),

  gstin: yup.string().optional(),
  cin: yup.string().optional(),
});


export const CreateRFQSchema = yup.object().shape({
  comment: yup.string().optional(),
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
    .matches(/^\+?[0-9]{1,3}[0-9]{7,14}$/, "Please enter a valid mobile number")
    .min(7, "Min 10 digit is required")
    .max(15, "Mobile number not more than 11 digit long")
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
  profile: yup.string(),
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
    .max(12, "Mobile number not more than 8 digit long")
    .required("Mobile number is required"),
  subject: yup.string().required("Subject is required"),
  comment: yup.string().required("Comment is required"),
});

export const editRfqSchema = yup.object().shape({
  updatableData: yup.object().shape({
    products: yup.object().shape({
      addable: yup.array().of(yup.number()).required('Addable is required'),
      deletable: yup.array().of(yup.number()).required('Deletable is required'),
      updatable: yup
        .object()
        .required('Updatable is required')
        .test(
          'updatable-specs-validation',
          'Invalid specification data',
          function (value) {
            if (!value || typeof value !== 'object') {
              return this.createError({
                message: `Updatable must be a valid object`,
              });
            }

            const specs = value.specs;

            if (!specs || typeof specs !== 'object') {
              return false; // Allow if specs is missing — change this to `false` if you want to force specs
            }

            if (Object.keys(specs).length === 0) {
              return false; // Allow empty specs — change to `false` to disallow
            }

            for (const [specKey, spec] of Object.entries(specs)) {
              if (!spec || typeof spec !== 'object') {
                return this.createError({
                  message: `Specification "${specKey}" must be a valid object`,
                });
              }

              const { Size, Spec: SpecValue, Quantity, Unit } = spec;

              if (Size !== undefined && (typeof Size !== 'string' || Size.trim() === '')) {
                return this.createError({
                  message: `Size must be a non-empty string for specification"`,
                });
              }

              if (SpecValue !== undefined && (typeof SpecValue !== 'string' || SpecValue.trim() === '')) {
                return this.createError({
                  message: `Specification description must be a non-empty string"`,
                });
              }

              if (Quantity !== undefined) {
                const num = typeof Quantity === 'string' ? parseFloat(Quantity) : Quantity;
                if (isNaN(num) || num <= 0) {
                  return this.createError({
                    message: `Quantity must be a non-negative number greater than 0"`,
                  });
                }
              }

              if (Unit !== undefined && (typeof Unit !== 'string' || Unit.trim() === '')) {
                return this.createError({
                  message: `Unit must be a non-empty string"`,
                });
              }
            }

            return true;
          }
        )
    }).required(),
    vendors: yup.object().optional(),
  }).required()
});


