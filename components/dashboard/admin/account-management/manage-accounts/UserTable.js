import React from "react";
import { BsPeople } from "react-icons/bs";
import UserRow from "./UserRow";
import ProgressiveLoader from "./ProgressiveLoader";
import styles from "./ManageAccounts.module.scss";

const UserTable = ({
  users,
  isLoading,
  isHospitality,
  onEdit,
  onManageAccess,
  loadingSteps,
}) => {
  if (isLoading) {
    return (
      <div className={styles.tableCard}>
        <ProgressiveLoader steps={loadingSteps || []} />
      </div>
    );
  }

  if (!users.length) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <BsPeople size={36} />
          </div>
          <h3 className={styles.emptyTitle}>No accounts found</h3>
          <p className={styles.emptyDescription}>
            Try adjusting your filters or create a new account to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      <table className={styles.accountsTable}>
        <thead>
          <tr>
            <th>User</th>
            {isHospitality && <th>Workflow Roles</th>}
            <th>Department</th>
            <th>Created</th>
            {isHospitality && <th>Access</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((account) => (
            <UserRow
              key={account.id}
              account={account}
              isHospitality={isHospitality}
              mappings={account.mappings || []}
              roleScopes={account.role_scopes || []}
              departments={account.departments || []}
              onEdit={onEdit}
              onManageAccess={onManageAccess}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
