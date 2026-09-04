import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  getApprovalProcesses,
  createApprovalProcess,
  updateApprovalProcess,
  deleteApprovalProcess,
} from "@/services/process";

const useProcessData = (companyId) => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProcesses = async () => {
    try {
      const response = await getApprovalProcesses({
        company_id: companyId,
      });
      const data = response?.data?.data || response?.data || [];
      setProcesses(data);
    } catch (error) {
      console.error("Error loading processes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadProcesses();
    }
  }, [companyId]);

  const refresh = useCallback(async () => {
    await loadProcesses();
  }, [companyId]);

  const handleCreateProcess = useCallback(
    async ({ name, description, process_type }) => {
      try {
        const response = await createApprovalProcess({
          company_id: parseInt(companyId),
          name,
          description: description || null,
          process_type: process_type || "RFQ",
        });
        toast.success("Process created successfully");
        await loadProcesses();
        return response?.data?.data || response?.data;
      } catch (error) {
        console.error("Error creating process:", error);
        toast.error(error?.message?.response?.data?.message || "Failed to create process");
        throw error;
      }
    },
    [companyId]
  );

  const handleUpdateProcess = useCallback(
    async (id, patch) => {
      try {
        await updateApprovalProcess(id, patch);
        toast.success("Process updated successfully");
        await loadProcesses();
      } catch (error) {
        console.error("Error updating process:", error);
        toast.error(error?.message?.response?.data?.message || "Failed to update process");
        throw error;
      }
    },
    []
  );

  const handleDeleteProcess = useCallback(
    async (id) => {
      try {
        await deleteApprovalProcess(id);
        toast.success("Process deleted successfully");
        await loadProcesses();
      } catch (error) {
        console.error("Error deleting process:", error);
        toast.error(
          error?.message?.response?.data?.message ||
            "Failed to delete process. It may have active policies or pending approvals."
        );
        throw error;
      }
    },
    []
  );

  return {
    processes,
    loading,
    refresh,
    handleCreateProcess,
    handleUpdateProcess,
    handleDeleteProcess,
  };
};

export default useProcessData;
