import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import Select from 'react-select';
import axios from 'axios';
import { handleCreateMilestone, handleEditMilestone } from '@/services/po';
import { handleUploadFile } from '@/services/rfq';
import { toast } from 'react-toastify';

const CreateMilestoneModal = ({ show, onClose, onSuccess, companyUsers, selectedMilestone, isEdit, rfqId, poId }) => {
  const [form, setForm] = useState({
    milestone_name: selectedMilestone?.milestone_name ?? '',
    due_date: selectedMilestone?.due_date ?? '',
    milestone_description: selectedMilestone?.milestone_description ?? '',
    reminder_users: selectedMilestone?.reminder_users?.map((u) => ({ value: u.id, label: u.name })) ?? [],
    attachments: selectedMilestone?.attachments || [],
  });

  const [loading, setLoading] = useState(false);
  const [fileUploading, setFilesUploading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  async function handleFileChange(e) {
    try {
      const finalAttachments = [];
      const files = Array.from(e.target.files);
      
      setFilesUploading(true);
      for await (let file of files) {
        const res = await handleUploadFile(file);
        const fileUrl = res.data[0].file_path;
  
        finalAttachments.push({
          name: file.name,
          url: fileUrl
        })
      }
  
      setForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...finalAttachments]
      }));
      if(fileInputRef.current)
        fileInputRef.current.value = "";
    } catch (error) {
      toast.error(error.message || "Something went wrong while uploading files!")
    } finally {
      setFilesUploading(false);
    }
  }

  const handleUserChange = (selectedOptions) => {
    setForm({ ...form, reminder_users: selectedOptions || [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        rfq_id: rfqId,
        po_id: poId,
        milestone_name: form.milestone_name,
        due_date: form.due_date,
        milestone_description: form.milestone_description,
        reminder_users: form.reminder_users.map((user) => user.value),
        attachments: form.attachments,
      };

      const res = await isEdit ? handleEditMilestone(selectedMilestone.id, payload) : handleCreateMilestone(payload);
      await onSuccess(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to create milestone. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if(selectedMilestone) {
        setForm({
          milestone_name: selectedMilestone?.milestone_name ?? "",
          due_date: selectedMilestone?.due_date ?? "",
          milestone_description: selectedMilestone?.milestone_description ?? "",
          reminder_users: selectedMilestone?.reminder_users?.map((u) => ({ value: u.id, label: u.name })) ?? [],
          attachments: selectedMilestone?.attachments || []
        });
    }
  }, [selectedMilestone])

  const userOptions = companyUsers.map((u) => ({ value: u.id, label: u.name }));

  return (
    <Modal show={show} onHide={onClose} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="px-3 pt-2">
          <Modal.Title>
            {isEdit ? "Update" : "Create"} Payment Milestone
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}

          <Form.Group className="mb-3">
            <Form.Label>
              Milestone Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="milestone_name"
              value={form.milestone_name}
              onChange={handleInputChange}
              placeholder="e.g. 30% After 15 Days"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Due Date <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="date"
              name="due_date"
              value={form.due_date}
              onChange={handleInputChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Milestone Description <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="milestone_description"
              value={form.milestone_description}
              onChange={handleInputChange}
              placeholder="This reminder will be triggered after 15 days of PO."
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Reminder Users <span className="text-danger">*</span>
            </Form.Label>
            <Select
              isMulti
              options={userOptions}
              value={form.reminder_users}
              onChange={handleUserChange}
              placeholder="Select users to notify"
            />
          </Form.Group>

          <div className="mb-3">
            <Form.Label className="mt-3">Attachments</Form.Label>
            <div className="input-group">
              <input
                disabled={fileUploading}
                type="file"
                multiple
                className="form-control"
                id="reminderAttachment"
                placeholder='Please select some files...'
                onChange={handleFileChange}
                ref={fileInputRef}
                style={{ cursor: "pointer" }}
              />
            </div>
            {fileUploading && (
              <p className='mt-1 mb-0 text-muted fw-semibold'>Uploading files...</p>
            )}
            <div className="mt-2 d-flex flex-column gap-2 small">
              {form.attachments && form.attachments.length > 0 &&
                form.attachments.map((file) => {
                  return (
                    <a
                      href={file.url}
                      target='__blank'
                      className="d-flex gap-2 px-3 py-2 badge badge-primary"
                      style={{ fontSize: 12, width: "fit-content" }}
                    >
                      <span className="fw-semibold">{file.name}</span>
                      <button
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            attachments: prev.attachments.filter((_file) => _file.url !== file.url),
                          }))
                        }
                        className="bg-transparent outline-0 border-0 text-white fw-semibold"
                      >
                        X
                      </button>
                    </a>
                  );
              })}
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button className="p-2" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="p-2"
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : isEdit ? (
              "Update Milestone"
            ) : (
              "Create Milestone"
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateMilestoneModal;