import React from "react";

export function TransactionErrorMessage({ message, dismiss }) {
  return (
    <div className="alert" role="alert">
      {message}
      <button
        type="button"
        className="close"
        data-dismiss="alert"
        aria-label="Close"
        onClick={dismiss}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
