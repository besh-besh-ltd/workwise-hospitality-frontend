import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  addComment
} from "@/services/rfq";
const BuyerVendorChat = ({ showChat, handleOpenChat, name, data, clauseId, createdBy }) => {
  console.log(`chat with ${name} and his messages are ${JSON.stringify(data, null, 2)} and type is ${typeof data}`);
  
  const dataToDisplay = Array.isArray(data) ? data : data.data;
  const [messageText, setMessageText] = useState("");  // State to hold the input message
  
  const handleSendMessage = () => {
    if (messageText.trim() === "") return;  // Prevent sending empty messages

    // Store the message details in an object (for now, we only store the message)
    const payload = {
      clause_id: clauseId,
      created_by: createdBy,
      text: messageText,
    };
    addComment(payload);

    console.log("New message details:", payload);

    // Clear the input field after sending the message
    setMessageText("");
  };

  return (
    <>
      {showChat && (
        <div
          className="modal fade show"
          style={{
            position: 'fixed',
            top: '0',
            left: '1070px',
            bottom: '0',
            width: '450px',
            backgroundColor: 'white',
            boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.3)',
            zIndex: 1050,
            borderLeft: '2px solid #ddd',
            height: '100vh',
            padding: '10px',
            display: 'block',
            overflow: 'hidden',
          }}
        >
          <div className="modal-header" style={{ borderBottom: '1px solid #ddd' }}>
            <h5 className="modal-title">{name}</h5>
            <button
              type="button"
              className="close"
              onClick={handleOpenChat}
              style={{ fontSize: '20px', color: '#000', padding: '1px 3px' }}
            >
              &times;
            </button>
          </div>
  
          <div
            className="modal-body"
            style={{
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
              paddingBottom: '60px',
            }}
          >
            <div
              className="chat-container"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '10px',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                marginBottom: '10px',
              }}
            >
              {dataToDisplay.map((message) => (
                <div
                  key={message.comment_id}
                  className="chat-message"
                  style={{
                    backgroundColor: message.created_by === 2 ? '#d1e7fd' : '#e3e3e3',
                    borderRadius: '20px',
                    padding: '10px',
                    alignSelf: message.created_by === 2 ? 'flex-end' : 'flex-start',
                  }}
                >
                  <p style={{ margin: '0', color: 'black' }}>
                    {message.created_by === 2 ? 'User 2:' : 'User 1:'} {message.comment_text}
                  </p>
                </div>
              ))}
            </div>
          </div>
  
          <div
            className="modal-footer"
            style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              padding: '10px',
              borderTop: '1px solid #ddd',
              backgroundColor: 'white',
              display: 'flex',
            }}
          >
            <input
              type="text"
              value={messageText}  // Bind the input value to the state
              onChange={(e) => setMessageText(e.target.value)}  // Update state on input change
              placeholder="Type a message..."
              className="form-control"
              style={{ marginRight: '10px' }}
            />
            <button className="btn btn-primary" onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
};

export default BuyerVendorChat;