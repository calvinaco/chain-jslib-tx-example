import sdk, { Units } from "@crypto-org-chain/chain-jslib";
import axios from "axios";

const HDKey = sdk.HDKey;
const Secp256k1KeyPair = sdk.Secp256k1KeyPair;
const Bytes = sdk.utils.Bytes;

// Initializing the library configurations with TestNet config
const cro = sdk.CroSDK({ network: sdk.CroNetwork.TestnetCroeseid4 });

// Import an HDKey from a insecure, public-known mnemonic phrase as an example
// NEVER use this in production
const importedHDKey = HDKey.fromMnemonic(
  "curtain maid fetch push pilot frozen speak motion island pigeon habit suffer gap purse royal hollow among orange pluck mutual eager cement void panther"
);

// Derive a private key from an HDKey at the specified path
const privateKey = importedHDKey.derivePrivKey("m/44'/1'/0'/0/0");

// Getting a keyPair from a private key
const keyPair = Secp256k1KeyPair.fromPrivKey(privateKey);

// keyPair account address
const address = new cro.Address(keyPair).account();
console.log(`Address: ${address}`);

// Init Raw transaction
const rawTx = new cro.RawTransaction();

const fixedGasLimit = "500000";
const fixedGasPrice = "0.025"; // basecro

const feeAmount = new cro.Coin(
  new sdk.utils.Big(fixedGasLimit).times(fixedGasPrice).toFixed(0),
  Units.BASE
);

(async () => {
  //
  // Online machine - retrieve account details
  //
  const client = await cro.CroClient.connect();
  const account = await client.getAccount(address);
  // Alternatively
  // const response = await axios.get(`https://testnet-croeseid-4.crypto.org:1317/cosmos/auth/v1beta1/accounts/${address}`);
  if (account === null) {
    console.log("ERROR: account does not exist");
    process.exit(1);
  }
  const {
    accountNumber,
    sequence,
  } = account!;
  console.log(`Account number: ${accountNumber.toFixed(10)}`);
  console.log(`Account sequence: ${sequence.toFixed(10)}`);

  //
  // Offline signing
  //
  const neverExpire = "0";

  // Custom properties set
  rawTx.setMemo("Random Memo");
  rawTx.setGasLimit(fixedGasLimit);
  rawTx.setFee(feeAmount);
  rawTx.setTimeOutHeight(neverExpire);

  const msgSend = new cro.v2.bank.MsgSendV2({
    fromAddress: address,
    toAddress: "tcro165tzcrh2yl83g8qeqxueg2g5gzgu57y3fe3kc3",
    amount: [new cro.Coin("1000", Units.BASE)],
  });

  const signableTx = rawTx
    .appendMessage(msgSend)
    .addSigner({
      publicKey: keyPair.getPubKey(),
      accountNumber: new sdk.utils.Big(accountNumber),
      accountSequence: new sdk.utils.Big(sequence),
    })
    .toSignable();

  const signedTx = signableTx
    .setSignature(0, keyPair.sign(signableTx.toSignDoc(0)))
    .toSigned();

  const txHash = signedTx.getTxHash();
  const signedTxHex = signedTx.getHexEncoded()
  console.log(`Tx Hash: ${txHash}`);
  console.log(`Signed Tx Hex: ${signedTxHex}`);

  //
  // Online machine - broadcast transaction
  //
  // Broadcast using commit/block mode
  const response = await axios.get(`https://testnet-croeseid-4.crypto.org:26657/broadcast_tx_commit?tx=0x${signedTxHex}`);
  // Alternatively
  // const response = await client.broadcastTx(signedTxHex);
  console.log(JSON.stringify(response.data, null, 2));
})();
