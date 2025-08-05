import { useEffect } from 'react';
import { useRouter } from 'next/router';

const VendorsPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/modules?module=vendors');
  }, [router]);

  return null;
};

export default VendorsPage; 