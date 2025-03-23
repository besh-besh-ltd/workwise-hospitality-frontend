import Link from 'next/link';
import { textCapitalize } from '@/utils/sharedFunctions';

export const ProductBreadcrumb = ({ slug }) => {
  // If slug is not provided, undefined, or not an array, return just the "Products" link
  if (!slug || !Array.isArray(slug) || slug.length === 0) {
    return (
      <nav className="d-flex text-muted mb-4">
        <Link href="/products/all" className="text-decoration-none text-primary">
          Products
        </Link>
      </nav>
    );
  }

  return (
    <nav className="d-flex text-muted mb-4">
      {/* Always show the "Products" root link */}
      <Link href="/products/all" className="text-decoration-none text-primary">
        Products
      </Link>

      {/* Dynamically render each slug level */}
      {slug.map((slugPart, index) => {
        // Construct the URL for this level by joining all slug parts up to this index
        const url = `/products/${slug.slice(0, index + 1).join('/')}`;
        const displayText = slugPart === 'all' && index === 0 ? 'All Categories' : textCapitalize(slugPart.replace(/-/g, ' '));

        return (
          <span key={index}>
            {/* Separator */}
            <span className="mx-2">/</span>

            {/* If this is the last slug part, render it as plain text; otherwise, render as a link */}
            {index === slug.length - 1 ? (
              <span>{displayText}</span>
            ) : (
              <Link href={url} className="text-decoration-none text-primary">
                {displayText}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};