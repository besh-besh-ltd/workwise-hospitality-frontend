import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const BuyerVendorChat = ({ showChat, handleOpenChat, name }) => {
  return (
    <>
      {showChat && (
        <div
          className="modal fade show "
          style={{
            position: 'fixed',  // Ensure modal is fixed to the viewport
            top: '0',
            left: '1070px',       // Aligns to the right side of the screen
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
              style={{ fontSize: '20px', color: '#000', padding:"1px 3px" }}
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
              <div
                className="chat-message"
                style={{
                  backgroundColor: '#e3e3e3',
                  borderRadius: '20px',
                  padding: '10px',
                  alignSelf: 'flex-start',
                }}
              >
                <p style={{ margin: '0', color: 'black' }}>
                  User 1: Hey, how's it going?
                </p>
              </div>

              <div
                className="chat-message"
                style={{
                  backgroundColor: '#d1e7fd',
                  borderRadius: '20px',
                  padding: '10px',
                  alignSelf: 'flex-end',
                }}
              >
                <p style={{ margin: '0', color: 'black' }}>
                  User 2: I'm good, thanks! What about you?
                </p>
              </div>
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
              placeholder="Type a message..."
              className="form-control"
              style={{ marginRight: '10px' }}
            />
            <button className="btn btn-primary">Send</button>
          </div>
        </div>
      )}
    </>
  );
};

export default BuyerVendorChat;