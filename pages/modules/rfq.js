import { useEffect } from 'react';
import { useRouter } from 'next/router';

const RfqPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/modules?module=rfq');
  }, [router]);

  return null;
};

export default RfqPage; 