import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import Select from 'react-select';
import axios from 'axios';
import { handleCreateMilestone, handleEditMilestone } from '@/services/po';

const CreateMilestoneModal = ({ show, onClose, onSuccess, companyUsers, selectedMilestone, isEdit, rfqId, poId }) => {
  const [form, setForm] = useState({
    milestone_name: selectedMilestone?.milestone_name ?? '',
    due_date: selectedMilestone?.due_date ?? '',
    milestone_description: selectedMilestone?.milestone_description ?? '',
    reminder_users: selectedMilestone?.reminder_users?.map((u) => ({ value: u.id, label: u.name })) ?? [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

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
        });
    }
  }, [selectedMilestone])

  const userOptions = companyUsers.map((u) => ({ value: u.id, label: u.name }));

  return (
    <Modal show={show} onHide={onClose} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="px-3 pt-2">
          <Modal.Title>{isEdit ? 'Update' : 'Create'} Payment Milestone</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}

          <Form.Group className="mb-3">
            <Form.Label>Milestone Name</Form.Label>
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
            <Form.Label>Due Date</Form.Label>
            <Form.Control
              type="date"
              name="due_date"
              value={form.due_date}
              onChange={handleInputChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Milestone Description</Form.Label>
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
            <Form.Label>Reminder Users</Form.Label>
            <Select
              isMulti
              options={userOptions}
              value={form.reminder_users}
              onChange={handleUserChange}
              placeholder="Select users to notify"
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button className='p-2' variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button className='p-2' type="submit" variant="primary" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : isEdit ? 'Update Milestone' : 'Create Milestone'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateMilestoneModal;