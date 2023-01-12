import React from "react";

import { Card } from "./Card";

export function Marketplace({ buy, collection, user }) {
  return (
    <div className="listings">
      {collection.map(nft => (
        <Card key={`listing-${nft.id}`} nft={nft} buy={buy} user={user} listed />
      ))}
    </div>
  );
}