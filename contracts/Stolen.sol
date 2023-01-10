/*
 * Origin Protocol
 * https://originprotocol.com
 *
 * Released under the MIT license
 * SPDX-License-Identifier: MIT
 * https://github.com/OriginProtocol/nft-launchpad
 *
 * Copyright 2023 Origin Protocol, Inc
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

pragma solidity ^0.8.9;

import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Stolen is Initializable, ERC721Upgradeable, ERC2981Upgradeable, ERC721EnumerableUpgradeable, ERC721BurnableUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    // Required price change for each subsequent purchase
    uint256 public priceChangeRate;
    // Required minimum price for initial purchase after mint
    uint256 public purchaseThreshold;

    // Mapping from token ID to last price paid
    mapping(uint256 => uint256) public lastPrices;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __ERC721_init("Stolen", "STOL");
        __ERC2981_init();
        __ERC721Enumerable_init();
        __ERC721Burnable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://temp.com";
    }

    function safeMint(address to, uint256 tokenId) public {
        // Restrict token ownership to one per account
        require(balanceOf(to) < 1, "Address cannot own more than one token at a time");

        _safeMint(to, tokenId);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        return interfaceId == type(IERC2981Upgradeable).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * Transfers are only supported in conjunction with purchases
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
    }

    /**
     * Transfers are only supported in conjunction with purchases
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
    }

    /**
     * Transfers are only supported in conjunction with purchases
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override {
    }

    /**
     * Calculates the minimum price required to purchase a given NFT
     */
    function minPrice(
        uint256 tokenId
    ) public view returns (uint256) {
        return lastPrices[tokenId] * (1 + priceChangeRate / _changeDenominator());
    }

    /**
     * Sends fee and proceeds to stakeholders, records the sale
     */
    function distributeFunds(
        uint256 tokenId,
        uint256 payment,
        address seller
    ) private {
        // Transfer royalty to receiver
        (address receiver, uint256 amount) = royaltyInfo(tokenId, payment);
        payable(receiver).transfer(amount);
        // Transfer remainder to prior token owner
        payable(seller).transfer(payment - amount);
        // Record the last price
        lastPrices[tokenId] = payment;
    }

    /**
     * Buying/stealing an NFT: the only way for a transfer to happen
     */
    function purchase(
        uint256 tokenId
    ) external payable {
        // Restrict token ownership to one per account
        require(balanceOf(_msgSender()) < 1, "Address cannot own more than one token at a time");
        require (msg.value > purchaseThreshold, "Price must be greater than minimum purchase threshold");
        require (msg.value >= minPrice(tokenId), "Price must be greater than minimum change");

        address seller = _ownerOf(tokenId);
        distributeFunds(tokenId, msg.value, seller);

        // Transfer token to purchaser, must be caller
        _safeTransfer(seller, _msgSender(), tokenId, "");
    }

    /**
     * Buying/stealing an NFT: the only way for a transfer to happen
     */
    function purchase(
        uint256 tokenId,
        bytes memory data
    ) external payable {
        // Restrict token ownership to one per account
        require(balanceOf(_msgSender()) < 1, "Address cannot own more than one token at a time");
        require (msg.value > purchaseThreshold, "Price must be greater than minimum purchase threshold");
        require (msg.value >= minPrice(tokenId), "Price must be greater than minimum change");

        address seller = _ownerOf(tokenId);
        distributeFunds(tokenId, msg.value, seller);

        // Transfer token to purchaser, must be caller
        _safeTransfer(seller, _msgSender(), tokenId, data);
    }

    /**
     * Inspired by the ERC2981 _feeDenominator
     */
    function _changeDenominator() internal pure returns (uint96) {
        return 10000;
    }

    /**
     * Sets the global royalty information
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * Sets the minimum required change in price for each purchase
     */
    function setPriceChangeRate(uint256 feeNumerator) external onlyOwner {
        priceChangeRate = feeNumerator;
    }

    /**
     * Sets the minimum required change in price for each purchase
     *
     * Note:
     *
     * - change is intended to be positive (100% causes price to double on each sale)
     * - if set to negative, it could throttle how quickly prices can fall
     * - currently linear, would be more interesting as a curve
     */
    function _setPriceChangeRate(uint256 feeNumerator) internal {
        priceChangeRate = feeNumerator;
    }

    /**
     * Sets the minimum price required for an initial purchase after minting
     */
    function setPurchaseThreshold(uint256 feeNumerator) external onlyOwner {
        purchaseThreshold = feeNumerator;
    }

    /**
     * Sets the minimum price required for an initial purchase after minting
     */
    function _setPurchaseThreshold(uint256 feeNumerator) internal {
        purchaseThreshold = feeNumerator;
    }
}
