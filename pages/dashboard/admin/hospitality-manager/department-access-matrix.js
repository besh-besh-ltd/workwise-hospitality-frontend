import Head from "next/head";
import { useSelector } from "react-redux";
import { AdminGuard } from "@/utils/authGuard";
import DepartmentAccessMatrix from "@/components/dashboard/admin/hospitality-manager/department-access-matrix";

const DepartmentAccessMatrixPage = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const hasAccess = userProfile?.is_hospitality === 1 || userProfile?.is_hospitality === "1";

  if (!hasAccess) {
    return (
      <section className="buyer-sec-1">
        <div className="container-fluid">
          <div className="card buyer-card">
            <div className="card-body text-center py-5">
              <h4 className="mb-3">Hospitality access not enabled</h4>
              <p className="text-muted mb-4">
                Only hospitality companies can view the department access matrix.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <AdminGuard>
      <Head>
        <title>Department Access Matrix | Hospitality Manager</title>
      </Head>
      <DepartmentAccessMatrix />
    </AdminGuard>
  );
};

export default DepartmentAccessMatrixPage;
