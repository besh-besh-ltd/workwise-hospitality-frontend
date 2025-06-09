import Head from "next/head";
import Link from "next/link";
import Image from "next/image";

const Custom404 = () => {
  return (
    <>
      <Head>
        <title>404 - Page Not Found | Workwise</title>
        <meta name="robots" content="noindex, follow" />
        <meta
          name="description"
          content="Workwise: The page you're looking for doesn't exist, was moved, or is temporarily unavailable."
        />
      </Head>

      <main
        className="d-flex flex-column justify-content-center align-items-center"
        style={{
          minHeight: "100vh",
          background: "#f4f7ff",
          textAlign: "center",
          padding: "40px",
        }}
      >


        <h1 className="fw-bold" style={{ fontSize: "3rem" }}>
          404
        </h1>
        <h2 className="mb-3">Oops! Page Not Found</h2>
        <p className="text-secondary mb-4" style={{ maxWidth: "460px", margin: "0 auto" }}>
          The page you are looking for might have been removed, had its name changed, or is
          temporarily unavailable.
        </p>

        <Link href="/" >
          <button className="btn btn-primary px-4 py-2 rounded">Go To Home</button>
        </Link>
      </main>
    </>
  );
};

export default Custom404;
