import React from "react";

import { Card } from "./Card";

export function Bag({ nfts }) {
  return (
    <div className="bag">
      <p>Current bag</p>
      <div className="images">
        {nfts.map(nft => <Card key={nft.id} nft={nft} />)}
      </div>
    </div>
  );
}