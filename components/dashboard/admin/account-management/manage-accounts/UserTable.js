import React from "react";
import { BsPeople } from "react-icons/bs";
import UserRow from "./UserRow";
import styles from "./ManageAccounts.module.css";

const UserTable = ({
  users,
  isLoading,
  isHospitality,
  onEdit,
}) => {
  if (isLoading) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
        </div>
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
            <th>Employee Code</th>
            <th>Designation</th>
            <th>Mobile</th>
            <th>Status</th>
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
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
