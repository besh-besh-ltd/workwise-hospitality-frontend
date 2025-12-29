# CLAUDE.md - Project Guidelines

## Portal Details

This is a **Customized Procurement Platform** for **"Phileein Hospitality"** - a hospitality chain serving multiple hotel chains. The platform facilitates procurement workflows including RFQ management, vendor management, purchase orders, and technical evaluations across the hospitality ecosystem.

---

## Git Conventions

### Branch Naming
- `feat/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `hotfix/` - Critical production fixes

### Commit Messages
Format: `<type>: <brief description of change>`

Examples:
- `feat: add vendor selection modal for RFQ`
- `fix: resolve pagination issue in vendor list`
- `refactor: simplify authentication flow`
- `hotfix: patch security vulnerability in login`

---

## Folder Structure

```
frontend/
├── components/                    # React components
│   ├── ui/                        # Reusable UI components (Button, Dropdown, SearchBar, etc.)
│   ├── shared/                    # Shared utilities (Loader, Pagination, FormikField, etc.)
│   ├── modal/                     # Modal components (CommonModal, ConfirmationModal, etc.)
│   ├── layout/                    # Layout components
│   │   ├── Header/
│   │   └── Footer/
│   ├── dashboard/                 # Dashboard-specific components
│   │   ├── admin/                 # Admin dashboard
│   │   │   ├── account-management/
│   │   │   ├── approval-management/
│   │   │   ├── hospitality-manager/
│   │   │   └── project-management/
│   │   ├── buyer/                 # Buyer dashboard
│   │   │   ├── createRFQ/
│   │   │   ├── editRFQ/
│   │   │   ├── manageRFQ/
│   │   │   ├── draftRFQ/
│   │   │   ├── purchase-order/
│   │   │   │   └── grn/
│   │   │   ├── technical-evaluation/
│   │   │   ├── vendor-management/
│   │   │   ├── project-management/
│   │   │   ├── magicSearch/
│   │   │   │   └── processingRFQ/
│   │   │   └── dashboard-components/
│   │   ├── vendor/                # Vendor dashboard
│   │   │   ├── company-profile/
│   │   │   ├── technical-evaluation/
│   │   │   └── order-book/
│   │   ├── management/
│   │   ├── finance/
│   │   ├── engineering/
│   │   └── subscription/
│   ├── hospitality/               # Hospitality-specific components
│   ├── home/                      # Homepage components
│   ├── login/                     # Login components
│   ├── register/                  # Registration components
│   ├── forgetPassword/            # Password recovery
│   ├── changePassword/            # Password change
│   ├── AuthContainer/             # Auth wrapper components
│   ├── products/                  # Product display components
│   │   └── utils/
│   ├── search/                    # Search components
│   ├── solutions/                 # Solutions page components
│   ├── aboutus/                   # About us page components
│   ├── contactus/                 # Contact page components
│   ├── bookCall/                  # Book a call components
│   ├── forVendors/                # Vendor-specific pages
│   ├── privacypolicy/             # Privacy policy page
│   ├── terms-of-use/              # Terms of use page
│   ├── sitemap/                   # Sitemap components
│   ├── dynamicSection/            # Dynamic CMS sections
│   ├── wysiwyg-editor/            # WYSIWYG editor
│   └── constants/                 # Component-specific constants
│
├── pages/                         # Next.js pages (routing)
│   ├── dashboard/
│   │   ├── admin/
│   │   │   ├── account-management/
│   │   │   ├── approval-management/
│   │   │   ├── hospitality-manager/
│   │   │   └── project-management/
│   │   ├── buyer/
│   │   │   ├── purchase-order/
│   │   │   │   └── grn/
│   │   │   ├── technical-evaluation/
│   │   │   ├── project-management/
│   │   │   ├── vendor-management/
│   │   │   ├── rfq-management-vendor/
│   │   │   │   └── vendor-profile/
│   │   │   └── boq-automation/
│   │   │       └── view/
│   │   ├── vendor/
│   │   │   ├── technical-evaluation/
│   │   │   ├── edit-products/
│   │   │   ├── edit-products-review/
│   │   │   └── order-book/
│   │   ├── management/
│   │   │   └── project-management/
│   │   ├── finance/
│   │   ├── engineering/
│   │   └── subscription/
│   │       └── confirmation/
│   ├── products/
│   │   └── product-details/
│   ├── vendors/
│   │   ├── categories/
│   │   │   └── sitemap/
│   │   └── sitemap/
│   ├── vendor/
│   │   └── vendor-profile/
│   ├── ai-tools/
│   │   └── cost-estimation/
│   ├── for-vendors/
│   │   └── tnc/
│   ├── sitemap/
│   ├── validate-otp/
│   ├── forget-password/
│   └── change-password/
│
├── services/                      # API service layers
│   ├── Auth.js                    # Authentication APIs
│   ├── rfq.js                     # RFQ management APIs
│   ├── po.js                      # Purchase order APIs
│   ├── products.js                # Product APIs
│   ├── project.js                 # Project management APIs
│   ├── rbac.js                    # Role-based access control APIs
│   ├── hospitality.js             # Hospitality-specific APIs
│   ├── subscription.js            # Subscription APIs
│   ├── approval.js                # Approval workflow APIs
│   ├── general.js                 # General utility APIs
│   ├── contact.js                 # Contact form APIs
│   ├── cms.js                     # CMS APIs
│   ├── Home.js                    # Homepage APIs
│   ├── privateVendors.js          # Private vendor APIs
│   └── reviewProducts.js          # Product review APIs
│
├── redux/                         # Redux state management
│   ├── store.js                   # Redux store configuration
│   ├── slice.js                   # Redux slices
│   └── provider.js                # Redux provider wrapper
│
├── lib/                           # Library configurations
│   ├── axios.js                   # Axios instance configuration
│   └── axiosFormData.js           # Axios for form data uploads
│
├── utils/                         # Utility functions
│   ├── constants/                 # Global constants
│   │   └── index.js
│   ├── authGuard.js               # Route protection
│   ├── storageInstance.js         # Local storage utilities
│   ├── hospitalityContext.js      # Hospitality context utilities
│   ├── sharedFunctions.js         # Shared utility functions
│   ├── elementFunctions.js        # DOM element utilities
│   ├── schema.js                  # Yup validation schemas
│   └── recaptcha.js               # reCAPTCHA utilities
│
├── styles/                        # Styling
│   ├── globals.css                # Global CSS
│   ├── style.scss                 # Main SCSS file
│   ├── Home.module.css            # Homepage module CSS
│   └── scss/
│       ├── _all.scss              # All SCSS imports
│       ├── _variable.scss         # SCSS variables
│       └── _media.scss            # Media queries
│
├── public/                        # Static assets
│   ├── assets/
│   │   └── images/
│   │       ├── companylogo/
│   │       ├── partners/
│   │       └── staff/
│   └── videos/
│
└── .github/
    └── workflows/                 # CI/CD workflows
```

---

## Libraries & Dependencies

### Core Framework
- **Next.js** (v15.2.4) - React framework with SSR
- **React** (v19.0.0) - UI library
- **React DOM** (v19.0.0) - React DOM renderer

### State Management
- **Redux Toolkit** (v2.6.1) - State management
- **React Redux** (v9.2.0) - React bindings for Redux

### HTTP Client
- **Axios** (v1.8.4) - HTTP requests

### UI Components & Styling
- **React Bootstrap** (v2.10.9) - Bootstrap components for React
- **Bootstrap** (v5.3.3) - CSS framework
- **SASS** (v1.86.0) - CSS preprocessor

### Icons
- **React Icons** (v5.5.0) - Icon library (preferred)
- ~~Font Awesome~~ (legacy - being phased out)

### Forms & Validation
- **Formik** (v2.4.6) - Form management
- **Yup** (v1.6.1) - Schema validation

### Charts & Visualization
- **Chart.js** (v4.4.8) - Charts library
- **React Chartjs 2** (v5.3.0) - React wrapper for Chart.js

### UI Utilities
- **React Select** (v5.10.1) - Custom select components
- **React Modal** (v3.16.3) - Modal dialogs
- **React Toastify** (v11.0.5) - Toast notifications
- **React Tooltip** (v5.28.0) - Tooltips
- **React Slick** (v0.30.3) - Carousel/slider
- **Slick Carousel** (v1.8.1) - Carousel styles
- **Lucide React** (v0.544.0) - Additional icons
- **React Placeholder Loading** (v0.5.30) - Loading placeholders

### Data Processing
- **Moment.js** (v2.30.1) - Date manipulation
- **Lodash** (v4.17.21) - Utility functions
- **Fuse.js** (v7.1.0) - Fuzzy search
- **XLSX** (v0.18.5) - Excel file handling
- **XLSX JS Style** (v1.2.0) - Styled Excel exports
- **JSZip** (v3.10.1) - ZIP file handling
- **File Saver** (v2.0.5) - File downloads

### Authentication
- **React OAuth Google** (v0.12.1) - Google OAuth

### Monitoring
- **LogRocket** (v9.0.2) - Session replay & logging

### Storage
- **Reactjs LocalStorage** (v1.0.1) - Local storage wrapper

### Development & Testing
- **ESLint** (v9) - Linting
- **Jest** (v30.0.5) - Testing framework
- **Testing Library** - React testing utilities

---

## Styling Guidelines

### Preferred Approach
1. **Custom SCSS/CSS** - Write custom styles in `styles/` directory
2. **React Bootstrap** - Use Bootstrap components from `react-bootstrap`
3. **CSS Modules** - For component-specific styles (`.module.css`)

### Icon Library
- **USE:** `react-icons` for all new icons
- **AVOID:** Font Awesome (legacy, being phased out)

Example:
```jsx
// Correct
import { FaUser, FaHome } from 'react-icons/fa';
import { BiSearch } from 'react-icons/bi';

// Avoid
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
```

---

## Development Guidelines

### Code Formatting
**IMPORTANT:** When modifying any file, strictly maintain the existing formatting of that file, even if it doesn't follow best practices. Do not auto-format or change indentation, spacing, or style conventions already present in the file.

### Component Reusability
1. **Always check existing components first** before creating new ones
2. Look in these directories for reusable components:
   - `components/ui/` - UI primitives (Button, Dropdown, SearchBar, etc.)
   - `components/shared/` - Shared utilities (Loader, Pagination, FormikField, etc.)
   - `components/modal/` - Modal components (CommonModal, ConfirmationModal, etc.)
3. Only create a new component if no existing component can fulfill the requirement
4. Place new components in the appropriate directory based on their purpose

### Existing Reusable Components

#### UI Components (`components/ui/`)
- `Button.js` - Standard button component
- `Dropdown.js` - Dropdown component
- `SearchBar.js` - Search input component
- `FaqAccordion.js` - FAQ accordion
- `FeatureCard.js` - Feature display card
- `FilePreview.js` - File preview component
- `HeroSection.js` - Hero section component
- `HeroVideo.js` - Video hero component
- `TestimonialCard.js` - Testimonial card
- `TenderSummary.js` - Tender summary display
- `ColourfulCard.js` - Colored card component
- `DynamicCard.js` - Dynamic content card
- `CtaSection.js` - Call-to-action section
- `RegisterFormModal.js` - Registration form modal

#### Shared Components (`components/shared/`)
- `Loader.js` - Loading spinner
- `FullLoader.js` - Full-page loader
- `Pagination.js` - Pagination component
- `FormikField.js` - Formik form field wrapper
- `CommonFormInput.js` - Standard form input
- `SmartButton.js` - Enhanced button with loading state
- `FileLink.js` - File link display
- `ImagesUpload.js` - Image upload component
- `MediaRender.js` - Media rendering component
- `ReadMore.js` - Read more/less text component
- `TitleCase.js` - Title case text component
- `ProfileImageUploader.js` - Profile image upload
- `ProductOverview.js` - Product overview display
- `LPRModal.js` - LPR modal component
- `InputModal.js` - Input modal component
- `DropdownMenu.js` - Dropdown menu component
- `FilterSection.js` - Filter section component
- `HotelFilter.js` - Hotel filter component
- `LocationFilter.js` - Location filter component
- `HospitalityContextBadge.js` - Hospitality context badge
- `ChartConfig/` - Chart configuration utilities

#### Modal Components (`components/modal/`)
- `CommonModal.js` - Base modal component
- `ConfirmationModal.js` - Confirmation dialog
- `AuthModal.js` - Authentication modal
- `CommentModal.js` - Comment input modal
- `ContactUsModal.js` - Contact form modal
- `DynamicFormModal.js` - Dynamic form modal
- `DynamicFormSpoc.js` - SPOC form modal
- `InputModal.js` - Generic input modal
- `LocationModal.js` - Location selection modal
- `ProductSearchModal.js` - Product search modal
- `QuoteHistoryModal.js` - Quote history display
- `QuoteStatus.js` - Quote status modal
- `RegisterUserModal.js` - User registration modal
- `SubscriptionModal.js` - Subscription modal
- `VendorSelectionModal.js` - Vendor selection modal
- `VendorQuoteHistoryModal.js` - Vendor quote history
- `RegretQuoteReasonModal.js` - Quote regret reason
- `ExtractedQuotesModal.js` - Extracted quotes display
- `NormalizeInfoModal.js` - Normalize info modal
- `MagicSearchDownloadModal.js` - Magic search download
- `DownloadReportsForBuyer.js` - Report download modal
- `AddTenderItemModal.js` - Add tender item modal
- `MapSpocModal.js` - Map SPOC modal
- `CustomRolePermissionsModal.js` - Role permissions modal
- `SuccessStoryModal.js` - Success story modal
- `LoginWithOtherDeviceModal.js` - Device login modal

---

## NPM Scripts

```bash
npm run dev          # Start development server
npm run build:dev    # Build for development
npm run build:prod   # Build for production
npm run build:test   # Build for testing
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Jest tests
```

---

## Environment Files

- `.env.development` - Development environment
- `.env.production` - Production environment
- `.env.test` - Test environment
