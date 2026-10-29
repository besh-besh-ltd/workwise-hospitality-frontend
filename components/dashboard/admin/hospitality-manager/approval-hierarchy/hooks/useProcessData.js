import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import {
  getApprovalProcesses,
  createApprovalProcess,
  updateApprovalProcess,
  deleteApprovalProcess,
} from "@/services/process";
import { apiErrorMessage, apiErrorPayload } from "../../../shared/apiError";
import { formatProcessBlockers } from "../processBlockers";

const useProcessData = (companyId) => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const processesRef = useRef([]);
  processesRef.current = processes;

  // A refused deactivate/delete (409 PROCESS_IN_USE) lists what still depends
  // on the process; anything else keeps the server's own message.
  const refusalMessage = (error, id, fallback) => {
    if (apiErrorMessage.codeOf(error) === "PROCESS_IN_USE") {
      const name = processesRef.current.find((p) => p.id === id)?.name ?? "this process";
      const text = formatProcessBlockers(name, apiErrorPayload(error)?.data?.blockers);
      if (text) return text;
    }
    return apiErrorMessage(error, fallback);
  };

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
        toast.error(refusalMessage(error, id, "Failed to update process"));
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
          refusalMessage(
            error,
            id,
            "Failed to delete process. It may have active policies or pending approvals."
          )
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
