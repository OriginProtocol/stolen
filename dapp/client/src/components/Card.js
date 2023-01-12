import React from "react";

export function Card({ nft, buy, user, listed }) {
  const owned = user && user.toLowerCase() === nft.owner.toLowerCase();

  return (
    <div className="nft">
      <div className="image-container">
        <img src={nft.profile_image_url.replace('_normal', '')} alt={`${nft.username} Twitter avatar`} />
        <div className="stamp">Stolen</div>
      </div>
      <div className="metadata">
        <strong>@{nft.username}</strong>
      </div>
      {listed && (
        <div className="listing">
          <div className="price">{nft.price} ETH</div>
          {!owned ? (
            <button className="buy" onClick={() => buy(nft)}>Buy</button>
          ) : (
            <button className="owned">Owned</button>
          )}
        </div>
      )}
    </div>
  );
}