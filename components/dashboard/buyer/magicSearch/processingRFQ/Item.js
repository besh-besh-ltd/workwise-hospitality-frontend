import moment from "moment";
import Link from "next/link";
import React from "react";
import { Badge, Button, OverlayTrigger, Tooltip } from "react-bootstrap";

const statusBadge = {
  processing: { variant: "info", label: "Processing", borderColor: "#17a2b8" },
  completed: { variant: "success", label: "Completed", borderColor: "#28a745" },
  failed: { variant: "danger", label: "Failed", borderColor: "#dc3545" },
  partially_completed: {
    variant: "warning",
    label: "Partially Completed",
    borderColor: "#ffc107",
  },
  terminated: {
    variant: "danger",
    label: "Terminated",
    borderColor: "#ffc107",
  },
};

const getDownloadURL = (url, excelToJson = false) => {
  if(process.env.NEXT_PUBLIC_ENV == "production" && !url.includes("https")) {
    url = url.replace("http", "https");
  }

  if(excelToJson) {
    url = url.replace("excel", "json");
  }

  return url;
}

const DraftRFQItem = ({ data, index, onViewErrors, handleCreateRFQ }) => {
  const calculateTimeTaken = (start, end) => {
    if (!start || !end) return "—";

    const startMoment = moment(start);
    const endMoment = moment(end);

    const duration = moment.duration(endMoment.diff(startMoment));

    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    const parts = [];

    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(" ");
  };

  const handleDownload = async (fileUrl) => {
    if (!fileUrl) return;

    const originalUrl = fileUrl;
    const replacedUrl = getDownloadURL(fileUrl);

    const tryDownload = async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`Fetch failed with status: ${response.status}`);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileUrl.split("/").pop() || "processed-boq.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        console.log("Download successful from:", url);
        return true;
      } catch (err) {
        console.error("Download failed from:", url, err);
        return false;
      }
    };

    // Try with replaced URL first
    const success = await tryDownload(replacedUrl);

    // Retry with original URL if the first fails
    if (!success) {
      await tryDownload(originalUrl);
    }
  };

  const processType = {
    simplified: { label: "BOQ Simplification", color: "success" },
    rfq: { label: "BOQ To RFQ", color: "primary" },
    "cost-estimation": { label: "Cost Estimation", color: "warning" },
    "tender-summary": { label: "Tender Summary", color: "secondary" },
  };

  const status = statusBadge[data.status] || {
    variant: "secondary",
    label: "Unknown",
    borderColor: "#6c757d",
  };

  const formattedStart = data.started_at
    ? moment(data.started_at).format("DD-MM-YY hh:mm A")
    : "—";

  const formattedEnd = data.completed_at
    ? moment(data.completed_at).format("DD-MM-YY hh:mm A")
    : "—";

  const errorTooltip = (
    <Tooltip id={`tooltip-${data.id}`}>View Errors</Tooltip>
  );

  return (
    <tr key={data.id}>
      <td className="fw-semibold">{index}</td>
      <td className="fw-semibold">
        {data.file_name}
      </td>
      <td>
        <Badge
          bg={processType[data.type]?.color || "primary"}
          className="px-3 py-2"
          style={{ fontWeight: 600 }}
        >
          {processType[data.type]?.label || 'Unknown'}
        </Badge>
      </td>
      <td>
        <Badge
          bg={status.variant}
          className="px-3 py-2"
          style={{ fontWeight: 600 }}
        >
          {status.label}
        </Badge>
      </td>
      <td>{formattedStart}</td>
      <td>{formattedEnd}</td>
      <td>{calculateTimeTaken(data.started_at, data.completed_at)}</td>
      <td>{data.persisted_rfq_id || "—"}</td>
      <td>
        <OverlayTrigger placement="top" overlay={errorTooltip}>
          <button className="bg-transparent border-0" onClick={onViewErrors}>
            <span style={{ cursor: data.errors ? "pointer" : "default" }}>
              {data.errors && typeof data.errors == "object"
                ? data.errors?.actual && Array.isArray(data.errors.actual) && data.errors.actual.length > 0
                  ? `Contain ${data.errors?.actual?.length || 1} Error${
                      (data.errors?.actual?.length || 1) > 1 ? "s" : ""
                    }`
                  : "—"
                : "—"}
            </span>
          </button>
        </OverlayTrigger>
      </td>
      {data.type == "simplified" ? (
        <td style={{maxWidth: 300}}>
          {data.status === "completed" ||
          data.status === "partially_completed" ? (
            <div className="d-flex flex-column gap-2">
              <div className="d-flex gap-2 justify-content-between">
                <Button
                  variant="success"
                  size="sm"
                  style={{ padding: "8px 0", width: "140px" }}
                  onClick={() => handleDownload(data.download_url)}
                >
                  Download
                </Button>
                <Link
                  href={`/dashboard/buyer/boq-automation/view?jsonUrl=${encodeURIComponent(
                    getDownloadURL(data.download_url, true)
                  )}`}
                  passHref
                >
                  <Button
                    variant="success"
                    size="sm"
                    style={{ padding: "8px 0", width: "140px" }}
                  >
                    View
                  </Button>
                </Link>
              </div>
              <div className="d-flex gap-2 justify-content-between">
                <Button
                  onClick={async () => {
                    console.log("data.download_url:", data.download_url, "data.file_name:", data.file_name)
                    await handleCreateRFQ(getDownloadURL(data.raw_file_url || data.download_url), data.file_name, data.raw_file_url)
                  }}
                  variant="primary"
                  size="sm"
                  style={{ padding: "8px 0", width: "100%" }}
                >
                  Create RFQ
                </Button>
                {data.raw_file_url && (
                  <Link
                    href={data.raw_file_url}
                    target="__blank"
                  >
                    <Button
                      variant="success"
                      size="sm"
                      style={{ padding: "8px 0", width: "140px" }}
                    >
                      Get Original
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            "-"
          )}
        </td>
      ) : data.type == 'rfq' ? (
        <td className="text-end">
          {data.status === "completed" ||
          data.status === "partially_completed" ? (
            <div className="d-flex gap-2">
            <Link
              href={data.is_published == 1 ? `/dashboard/buyer/rfq-management-details?type=buyer-view&id=${data.persisted_rfq_id}` : `/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${data.persisted_rfq_id}`}
              passHref
            >
              <Button
                variant="success"
                size="sm"
                style={{ padding: "8px 0", width: "140px" }}
              >
                View RFQ
              </Button>
            </Link>
            {data.raw_file_url && (
              <Link
                href={data.raw_file_url}
                target="__blank"
              >
                <Button
                  variant="success"
                  size="sm"
                  style={{ padding: "8px 0", width: "140px" }}
                >
                  Get Original
                </Button>
              </Link>
            )}
            </div>
          ) : (
            data.raw_file_url ? (
              <Link
                href={data.raw_file_url}
                target="__blank"
              >
                <Button
                  variant="success"
                  size="sm"
                  style={{ padding: "8px 0", width: "140px" }}
                >
                  Get Original
                </Button>
              </Link>
            ) : "-"
          )}
        </td>
      ) : (
        <td>
          {data.status === "completed" ||
          data.status === "partially_completed" ? (
            <div className="d-flex gap-2">
              <Link
                href={`/ai-tools/cost-estimation/${data.id}`}
                passHref
              >
                <Button
                  variant="success"
                  size="sm"
                  style={{ padding: "8px 0", width: "140px" }}
                >
                  View Estimation
                </Button>
              </Link>
            </div>
          ) : "-"}
        </td>
      )}
    </tr>
  );
};

export default DraftRFQItem;
