"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { BsChevronDown, BsChevronRight, BsPencil, BsShieldLock } from "react-icons/bs";
import { getRoles, getAllPermissions, getRolePermissions } from "@/services/rbac";
import CustomRolePermissionsModal from "@/components/modal/CustomRolePermissionsModal";
import InfoTip from "@/components/shared/InfoTip";
import Loader from "@/components/shared/Loader";
import {
  getResourceLabel,
  getResourceDescription,
  getActionLabel,
  getActionHelp,
} from "@/components/dashboard/admin/shared/permissionLabels";
import styles from "./Access.module.css";

const COVERAGE_HELP =
  "Coverage is the share of all available permissions this role grants — 100% would mean the role can do everything the platform offers. It is a rough measure of how powerful a role is, not a target to aim for: most good roles are deliberately narrow.";

const SYSTEM_ROLE_HELP =
  "Built-in roles ship with the platform and are used by the approval engine, so their permissions cannot be edited. To grant a different combination, create a custom role.";

/**
 * Access — what each role actually means.
 *
 * Role definitions used to live entirely inside a modal opened from a button
 * on the user list, and that modal listed only roles somebody at this company
 * had created. Every built-in role — Commercial Approver, Technical Evaluator,
 * Final Awarding P1 — was invisible. An admin could assign "Commercial
 * Approver" to a person without any way to find out what it let them do.
 *
 * This page lists every role, built-in and custom, and lets you expand one to
 * read its permissions in plain language. Editing still happens in the
 * existing modal, opened straight into the editor.
 */
const AccessPage = () => {
  const [roles, setRoles] = useState([]);
  const [catalogue, setCatalogue] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [permsByRole, setPermsByRole] = useState({});
  const [loadingPerms, setLoadingPerms] = useState(null);

  const [modal, setModal] = useState({ open: false, action: null, role: null });

  const totalPermissions = useMemo(
    () => Object.values(catalogue).reduce((n, items) => n + (items?.length || 0), 0),
    [catalogue]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([getRoles(), getAllPermissions()]);
      setRoles(rolesRes?.data?.data || rolesRes?.data || []);
      setCatalogue(permsRes?.data || {});
      setLoadError(null);
    } catch (err) {
      setLoadError("Could not load roles and permissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRole = useCallback(
    async (role) => {
      if (expandedId === role.id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(role.id);
      // Fetched on expand rather than up front: there are ~30 roles and
      // pre-loading every one costs 30 requests to answer a question the
      // admin has about exactly one of them.
      if (permsByRole[role.id]) return;
      setLoadingPerms(role.id);
      try {
        const res = await getRolePermissions(role.id);
        setPermsByRole((prev) => ({ ...prev, [role.id]: res?.data || {} }));
      } catch (err) {
        toast.error(`Could not load permissions for ${role.title}`);
        setExpandedId(null);
      } finally {
        setLoadingPerms(null);
      }
    },
    [expandedId, permsByRole]
  );

  const closeModal = useCallback(() => {
    setModal({ open: false, action: null, role: null });
    setPermsByRole({});
    load();
  }, [load]);

  const { custom, builtIn } = useMemo(
    () => ({
      custom: roles.filter((r) => r.created_by !== null),
      builtIn: roles.filter((r) => r.created_by === null),
    }),
    [roles]
  );

  const coverageFor = (roleId) => {
    const granted = permsByRole[roleId];
    if (!granted || !totalPermissions) return null;
    const n = Object.values(granted).reduce((sum, actions) => sum + (actions?.length || 0), 0);
    return { granted: n, pct: Math.round((n / totalPermissions) * 100) };
  };

  const renderRole = (role, { editable }) => {
    const open = expandedId === role.id;
    const coverage = coverageFor(role.id);
    return (
      <li key={role.id} className={styles.roleItem}>
        <div className={styles.roleRow}>
          <button
            type="button"
            className={styles.roleToggle}
            onClick={() => toggleRole(role)}
            aria-expanded={open}
          >
            {open ? <BsChevronDown size={12} /> : <BsChevronRight size={12} />}
            <span className={styles.roleName}>{role.title}</span>
            {!editable && (
              <span className={styles.builtInBadge}>
                <BsShieldLock size={10} /> Built-in
              </span>
            )}
            {coverage && (
              <span className={styles.coverageChip}>
                {coverage.granted} of {totalPermissions}
              </span>
            )}
          </button>
          {editable && (
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => setModal({ open: true, action: "edit", role })}
            >
              <BsPencil size={12} /> Edit
            </button>
          )}
        </div>

        <p className={styles.roleDescription}>
          {role.description || "No description provided."}
        </p>

        {open && (
          <div className={styles.rolePermissions}>
            {loadingPerms === role.id ? (
              <p className={styles.permsLoading}>Loading permissions…</p>
            ) : (
              <>
                {coverage && (
                  <div className={styles.coverageRow}>
                    <span className={styles.coverageLabel}>
                      {coverage.pct}% coverage
                      <InfoTip label="What coverage means" text={COVERAGE_HELP} />
                    </span>
                    <div className={styles.coverageTrack}>
                      <div
                        className={styles.coverageFill}
                        style={{ width: `${coverage.pct}%` }}
                      />
                    </div>
                  </div>
                )}
                {!editable && <p className={styles.systemNote}>{SYSTEM_ROLE_HELP}</p>}
                {renderGrants(permsByRole[role.id])}
              </>
            )}
          </div>
        )}
      </li>
    );
  };

  const renderGrants = (granted) => {
    const resources = Object.keys(catalogue).filter(
      (resource) => (granted?.[resource] || []).length > 0
    );
    if (resources.length === 0) {
      return (
        <p className={styles.noGrants}>
          This role grants no permissions. Anyone holding it can sign in but cannot
          act on RFQs, contracts or orders.
        </p>
      );
    }
    return (
      <ul className={styles.grantList}>
        {resources.map((resource) => (
          <li key={resource} className={styles.grantGroup}>
            <div className={styles.grantResource}>
              {getResourceLabel(resource)}
              <InfoTip
                label={`What ${getResourceLabel(resource)} covers`}
                text={getResourceDescription(resource)}
              />
            </div>
            <div className={styles.grantActions}>
              {(granted[resource] || []).map((action) => (
                <span key={action} className={styles.grantAction} title={getActionHelp(action)}>
                  {getActionLabel(action)}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Access</h1>
          <p className={styles.subtitle}>
            What each role is allowed to do. Assign roles to people under People.
          </p>
        </div>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => setModal({ open: true, action: "create", role: null })}
        >
          Create role
        </button>
      </header>

      {loadError && <div className={styles.errorBanner}>{loadError}</div>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Your roles
          <span className={styles.sectionCount}>{custom.length}</span>
        </h2>
        {custom.length === 0 ? (
          <p className={styles.sectionEmpty}>
            No custom roles yet. The built-in roles below cover most procurement
            setups; create a custom role when you need a combination they do not offer.
          </p>
        ) : (
          <ul className={styles.roleList}>
            {custom.map((role) => renderRole(role, { editable: true }))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Built-in roles
          <span className={styles.sectionCount}>{builtIn.length}</span>
          <InfoTip label="Why built-in roles cannot be edited" text={SYSTEM_ROLE_HELP} />
        </h2>
        <ul className={styles.roleList}>
          {builtIn.map((role) => renderRole(role, { editable: false }))}
        </ul>
      </section>

      {modal.open && (
        <CustomRolePermissionsModal
          isOpen={modal.open}
          onClose={closeModal}
          initialAction={modal.action}
          initialRole={modal.role}
        />
      )}
    </div>
  );
};

export default AccessPage;
