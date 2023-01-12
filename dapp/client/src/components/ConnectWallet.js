import React from "react";

import { NetworkErrorMessage } from "./NetworkErrorMessage";

export function ConnectWallet({ connectWallet, networkError, dismiss }) {
  return (
    <div className="connect-wallet">
      <button onClick={connectWallet}>
        Connect wallet
      </button>
      <div className="error-container">
        {networkError && (
          <NetworkErrorMessage 
            message={networkError} 
            dismiss={dismiss} 
          />
        )}
      </div>
    </div>
  );
}
