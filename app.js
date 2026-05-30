import { ethers } from "https://esm.sh/ethers@6.13.4";
import EthereumProvider from "https://esm.sh/@walletconnect/ethereum-provider@2.17.2";

/*
  INSERT CONTRACT ADDRESS HERE
*/
const CONTRACT_ADDRESS = "0xc711A8e1d094d4870f2a26C03d80F704F037F7A5";

const PROJECT_ID = "fe55ea601c3e7e0925c0b33723d6b158";
const READ_RPC = "https://ethereum.publicnode.com";
const PRICE_ETH = "0.0001";

const ABI = [
  "function mint(uint256 amount) external payable",
  "function PRICE() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function minted(address user) view returns (uint256)"
];

let wcProvider, provider, signer, contract, readProvider, readContract, account;

const $ = id => document.getElementById(id);
const modal = $("walletModal");

function status(text){ $("status").textContent = text; }
function openModal(){ modal.classList.remove("hidden"); }
function closeModal(){ modal.classList.add("hidden"); }

function amount(){
  let a = Number($("amount").value);
  if(!a || a < 1) a = 1;
  if(a > 100) a = 100;
  $("amount").value = a;
  return a;
}

function initRead(){
  if(CONTRACT_ADDRESS === "PASTE_CONTRACT_ADDRESS_HERE"){
    status("Insert contract address in app.js");
    return false;
  }
  readProvider = new ethers.JsonRpcProvider(READ_RPC);
  readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, readProvider);
  return true;
}

async function setup(walletProvider, acc){
  if(CONTRACT_ADDRESS === "PASTE_CONTRACT_ADDRESS_HERE"){
    throw new Error("Insert contract address in app.js");
  }

  provider = new ethers.BrowserProvider(walletProvider);
  signer = await provider.getSigner();
  account = acc || await signer.getAddress();

  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  readContract = contract;

  $("wallet").textContent = account.slice(0,6) + "..." + account.slice(-4);
  $("connectBtn").style.display = "none";
  $("mintBtn").style.display = "inline-block";

  closeModal();
  await loadSupply();
  await updatePrice();
}

async function connectBrowser(){
  try{
    if(!window.ethereum) throw new Error("Wallet extension not found");

    if(await window.ethereum.request({ method:"eth_chainId" }) !== "0x1"){
      await window.ethereum.request({
        method:"wallet_switchEthereumChain",
        params:[{ chainId:"0x1" }]
      });
    }

    const acc = await window.ethereum.request({ method:"eth_requestAccounts" });
    await setup(window.ethereum, acc[0]);
  }catch(e){
    status("Error: " + (e.shortMessage || e.message));
  }
}

async function connectWC(){
  try{
    wcProvider = await EthereumProvider.init({
      projectId: PROJECT_ID,
      chains:[1],
      optionalChains:[1],
      showQrModal:true
    });
    await wcProvider.connect();
    await setup(wcProvider, (wcProvider.accounts || [])[0]);
  }catch(e){
    status("Error: " + (e.shortMessage || e.message));
  }
}

async function loadSupply(){
  try{
    if(!readContract && !initRead()) return;
    const supply = Number(await readContract.totalSupply());
    $("mintedText").textContent = supply.toLocaleString();
    await updatePrice();
  }catch(e){
    status("Read error: " + (e.shortMessage || e.message));
  }
}

async function getMintPrice(){
  if(contract){
    try { return await contract.PRICE(); } catch(e){}
  }
  return ethers.parseEther(PRICE_ETH);
}

async function getPaidAmount(){
  const qty = BigInt(amount());

  if(!contract || !account){
    return qty > 0n ? qty - 1n : 0n;
  }

  const alreadyMinted = await contract.minted(account);

  if(alreadyMinted === 0n){
    return qty > 0n ? qty - 1n : 0n;
  }

  return qty;
}

async function updatePrice(){
  try{
    const price = await getMintPrice();
    const paidAmount = await getPaidAmount();
    const total = price * paidAmount;
    $("totalPrice").textContent = total === 0n ? "FREE" : ethers.formatEther(total) + " ETH";

    const priceEl = document.querySelector(".price");
    if(priceEl) priceEl.textContent = "1 FREE · NEXT 0.0001 ETH";
  }catch(e){
    status("Price error: " + (e.shortMessage || e.message));
  }
}

async function mint(){
  try{
    if(!contract){
      openModal();
      return;
    }

    const qty = BigInt(amount());
    const price = await getMintPrice();
    const paidAmount = await getPaidAmount();
    const total = price * paidAmount;

    status("Confirm mint...");
    const tx = await contract.mint(Number(qty), { value: total });

    status("Tx: " + tx.hash);
    await tx.wait();

    status("Mint success");
    await loadSupply();
  }catch(e){
    status("Error: " + (e.shortMessage || e.message));
  }
}

$("connectTop").onclick = openModal;
$("connectBtn").onclick = openModal;
$("closeModalBtn").onclick = closeModal;
$("browserWalletBtn").onclick = connectBrowser;
$("walletConnectBtn").onclick = connectWC;
$("mintBtn").onclick = mint;

$("minus").onclick = async () => {
  $("amount").value = Math.max(1, amount() - 1);
  await updatePrice();
};

$("plus").onclick = async () => {
  $("amount").value = Math.min(100, amount() + 1);
  await updatePrice();
};

$("amount").oninput = updatePrice;

initRead();
loadSupply();
updatePrice();
