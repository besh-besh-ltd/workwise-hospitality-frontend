import { useEffect } from 'react';
import { useRouter } from 'next/router';

const EvaluationPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/modules?module=evaluation');
  }, [router]);

  return null;
};

export default EvaluationPage; 