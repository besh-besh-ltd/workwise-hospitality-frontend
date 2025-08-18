import { useEffect } from 'react';
import { useRouter } from 'next/router';

const NegotiationPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/modules?module=negotiation');
  }, [router]);

  return null;
};

export default NegotiationPage; 