import React from "react";

import { ethers } from "ethers";

import { GiftIcon, MarkGithubIcon, SmileyIcon, SquirrelIcon } from '@primer/octicons-react';

import StolenArtifact from "../contracts/Stolen.json";
import contractAddress from "../contracts/contract-address.json";

import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { EthereumRequired } from "./EthereumRequired";
import { Account } from "./Account";
import { Bag } from "./Bag";
import { Marketplace } from "./Marketplace";
import { MintForm } from "./MintForm";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

const NETWORK_ID = process.env.REACT_APP_NETWORK_ID;
const NETWORK_NAME = process.env.REACT_APP_NETWORK_NAME;
const ALCHEMY_KEY = process.env.REACT_APP_ALCHEMY_KEY;

export class Home extends React.Component {
  constructor(props) {
    super(props);

    this.initialState = {
      alert: undefined,
      // tokenData: undefined,
      initialized: false,
      selectedAddress: undefined,
      collection: [],
      txBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
    };

    this._buy = this._buy.bind(this);
    this._mint = this._mint.bind(this);
    this._dismissTransactionError = this._dismissTransactionError.bind(this);

    this.state = this.initialState;
  }

  componentDidMount() {
    this._initialize();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.selectedAddress !== this.state.selectedAddress) {
      this._updateCollection();
    }
  }

  _initialize(userAddress) {
    this._initializeEthers(userAddress);
    // this._getTokenData();
    this._startPollingData();
    this._updateCollection();

    if (userAddress) {
      this.setState({
        selectedAddress: userAddress,
      });
    }
  }

  async _initializeEthers(userAddress) {
    this._readProvider = new ethers.providers.AlchemyProvider('goerli', ALCHEMY_KEY);
    this._writeProvider = new ethers.providers.Web3Provider(window.ethereum);

    if (userAddress) {
      this._writeProvider.send('eth_requestAccounts', []);
      this._contract = new ethers.Contract(
        contractAddress.Stolen,
        StolenArtifact.abi,
        this._writeProvider.getSigner(0)
      );
    } else {
      this._contract = new ethers.Contract(
        contractAddress.Stolen,
        StolenArtifact.abi,
        this._readProvider
      );
    }

    this.setState({ initialized: true });
  }

  // async _getTokenData() {
  //   const name = await this._contract.name();
  //   const symbol = await this._contract.symbol();

  //   this.setState({ tokenData: { name, symbol } });
  // }

  _startPollingData() {
    this._pollDataInterval = setInterval(() => this._updateCollection(), 600000);
  }

  async _connectWallet() {
    const [selectedAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });

    if (!this._checkNetwork()) {
      return;
    }

    this._initialize(selectedAddress);

    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this._stopPollingData();

      if (newAddress === undefined) {
        return this._resetState();
      }
      
      this._initialize(newAddress);
    });
    
    window.ethereum.on("chainChanged", ([networkId]) => {
      this._stopPollingData();
      this._resetState();
    });
  }

  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  _dismissTransactionError() {
    this.setState({ alert: undefined, transactionError: undefined });
  }

  _getRpcErrorMessage(error) {
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  }

  _resetState() {
    this.setState(this.initialState);
  }

  _checkNetwork() {
    if (window.ethereum.networkVersion === NETWORK_ID) {
      return true;
    }

    this.setState({ 
      networkError: `Please change your MetaMask network to ${NETWORK_NAME}`
    });

    return false;
  }

  async _mint(twitterId) {
    try {
      this._dismissTransactionError();

      const to = this.state.selectedAddress;
      const bn = ethers.BigNumber.from(twitterId);
      const tx = await this._contract.safeMint(to, bn);

      this.setState({ txBeingSent: tx.hash });

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      await this._updateCollection();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      console.error(error);

      const { message = '' } = error.error ? error.error.data : error;

      if (message.match('Address cannot own more than three tokens at a time')) {
        this.setState({ alert: `You can't have more than three NFTs at a time.` });
      } else if (message.match('ERC721: token already minted')) {
        this.setState({ alert: `This NFT has already been minted. You can buy it though.` });
      } else {
        alert('An unknown error has occurred. Try refreshing the page or check the console.');

        // this.setState({ alert: `An unknown error has occurred. Please check the console.` });
      }

      this.setState({ transactionError: error });
    } finally {
      this.setState({ txBeingSent: undefined });
    }
  }

  async _buy({ id, price }) {
    if (!this.state.selectedAddress) {
      return alert('Please connect a wallet (blue section).');
    }

    try {
      this._dismissTransactionError();

      const tx = await this._contract["purchase(uint256)"](id, {
        value: ethers.utils.parseEther(price),
      });

      this.setState({ txBeingSent: tx.hash });

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      await this._updateCollection();
    } catch (error) {
      if (error.match('cannot own more than three')) {
        alert(`You can't own more than three NFTs at a time. Wait for someone to steal yours.`);
      } else {
        alert('An unknown error has occurred. Try refreshing the page or check the console.');

        console.error(error)
      }
    } finally {
      this.setState({ txBeingSent: undefined });
    }
  }

  async _updateCollection() {
    console.log('_updateCollection');
    const filter = this._contract.filters.Transfer(ethers.constants.AddressZero);
    const events = await this._contract.queryFilter(filter);
    console.log('queryFilter');
    let collection = [];

    await Promise.all(events.map(async e => {
      const id = e.args.tokenId.toString();
      const owner = await this._contract.ownerOf(id);
      console.log('ownerOf', id);
      const queryString = `?id=${id}`;
      const response = await fetch(`/api/twitter${queryString}`);
      const parsed = await response.json();
      const minPrice = await this._contract.minPrice(id);
      console.log('minPrice', id);
      const price = ethers.utils.formatEther(minPrice);

      collection.push(Object.assign({}, parsed.data, { mintBlock: e.blockNumber, owner, price }));
    }));

    collection = collection.sort((a, b) => {
      return b.mintBlock - a.mintBlock;
    });

    this.setState({ collection });
  }

  // async _updateBag(userAddress) {
  //   const address = userAddress || this.state.selectedAddress;

  //   if (!address) {
  //     return;
  //   }

  //   const balance = await this._contract.balanceOf(address);

  //   let ids = [];
  //   const len = balance.toNumber();

  //   if (!len) {
  //     return;
  //   }

  //   for (let i = 0; i < len; i++) {
  //     const id = await this._contract.tokenOfOwnerByIndex(address, i);

  //     ids.push(id.toString());
  //   }

  //   ids.length && console.log(await this._contract.tokenURI(ids[0]));

  //   const queryString = `?ids=[${ids.join(',')}]`;
  //   const response = await fetch(`/api/twitter${queryString}`);
  //   const parsed = await response.json();
  //   const collection = parsed.data || [];

  //   this.setState({ collection });
  // }

  componentWillUnmount() {
    this._stopPollingData();
  }

  _stopPollingData() {
    clearInterval(this._pollDataInterval);

    this._pollDataInterval = undefined;
  }

  render() {
    const bag = this.state.collection.filter(nft => {
      const ownerAddress = nft.owner.toLowerCase();
      const userAddress = (this.state.selectedAddress || '').toLowerCase();

      return ownerAddress === userAddress;
    });

    if (!window.ethereum) {
      return <EthereumRequired />;
    }

    return this.state.initialized ? (
      <div className="app">
        <nav>
          <h1>
            Stolen - Literally the Worst DApp
          </h1>
          <p>
            Prove that you are someone's biggest fan. Own the NFT representing their Twitter account.
          </p>
        </nav>
        <section className="hero">
          <h2>How it works</h2>
          <p><em>The ultimate non-compliant, up-only degen money game</em></p>
          <div className="features">
            <p><GiftIcon /><u>Mint for free</u> Pick any Twitter account, get an NFT representing it. You can only have up to three at a time.</p>
            <p><SquirrelIcon /><u>Hodl on tight</u> Anyone can steal your NFT, but they have to pay for it. You will at least double your money&#42;.</p>
            <p><SmileyIcon /><u>Everything is for sale</u> You don&apos;t list your NFT. You can&apos;t sell it for a loss. You can&apos;t transfer it. But you can always buy it back.</p>
          </div>
          <p>Think everyone will want @elonmusk? Mint it if you still can. What's the worst that could happen?</p>
          <p className="disclaimer">&#42;Not guaranteed, DYOR</p>
        </section>
        <section className="work">
          <h2>Weird flex</h2>
          {this.state.selectedAddress ? (
            <Account address={this.state.selectedAddress} />
          ) : (
            <ConnectWallet 
              connectWallet={() => this._connectWallet()} 
              networkError={this.state.networkError}
              dismiss={() => this._dismissNetworkError()}
            />
          )}
          {window.ethereum === undefined && (
            <NoWalletDetected />
          )}
          {this.state.txBeingSent && (
            <WaitingForTransactionMessage txHash={this.state.txBeingSent} />
          )}
          <MintForm mint={this._mint} disabled={!this.state.selectedAddress} />
          {this.state.transactionError && (
            <TransactionErrorMessage
              message={this.state.alert}
              dismiss={() => this._dismissTransactionError()}
            />
          )}
          {bag.length > 0 && (
            <Bag nfts={bag} />
          )}
        </section>
        <section className="marketplace">
          <h2>Marketplace</h2>
          <p><em>Permissionless buying ftw</em></p>
          <Marketplace collection={this.state.collection} buy={this._buy} user={this.state.selectedAddress} />
        </section>
        <section className="fyi">
          <h2>FYI</h2>
          <p><em>Not your typical ERC-721</em></p>
          <ul>
            <li>Transfers are disabled. Don&apos;t try to send an NFT. It is only transferred when purchased.</li>
            <li>OpenSea, Blur, et al don&apos;t know how to handle this collection. You won&apos;t be able to list and sell on other marketplaces.</li>
            <li>Royalties of 10&#37; are enforced at the contract level. Some or all of these royalties could be claimed by the Twitter users represented by the NFTs.</li>
            <li>It&apos;s possible to steal NFTs for free in rare cases. If someone buys an NFT from a non-payable contract, you can slash them and take their collection.</li>
          </ul>
        </section>
        <footer>
          <p className="context">Created during Innovation Week, 2023 (<a href="https://originprotocol.com" target="_blank" rel="noreferrer">Origin Protocol</a>&apos;s internal hackathon)</p>
          <p>Sorry not sorry <a href="https://github.com/originprotocol/stolen" target="_blank" rel="noreferrer"><MarkGithubIcon size={16} /></a></p>
          <p>Contract address: {contractAddress.Stolen}</p>
        </footer>
      </div>
    ) : <Loading />;
  }
}
