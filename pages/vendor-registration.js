import Head from 'next/head';
import VendorRegistrationForm from '../components/vendor-registration/VendorRegistrationForm';

const VendorRegistrationPage = () => {
  return (
    <>
      <Head>
        <title>Vendor Registration | Hospitality by Workwise</title>
        <meta
          name="description"
          content="Register as a vendor with Hospitality by Workwise."
        />
      </Head>
      <VendorRegistrationForm />
    </>
  );
};

export default VendorRegistrationPage;
