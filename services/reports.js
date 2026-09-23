import axiosInstance from "@/lib/axios";
import { saveBlob, stamp } from "@/utils/download";

/* ─────────────────────────────────────────────────────────────────────────
   Reports.

   The catalogue is already filtered by entitlement server-side, so the page
   renders straight from it — there is no client-side permission check to keep
   in sync, and nothing is offered that the API would refuse.

   Preview and download are POSTs because the filter payload is a nested object
   and because a report URL should not be shoulder-surfable or land in an access
   log carrying the period and business units someone was looking at.

   Filters only. These helpers never send rows, ids, or a company/hotel id:
   scope is derived from the session, so whatever the user can see is what lands
   in the file and nothing else.
   ───────────────────────────────────────────────────────────────────────── */

/** GET /reports/catalogue — only the reports this user may run. */
export const getReportCatalogue = () => axiosInstance.get(`/reports/catalogue`);

/** POST /reports/:key/preview — the first rows, so filters can be checked. */
export const previewReport = (key, filters = {}) =>
  axiosInstance.post(`/reports/${key}/preview`, filters);

/** POST /reports/:key/download — streams the workbook and saves it. */
export const downloadReport = async (key, filters = {}) => {
  const blob = await axiosInstance.post(`/reports/${key}/download`, filters, {
    responseType: "blob",
  });
  saveBlob(blob, `${key.replace(/_/g, "-")}_${stamp()}.xlsx`);
};

/** GET /reports/exports — the caller's own export history. */
export const getExportHistory = (limit) =>
  axiosInstance.get(`/reports/exports`, { params: limit ? { limit } : {} });

export default { getReportCatalogue, previewReport, downloadReport, getExportHistory };
