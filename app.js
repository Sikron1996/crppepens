import { ethers } from "https://esm.sh/ethers@6.13.4";
import EthereumProvider from "https://esm.sh/@walletconnect/ethereum-provider@2.17.2";
const CONTRACT_ADDRESS = "PASTE_CONTRACT_ADDRESS_HERE";
const PROJECT_ID = "fe55ea601c3e7e0925c0b33723d6b158";
const READ_RPC = "https://ethereum.publicnode.com";
const PRICE_ETH = "0.0001";
const ABI = ["function mint(uint256 amount) external payable","function PRICE() view returns (uint256)","function totalSupply() view returns (uint256)","function minted(address user) view returns (uint256)"];
let wcProvider,provider,signer,contract,readProvider,readContract,account;
const $=id=>document.getElementById(id), modal=$("walletModal");
function status(x){$("status").textContent=x}
function openModal(){modal.classList.remove("hidden")}
function closeModal(){modal.classList.add("hidden")}
function amount(){let a=Number($("amount").value);if(!a||a<1)a=1;if(a>100)a=100;$("amount").value=a;return a}
function initRead(){if(CONTRACT_ADDRESS==="PASTE_CONTRACT_ADDRESS_HERE"){status("Insert contract address in app.js");return false}readProvider=new ethers.JsonRpcProvider(READ_RPC);readContract=new ethers.Contract(CONTRACT_ADDRESS,ABI,readProvider);return true}
async function setup(p,acc){if(CONTRACT_ADDRESS==="PASTE_CONTRACT_ADDRESS_HERE")throw new Error("Insert contract address in app.js");provider=new ethers.BrowserProvider(p);signer=await provider.getSigner();account=acc||await signer.getAddress();contract=new ethers.Contract(CONTRACT_ADDRESS,ABI,signer);readContract=contract;$("wallet").textContent=account.slice(0,6)+"..."+account.slice(-4);$("connectBtn").style.display="none";$("mintBtn").style.display="inline-block";closeModal();await loadSupply();await updatePrice()}
async function connectBrowser(){try{if(!window.ethereum)throw new Error("Wallet extension not found");if(await window.ethereum.request({method:"eth_chainId"})!=="0x1")await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x1"}]});const acc=await window.ethereum.request({method:"eth_requestAccounts"});await setup(window.ethereum,acc[0])}catch(e){status("Error: "+(e.shortMessage||e.message))}}
async function connectWC(){try{wcProvider=await EthereumProvider.init({projectId:PROJECT_ID,chains:[1],optionalChains:[1],showQrModal:true});await wcProvider.connect();await setup(wcProvider,(wcProvider.accounts||[])[0])}catch(e){status("Error: "+(e.shortMessage||e.message))}}
async function loadSupply(){try{if(!readContract&&!initRead())return;const s=Number(await readContract.totalSupply());$("mintedText").textContent=s.toLocaleString();await updatePrice()}catch(e){status("Read error: "+(e.shortMessage||e.message))}}
async function updatePrice(){const a=BigInt(amount());let price=ethers.parseEther(PRICE_ETH);if(contract){try{price=await contract.PRICE()}catch(e){}}$("totalPrice").textContent=ethers.formatEther(price*a)+" ETH"}
async function mint(){try{if(!contract){openModal();return}const a=BigInt(amount());let price=ethers.parseEther(PRICE_ETH);try{price=await contract.PRICE()}catch(e){}status("Confirm mint...");const tx=await contract.mint(Number(a),{value:price*a});status("Tx: "+tx.hash);await tx.wait();status("Mint success");await loadSupply()}catch(e){status("Error: "+(e.shortMessage||e.message))}}
$("connectTop").onclick=openModal;$("connectBtn").onclick=openModal;$("closeModalBtn").onclick=closeModal;$("browserWalletBtn").onclick=connectBrowser;$("walletConnectBtn").onclick=connectWC;$("mintBtn").onclick=mint;$("minus").onclick=async()=>{$("amount").value=Math.max(1,amount()-1);await updatePrice()};$("plus").onclick=async()=>{$("amount").value=Math.min(100,amount()+1);await updatePrice()};$("amount").oninput=updatePrice;initRead();loadSupply();updatePrice();
