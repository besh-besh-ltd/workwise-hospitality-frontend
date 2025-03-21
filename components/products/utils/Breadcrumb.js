import Link from 'next/link';
import { textCapitalize } from '@/utils/sharedFunctions';

export const ProductBreadcrumb = ({ slug }) => (
  <nav className="d-flex text-muted mb-4">
    <Link href="/products/all" className="text-decoration-none text-primary">
      Products
    </Link>

    {slug?.length >= 1 && (
      <>
        <span className="mx-2">/</span>
        {slug[0] !== 'all' ? (
          <Link
            href={`/products/${slug[0]}`}
            className="text-decoration-none text-primary"
          >
            {textCapitalize(slug[0].replace(/-/g, " "))}
          </Link>
        ) : (
          <span>All Categories</span>
        )}
      </>
    )}

    {slug?.length >= 2 && (
      <>
        <span className="mx-2">/</span>
        <span>{textCapitalize(slug[1].replace(/-/g, " "))}</span>
      </>
    )}
  </nav>
);