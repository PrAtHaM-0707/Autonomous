import React from 'react';
import './Card.css';

/**
 * Card Component
 * 
 * A container component for displaying content.
 * This file is in the ALLOWED zone for refactor-agent.
 */
const Card = ({ title, children, footer }) => {
  return (
    <div className="card">
      {title && (
        <div className="card-header">
          <h3>{title}</h3>
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
