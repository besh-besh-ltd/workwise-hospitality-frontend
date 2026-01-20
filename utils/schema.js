import * as yup from "yup";

// Common email regex pattern
const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// Common mobile regex pattern  
const mobileRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;

export const EditCompanyDetails = yup.object().shape({
  organization_name: yup.string().required("Organization name is required"),
  name: yup.string().required("Vendor name is required"),
  email: yup
    .string()
    .email()
    .matches(emailRegex, "Please enter valid email address")
    .required("Email is required"),
  mobile: yup
    .string()
    .matches(mobileRegex, "Please enter valid mobile number")
    .min(10, "Min 10 digit is required")
    .max(11, "Mobile number not more than 11 digit long")
    .required("Mobile number is required"),

  // Convert location to an object with required fields
  // location: yup.object().shape({
  //   country: yup.string().optional(),
  //   state: yup.string().optional(),
  //   city: yup.string().optional()
  // }),

  gstin: yup.string().optional(),
  cin: yup.string().optional(),
});

export const CreateRFQSchema = yup.object().shape({
  comment: yup.string().optional(),
  response_email: yup
    .string()
    .email()
    .matches(emailRegex, "Please enter valid email address")
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
  department_id: yup
    .number()
    .nullable()
    .typeError("Please select a department"),
});

export const EditSocialDetails = yup.object().shape({
  linkedin: yup.string().optional(),
  facebook: yup.string().optional(),
  whatsapp: yup
    .string()
    .matches(mobileRegex, "please enter valid mobile number")
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
    .matches(emailRegex, "Please enter valid email address")
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
    .matches(emailRegex, "Please enter valid email address")
    .required("Email is required"),
  phone: yup
    .string()
    .matches(mobileRegex, "please enter valid mobile number")
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
// ==========================================
// Admin Account Management Schemas
// ==========================================


// ==========================================
// Admin Account Management Schemas
// ==========================================

// Edit Account validation schema
export const editAccountSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  email: yup
    .string()
    .email("Invalid email")
    .required("Email is required"),
  mobile: yup
    .string()
    .matches(/^[0-9]+$/, "Mobile number should contain only digits")
    .min(8, "Mobile number must be at least 8 digits")
    .max(15, "Mobile number cannot exceed 15 digits")
    .required("Mobile number is required"),
  countryCode: yup.string().required("Country code is required"),
});

// Create Account validation schema
export const createAccountSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  email: yup
    .string()
    .email("Invalid email")
    .required("Email is required"),
  mobile: yup
    .string()
    .matches(/^[0-9]+$/, "Mobile number should contain only digits")
    .min(8, "Mobile number must be at least 8 digits")
    .max(15, "Mobile number cannot exceed 15 digits")
    .required("Mobile number is required"),
  countryCode: yup.string().required("Country code is required"),
  department_id: yup
    .array()
    .min(1, "At least one department is required")
    .required("Department is required"),
  employee_type: yup.string().required("Employee type is required"),
  employee_code: yup.string().required("Employee code is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/[0-9]/, "Password must contain at least one number")
    .matches(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords must match")
    .required("Confirm password is required"),
});

// ==========================================
// Admin Project Management Schemas
// ==========================================

// Create Project validation schema
export const createProjectSchema = yup.object().shape({
  name: yup.string().required("Project name is required"),
  description: yup.string().required("Project description is required"),
  location: yup.string().required("Location is required"),
});

// Edit Project validation schema
export const editProjectSchema = yup.object().shape({
  name: yup.string().required("Project name is required"),
  description: yup.string().required("Project description is required"),
  location: yup.string().required("Location is required"),
});

// Add Team Member validation schema
export const addTeamMemberSchema = yup.object().shape({
  user: yup.object().required("User is required"),
});

// ==========================================
// Admin User Management Schemas
// ==========================================

// Add Sub Admin validation schema
export const addSubAdminSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  email: yup
    .string()
    .email()
    .matches(emailRegex, "Please enter valid email address")
    .required("Email is required"),
  mobile: yup
    .string()
    .matches(mobileRegex, "Please enter valid mobile number")
    .min(10, "Min 10 digits required")
    .max(15, "Max 15 digits allowed")
    .required("Mobile is required"),
  country_code: yup.string().required("Country code is required"),
  password: yup.string().required("Password field is required"),
  confirm_password: yup
    .string()
    .oneOf([yup.ref("password")], "Password must match")
    .required("Confirm Password field is required"),
  image: yup.mixed().nullable().required("Please select a file"),
});

// Add Data Member validation schema
export const addDataMemberSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  email: yup
    .string()
    .email()
    .matches(emailRegex, "Please enter valid email address")
    .required("Email is required"),
  mobile: yup
    .string()
    .matches(mobileRegex, "Please enter a valid mobile number")
    .min(7, "Min 7 digits required")
    .max(15, "Max 15 digits allowed")
    .required("Mobile is required"),
  countryCode: yup.string().required("Country code is required"),
  password: yup.string().required("Password field is required"),
  confirm_password: yup
    .string()
    .oneOf([yup.ref("password")], "Password must match")
    .required("Confirm Password field is required"),
  image: yup.mixed().nullable().required("Please select a file"),
});

// Add Other User validation schema
export const addOtherUserSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  organization_name: yup.string().required("Organization is required"),
  email: yup
    .string()
    .email()
    .matches(emailRegex, "Please enter valid email address")
    .required("Email is required"),
  mobile: yup
    .string()
    .matches(mobileRegex, "Please enter valid mobile number")
    .min(10, "Min 10 digits required")
    .max(11, "Max 11 digits allowed")
    .required("Mobile is required"),
  countryCode: yup.string().required("Country code is required"),
  image: yup.mixed().nullable().required("Please select a file"),
});

// Add Buyer validation schema
export const addBuyerSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  email: yup.string().email("Invalid email format").required("Email is required"),
  countryCode: yup.string().required("Country code is required"),
  mobile: yup
    .string()
    .matches(/^\d{7,15}$/, "Please enter a valid mobile number")
    .required("Mobile is required"),
  organization_name: yup.string().required("Organization name is required"),
  password: yup.string().optional(),
  address: yup.string().required("Address is required"),
  country: yup.string().required("Country is required"),
  gstin: yup.string().optional(),
  cin: yup.string().optional(),
  profile: yup.mixed().nullable(),
  nature_of_business: yup.string().required("Nature of business is required"),
  type_of_business: yup.string().required("Type of business is required"),
  website: yup.string().url("Enter a valid website URL").nullable(),
  max_top_management: yup
    .number()
    .min(1, "At least 1 top management user allowed")
    .required("Required"),
  max_procurement: yup
    .number()
    .min(1, "At least 1 procurement user allowed")
    .required("Required"),
  max_engineering: yup
    .number()
    .min(1, "At least 1 engineering user allowed")
    .required("Required"),
  max_finance: yup
    .number()
    .min(1, "At least 1 finance user allowed")
    .required("Required"),
});

// ==========================================
// Vendor Management Schemas
// ==========================================

// Add Vendor validation schema
export const addVendorSchema = yup.object().shape({
  vendorName: yup.string().required("Name is required")
    .min(2, "Name not less than 2 characters short")
    .max(50, "Name not more than 50 characters long"),
  email: yup.string().email()
    .matches(emailRegex, "Please enter valid email address")
    .required("Email is required"),
  phone: yup
    .string()
    .matches(mobileRegex, "Please enter a valid mobile number")
    .min(7, "Minimum 7 digits are required")
    .max(15, "Mobile number cannot be more than 15 digits long")
    .required("Mobile number is required")
});

// ==========================================
// Dynamic Form Modal Schemas
// ==========================================

// Project validation schema for Dynamic Form Modal
export const dynamicProjectSchema = yup.object().shape({
  name: yup.string().required("Project Name is required")
    .min(2, "Name not less than 2 characters short")
    .max(50, "Name not more than 50 characters long"),
  description: yup.string(),
  location: yup.string(),
  ended_at: yup.date(),
  rfq_type: yup.string()
    .oneOf(['', 'firm', 'budgetary'], 'Invalid RFQ Type')
    .nullable(),
  reverse_auction: yup.string()
    .oneOf(['0', '1', '-1'], 'Invalid Reverse Auction value')
    .required('Reverse Auction selection is required'),
  status: yup.mixed().notRequired()
});

// Project edit validation schema for Dynamic Form Modal
export const dynamicProjectEditSchema = yup.object().shape({
  name: yup.string().required("Project Name is required")
    .min(2, "Name not less than 2 characters short")
    .max(50, "Name not more than 50 characters long"),
  description: yup.string(),
  location: yup.string(),
  ended_at: yup.date(),
  rfq_type: yup.string()
    .oneOf(['', 'firm', 'budgetary'], 'Invalid RFQ Type')
    .nullable(),
  reverse_auction: yup.string()
    .oneOf(['0', '1', '-1'], 'Invalid Reverse Auction value')
    .required('Reverse Auction selection is required'),
  status: yup.number().oneOf([0, 1], 'Invalid status value')
});

// Account edit validation schema for Dynamic Form Modal
export const dynamicAccountEditSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  email: yup
    .string()
    .email("Invalid email")
    .required("Email is required"),
  mobile: yup
    .string()
    .matches(/^[0-9]+$/, "Mobile number should contain only digits")
    .min(8, "Mobile number must be at least 8 digits")
    .max(15, "Mobile number cannot exceed 15 digits")
    .required("Mobile number is required"),
  countryCode: yup.string().required("Country code is required"),
});

// Team member validation schema for Dynamic Form Modal
export const dynamicTeamMemberSchema = yup.object().shape({
  user: yup.object().required("Please select a user")
});

// ==========================================
