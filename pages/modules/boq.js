import { useEffect } from 'react';
import { useRouter } from 'next/router';

const BoqPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/modules?module=boq');
  }, [router]);

  return null;
};

export default BoqPage; 