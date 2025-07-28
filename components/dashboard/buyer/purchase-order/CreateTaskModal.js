import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import Select from 'react-select';
import axios from 'axios';
import { handleCreateMilestone, handleCreateTask, handleEditMilestone, handleEditTask } from '@/services/po';

const CreateTaskModal = ({ show, onClose, onSuccess, selectedTask, isEdit, rfqId, poId }) => {
  const [form, setForm] = useState({
    task_name: selectedTask?.task_name ?? '',
    completion_date: selectedTask?.completion_date ?? '',
    status: selectedTask?.status ?? '',
    task_description: selectedTask?.task_description ?? '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        rfq_id: rfqId,
        po_id: poId,
        task_name: form.task_name,
        completion_date: form.completion_date,
        status: form.status,
        task_description: form.task_description,
      };

      const res = await isEdit ? handleEditTask(selectedTask.id, payload) : handleCreateTask(payload);
      await onSuccess(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if(selectedTask) {
        setForm({
          task_name: selectedTask?.task_name ?? "",
          completion_date: selectedTask?.completion_date ?? "",
          status: selectedTask.status ?? "",
          task_description: selectedTask?.task_description ?? "",
        });
    }
  }, [selectedTask])

  return (
    <Modal show={show} onHide={onClose} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="px-3 pt-2">
          <Modal.Title>{isEdit ? 'Update' : 'Create'} Task</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}

          <Form.Group className="mb-3">
            <Form.Label>Task Name</Form.Label>
            <Form.Control
              type="text"
              name="task_name"
              value={form.task_name}
              onChange={handleInputChange}
              placeholder="e.g. 30% After 15 Days"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Completion Date</Form.Label>
            <Form.Control
              type="date"
              name="completion_date"
              value={form.completion_date}
              onChange={handleInputChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Current Status</Form.Label>
            <Form.Control
              type="text"
              name="status"
              placeholder="Ex. Task Pending"
              value={form.status}
              onChange={handleInputChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Task Note</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="task_description"
              value={form.task_description}
              onChange={handleInputChange}
              placeholder="The Vendor has released the goods from the warehouse this morning!"
              required
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button className='p-2' variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button className='p-2' type="submit" variant="primary" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : isEdit ? 'Update Task' : 'Create Task'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateTaskModal;