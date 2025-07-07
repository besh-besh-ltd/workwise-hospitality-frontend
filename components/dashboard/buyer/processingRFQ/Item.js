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
};

const DraftRFQItem = ({ data }) => {
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
    <Tooltip id={`tooltip-${data.id}`}>{data.errors || "No errors"}</Tooltip>
  );

  return (
    <tr
      key={data.id}
      style={{
        borderLeft: `5px solid ${status.borderColor}`,
        backgroundColor:
          data.status === "failed"
            ? "#f8d7da"
            : data.status === "completed"
            ? "#d4edda"
            : data.status === "partially_completed"
            ? "#fff3cd"
            : data.status === "processing"
            ? "#d1ecf1"
            : "transparent",
      }}
    >
      <td className="fw-semibold">{data.id}</td>
      <td className="fw-semibold">{data.file_name}</td>
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
          <span style={{ cursor: data.errors ? "pointer" : "default" }}>
            {data.errors ? "Contain Errors" : "—"}
          </span>
        </OverlayTrigger>
      </td>
      <td>
        {data.status === "completed" ||
        data.status === "partially_completed" ? (
          <Link
            href={`/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${data.persisted_rfq_id}`}
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
        ) : (
          "-"
        )}
      </td>
    </tr>
  );
};

export default DraftRFQItem;
