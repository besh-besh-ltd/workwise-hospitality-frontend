import React, { useEffect, useState } from 'react';
import { Badge, Card } from 'react-bootstrap';
import {
  MdEventNote,
  MdOutlineBusinessCenter,
  MdTimeline
} from 'react-icons/md';
import { BsBoxSeam, BsPerson, BsExclamationCircleFill, BsCheckCircleFill, BsXCircleFill } from 'react-icons/bs';
import { FiPaperclip } from "react-icons/fi";
import { HiOutlineTrash, HiPencil } from "react-icons/hi";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import CreateMilestoneModal from './CreateMilestoneModal';
import { toast } from 'react-toastify';
import { handleDeleteMilestone, handleDeleteTask, handleGetTasks } from '@/services/po';
import CreateTaskModal from './CreateTaskModal';
import Pagination from '@/components/shared/Pagination';
import { getProjectAvailableBudget } from '@/services/project';
import { addCommasToNumber, formatToINRShort } from '@/utils/sharedFunctions';
import Link from 'next/link';

const statusColors = {
  draft: 'secondary',
  pending_approval: 'warning',
  approved: 'success',
  sent: 'primary',
  GRN: 'info',
  completed: 'dark',
  cancelled: 'danger',
  rejected: 'danger',
};

const milestoneBadges = {
  pending: 'warning',
  achieved: 'success',
  cancelled: 'dark',
  deleted: 'danger'
}

const POStatusBadge = ({ status }) => (
  <Badge bg={statusColors[status] || 'secondary'} className="fs-6 px-3 py-2 float-end text-uppercase">
    {status.replace('_', ' ')}
  </Badge>
);

const PODetailItem = ({ label, value }) => (
  <div className="mb-2">
    <strong>{label}:</strong> {value}
  </div>
);

const TimelineItem = ({ title, name, icon, time, remarks }) => (
  <div className="d-flex align-items-start">
    <div style={{ fontSize: '1.5rem', color: '#0d6efd', marginRight: '0.8rem' }}>{icon}</div>
    <div>
      <h6 className='fw-semibold mb-0'>{title}</h6>
      <small className="text-muted">{name} • {time || 'N/A'}</small>
      {remarks && <div className="fst-italic text-muted text-sm">"{remarks}"</div>}
    </div>
  </div>
);

const renderDueDateCell = (dueDateStr, isTask = false) => {
  const today = new Date();
  const dueDate = new Date(dueDateStr);
  const timeDiff = dueDate - today;
  const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  const formattedDate = dueDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });

  const statusText =
    dayDiff > 0
      ? `Due in ${dayDiff} day${dayDiff > 1 ? "s" : ""}`
      : dayDiff === 0
      ? isTask ? "Completed Today" : "Due Today"
      : `${isTask ? "Completed" : "Past"} ${Math.abs(dayDiff)} day${Math.abs(dayDiff) > 1 ? "s" : ""} ${isTask ? "ago" : ""}`;

  const textColor = dayDiff < 0 ? isTask ? "text-success" : "text-danger" : dayDiff < 5 ? isTask ? "text-success" : "text-warning" : "text-success";

  return (
    <td className={`fw-semibold ${textColor}`}>
      {formattedDate}
      <br />
      <small className="text-muted">{statusText}</small>
    </td>
  );
};


const formatIST = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';

const elipsisToLimit = (text, limit = 45) => {
  return text.length > limit ? text.slice(0, limit).concat('...') : text;
}

const PurchaseOrderDetails = ({ data, handlePODecision, handleBack, refetchPODetails, companyUsers }) => {
  const {
    id,
    rfq_id,
    po_number,
    finalized_vendor_id,
    finalized_vendor_name,
    finalized_vendor_email,
    status,
    quantity,
    unit_price,
    total_value,
    initiated_by_name,
    created_at,
    project_id,
    project_details,
    product_details,
    is_approver,
    logged_in_user,
    approval_status,
    approval_history = [],
    payment_milestones,
    quotations,
    rfq_product_id,
  } = data;

  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [budgetInfo, setBudgetInfo] = useState(null);

  const [tasks, setTasks] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const handleMilestoneDeletion = async (id) => {
    try {
      const res = await handleDeleteMilestone(id);
      if(res) {
        toast.info("Milestone deleted successfully!")
        await refetchPODetails();
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message ?? "Something went wrong while deleting the milestone!");
    }
  }

  const handleTaskDeletion = async (id) => {
    try {
      const res = await handleDeleteTask(id);
      if(res) {
        toast.info("Milestone deleted successfully!")
        await refetchPODetails();
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message ?? "Something went wrong while deleting the milestone!");
    }
  }

  const handleFetchTasks = async () => {
    try {
      const res = await handleGetTasks(id, filters);
      if(res) {
        setTasks(res);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message ?? "Something went wrong while deleting the milestone!");
    }
  }

  const handleFetchBudget = async () => {
    try {
      if(!project_id) return;
      
      const res = await getProjectAvailableBudget(project_id);
      if(res) {
        setBudgetInfo(res);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const handleMilestoneEdition = (milestone) => {
    setSelectedMilestone(milestone);
    setShowMilestoneModal(true);
  }

  const handleTaskEdition = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  }

  useEffect(() => {
    handleFetchTasks();
  }, [filters])

  useEffect(() => {
    handleFetchBudget();
  }, [])

  return (
    <div>
      {/* Header */}
      <button
        onClick={handleBack}
        className="btn btn-primary p-2 mb-3 px-3"
        style={{ width: "fit-content" }}
      >
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
        Back
      </button>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h3 className="mb-1">Purchase Order #{po_number}</h3>
          <div className="text-muted">
            Initiated by: <strong>{initiated_by_name}</strong> on{" "}
            <strong>{formatIST(created_at)}</strong>
          </div>
        </div>
        <div className="d-flex gap-2 flex-column">
          <POStatusBadge status={status} />
          {is_approver && (
            <div className="d-flex gap-1 justify-content-between">
              <Badge
                onClick={async () => {
                  await handlePODecision(id, { decision: "approved" });
                  await refetchPODetails();
                }}
                bg={"success"}
                className="fs-6 px-2 py-1 float-end text-uppercase"
                style={{ cursor: "pointer" }}
              >
                Approve
              </Badge>
              <Badge
                onClick={async () => {
                  await handlePODecision(id, { decision: "rejected" });
                  await refetchPODetails();
                }}
                bg={"danger"}
                className="fs-6 px-3 py-1 float-end text-uppercase"
                style={{ cursor: "pointer" }}
              >
                Reject
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* PO Overview */}
      <div className="d-flex gap-2 align-items-center justify-content-between">
        <Card className="mb-3 shadow-sm" style={{ width: "100%" }}>
          <Card.Body
            style={{ padding: "0.8rem 1.25rem", paddingBottom: "0.4rem" }}
          >
            <div className="row">
              <div className="col-md-6">
                <PODetailItem label="Quantity" value={quantity} />
                <PODetailItem label="Unit Price" value={`₹ ${addCommasToNumber(unit_price)}`} />
                <PODetailItem label="Total Value" value={`₹ ${addCommasToNumber(total_value)}`} />
                {project_details && (
                  <PODetailItem label="Project Name" value={project_details.name} />
                )}
              </div>
              <div className="col-md-6">
                <PODetailItem label="Created At" value={formatIST(created_at)} />
                <PODetailItem label="Initiated By" value={initiated_by_name} />
                <PODetailItem
                  label="Status"
                  value={status.replace("_", " ").toUpperCase()}
                />
              </div>
            </div>
          </Card.Body>
        </Card>
        {
          budgetInfo && (
            <Card className="mb-3 shadow-sm" style={{ width: "100%", maxWidth: "30%" }}>
              <Card.Body
                style={{ padding: "0.8rem 1.25rem", paddingBottom: "0.4rem" }}
                className='d-flex flex-column'
              >
                <PODetailItem label="Total Assigned Budget" value={`₹${formatToINRShort(budgetInfo.total_budget)}`} />
                <PODetailItem label="Available Budget" value={`₹${formatToINRShort(budgetInfo.available_budget)}`} />
                <PODetailItem label="PO Value" value={`₹${formatToINRShort(total_value)}`} />
                <PODetailItem label="Budget if PO approves" value={`₹${formatToINRShort(budgetInfo.available_budget - total_value)}`} />
              </Card.Body>
            </Card>
          )
        }
      </div>

      {/* Product Details */}
      <div className="mb-3 d-flex gap-3">
        <Card className="shadow-sm w-100">
          <Card.Body className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <BsBoxSeam className="me-3 fs-2 text-primary" />
              <div>
                <strong>{product_details?.name}</strong>
                <div className="text-muted">
                  Product ID: {product_details?.product_id}
                </div>
              </div>
            </div>
            <Link href={`/dashboard/buyer/quote-compare?rfq=${rfq_id}&rfq_product_id=${rfq_product_id}&source=PO&tab=category`} className="btn p-2 btn-primary">Compare Quotes</Link>
          </Card.Body>
        </Card>
        <Link className='w-100' href={`/vendor/vendor-profile?id=${finalized_vendor_id}`} target='__blank'>
          <Card className="shadow-sm">
            <Card.Body className="d-flex align-items-center">
              <BsPerson className="me-3 fs-2 text-primary" />
              <div>
                <strong>{finalized_vendor_name}</strong> <small className='text-muted'>(Finalized Vendor)</small>
                <div className="text-muted">
                  {finalized_vendor_email}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Link>
      </div>


      {/* Approval Timeline */}
      <h5 className="mb-3">
        <MdEventNote className="me-2" />
        Approval Timeline
      </h5>
      <Card className="mb-4">
        <Card.Body className="d-flex flex-column gap-3">
          <TimelineItem
            title={"Initiated"}
            name={initiated_by_name}
            icon={<BsCheckCircleFill className="text-primary" size={25} />}
            time={formatIST(created_at)}
          />
          {approval_history.map((entry, index) => (
            <TimelineItem
              key={index}
              title={
                entry.action === "approved"
                  ? "Approved"
                  : entry.action === "rejected"
                  ? "Rejected"
                  : entry.action === "cancelled"
                  ? "Cancelled"
                  : "Action Taken"
              }
              name={entry.approved_by_name}
              icon={
                entry.action === "approved" ? (
                  <BsCheckCircleFill className="text-success" size={25} />
                ) : (
                  <BsXCircleFill className="text-danger" size={25} />
                )
              }
              time={formatIST(entry.created_at)}
              remarks={entry.remarks}
            />
          ))}
          {approval_status.status == "pending" && (
            <TimelineItem
              title={"Action Pending"}
              name={approval_status.current_approver_name}
              icon={
                <BsExclamationCircleFill className="text-warning" size={25} />
              }
              time={formatIST(approval_status.created_at)}
            />
          )}
        </Card.Body>
      </Card>

      {/* Payment Milestones */}
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <h5 className="mb-0">
          <MdOutlineBusinessCenter className="me-2" />
          Payment Milestones
        </h5>

        <button
          className="minimal-btn"
          onClick={() => setShowMilestoneModal(true)}
        >
          Add Milestone
        </button>
      </div>

      <Card className="overflow-hidden mb-3">
        <Card.Body className="table-responsive p-0">
          <table className="table table-stripped align-middle m-0 text-center">
            <thead className="table-light">
              <tr>
                <th>Reminder</th>
                <th>PO No</th>
                <th>Name</th>
                <th>Status</th>
                <th>Milestone Summary</th>
                <th>Due Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payment_milestones && payment_milestones.length > 0 ? (
                payment_milestones.map((milestone) => (
                  <tr key={milestone.id}>
                    <td
                      className={`fw-semibold ${
                        milestone.is_reminded ? "text-success" : "text-warning"
                      }`}
                    >
                      {milestone.status == "deleted"
                        ? "Deleted"
                        : milestone.is_reminded
                        ? "Reminded"
                        : "Pending"}
                    </td>
                    <td>
                      #<strong>{po_number}</strong>
                    </td>
                    <td style={{ maxWidth: 140 }}>
                      {milestone.milestone_name}
                    </td>
                    <td>
                      <Badge
                        bg={milestoneBadges[milestone.status]}
                        className="text-capitalize"
                      >
                        {milestone.status}
                      </Badge>
                    </td>
                    <td
                      style={{ maxWidth: 200 }}
                      title={milestone.milestone_description}
                    >
                      {elipsisToLimit(milestone.milestone_description, 45)}
                    </td>
                    {renderDueDateCell(
                      new Date(milestone.due_date).toDateString()
                    )}
                    <td>
                      {milestone.status != "deleted" ? (
                        <>
                          <button
                            title="Edit this Milestone"
                            className="minimal-btn"
                            style={{
                              backgroundColor: "#fdeceb",
                              borderColor: "#f5b5b5",
                              color: "#dc3545",
                            }}
                            onClick={() => handleMilestoneEdition(milestone)}
                          >
                            <HiPencil size={25} />
                          </button>
                          <button
                            title="Delete this Milestone"
                            className="minimal-btn ms-2"
                            style={{
                              backgroundColor: "#fdeceb",
                              borderColor: "#f5b5b5",
                              color: "#dc3545",
                            }}
                            onClick={() =>
                              handleMilestoneDeletion(milestone.id)
                            }
                          >
                            <HiOutlineTrash size={25} />
                          </button>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center text-muted">
                    No payment milestones found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card.Body>
      </Card>

      {/* Task Timelines */}
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <h5 className="mb-0">
          <MdTimeline className="me-2" />
          Status Timeline
        </h5>

        <button className="minimal-btn" onClick={() => setShowTaskModal(true)}>
          Add Task
        </button>
      </div>

      <Card className="overflow-hidden">
        <Card.Body className="table-responsive p-0">
          <table className="table table-stripped align-middle m-0 text-center">
            <thead className="table-light">
              <tr>
                <th>Completion Date</th>
                <th>PO No</th>
                <th>Name</th>
                <th>Status</th>
                <th>Task Summary</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks?.data && tasks.data.length > 0 ? (
                tasks.data.map((task) => (
                  <tr key={task.id}>
                    {renderDueDateCell(
                      new Date(task.completion_date).toDateString(),
                      true
                    )}
                    <td>
                      #<strong>{po_number}</strong>
                    </td>
                    <td style={{ maxWidth: 140 }}>{task.task_name}</td>
                    <td>
                      <Badge
                        bg={milestoneBadges[task.status]}
                        className="text-capitalize"
                      >
                        {task.status}
                      </Badge>
                    </td>
                    <td style={{ maxWidth: 200 }} title={task.task_description}>
                      {elipsisToLimit(task.task_description, 45)}
                    </td>
                    <td>
                      <button
                        title="Edit this Task"
                        className="minimal-btn"
                        style={{
                          backgroundColor: "#fdeceb",
                          borderColor: "#f5b5b5",
                          color: "#dc3545",
                        }}
                        onClick={() => handleTaskEdition(task)}
                      >
                        <HiPencil size={25} />
                      </button>
                      <button
                        title="Delete this Task"
                        className="minimal-btn ms-2"
                        style={{
                          backgroundColor: "#fdeceb",
                          borderColor: "#f5b5b5",
                          color: "#dc3545",
                        }}
                        onClick={() => handleTaskDeletion(task.id)}
                      >
                        <HiOutlineTrash size={25} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center text-muted">
                    No tasks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card.Body>
        <Card.Footer className='pt-3'>
          {tasks?.data && (
            <Pagination
              page={filters.page}
              setPage={(page) => setFilters((prev) => ({ ...prev, page }))}
              limit={filters.limit}
              setLimit={(limit) => setFilters((prev) => ({ ...prev, limit }))}
              totalData={tasks.total}
            />
          )}
          </Card.Footer>
      </Card>

      <CreateMilestoneModal
        show={showMilestoneModal}
        selectedMilestone={selectedMilestone}
        isEdit={selectedMilestone}
        onClose={() => {
          setShowMilestoneModal(false);
          setSelectedMilestone(null);
        }}
        onSuccess={async () => await refetchPODetails()}
        companyUsers={companyUsers}
        rfqId={rfq_id}
        poId={id}
      />

      <CreateTaskModal
        show={showTaskModal}
        selectedTask={selectedTask}
        isEdit={selectedTask}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedTask(null);
        }}
        onSuccess={async () => await handleFetchTasks()}
        rfqId={rfq_id}
        poId={id}
      />
    </div>
  );
};

export default PurchaseOrderDetails;