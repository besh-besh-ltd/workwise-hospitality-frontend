import { useEffect } from 'react';
import { useRouter } from 'next/router';

const PaymentsPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/modules?module=payments');
  }, [router]);

  return null;
};

export default PaymentsPage; 