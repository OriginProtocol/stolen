import React from "react";

export function WaitingForTransactionMessage({ txHash }) {
  return (
    <div className="alert alert-info" role="alert">
      Waiting for&nbsp;<a href={`https://goerli.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">transaction</a>&nbsp;to be mined
    </div>
  );
}
