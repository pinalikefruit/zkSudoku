const NETWORK_ID = 5

const MY_CONTRACT_ADDRESS = "0xAE47d472E7d442319378F55c3C02152aC6Afa0b6"
const MY_CONTRACT_ABI_PATH = "./assets/VerifierABI.json"
const PK_PATH = "./assets/pk.json"
const ZOK_PATH = "./assets/sudoku.zok"
var my_contract
var zokratesProvider

var accounts
var web3

function metamaskReloadCallback() {
  window.ethereum.on('accountsChanged', (accounts) => {
    document.getElementById("web3_message").textContent="Se cambió el account, refrescando...";
    window.location.reload()
  })
  window.ethereum.on('networkChanged', (accounts) => {
    document.getElementById("web3_message").textContent="Se el network, refrescando...";
    window.location.reload()
  })
}

const getWeb3 = async () => {
  return new Promise((resolve, reject) => {
    if(document.readyState=="complete")
    {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum)
        window.location.reload()
        resolve(web3)
      } else {
        reject("must install MetaMask")
        document.getElementById("web3_message").textContent="Error: Porfavor conéctate a Metamask";
      }
    }else
    {
      window.addEventListener("load", async () => {
        if (window.ethereum) {
          const web3 = new Web3(window.ethereum)
          resolve(web3)
        } else {
          reject("must install MetaMask")
          document.getElementById("web3_message").textContent="Error: Please install Metamask";
        }
      });
    }
  });
};

const getContract = async (web3, address, abi_path) => {
  const response = await fetch(abi_path);
  const data = await response.json();

  const netId = await web3.eth.net.getId();
  contract = new web3.eth.Contract(
    data,
    address
    );
  return contract
}

async function loadDapp() {
  //zokratesProvider = await zokrates.initialize()
  //metamaskReloadCallback()
  document.getElementById("web3_message").textContent="Please connect to Metamask"
  var awaitWeb3 = async function () {
    web3 = await getWeb3()
    web3.eth.net.getId((err, netId) => {
      if (netId == NETWORK_ID) {
        var awaitContract = async function () {
          my_contract = await getContract(web3, MY_CONTRACT_ADDRESS, MY_CONTRACT_ABI_PATH)
          document.getElementById("web3_message").textContent="You are connected to Metamask"
          onContractInitCallback()
          web3.eth.getAccounts(function(err, _accounts){
            accounts = _accounts
            if (err != null)
            {
              console.error("An error occurred: "+err)
            } else if (accounts.length > 0)
            {
              onWalletConnectedCallback()
              document.getElementById("account_address").style.display = "block"
            } else
            {
              document.getElementById("connect_button").style.display = "block"
            }
          });
        };
        awaitContract();
      } else {
        document.getElementById("web3_message").textContent="Please connect to Goerli";
      }
    });
  };
  awaitWeb3();
}

async function connectWallet() {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  accounts = await web3.eth.getAccounts()
  onWalletConnectedCallback()
}

loadDapp()

const onContractInitCallback = async () => {
  // Now the contracts are initialized
}

const onWalletConnectedCallback = async () => {
  // Now the account is initialized
}

async function getProof()
{
  a11 = document.getElementById("a11").value
  a12 = document.getElementById("a12").value
  a21 = document.getElementById("a21").value
  a22 = document.getElementById("a22").value

  b11 = document.getElementById("b11").value
  b12 = document.getElementById("b12").value
  b21 = document.getElementById("b21").value
  b22 = document.getElementById("b22").value

  c11 = document.getElementById("c11").value
  c12 = document.getElementById("c12").value
  c21 = document.getElementById("c21").value
  c22 = document.getElementById("c22").value

  d11 = document.getElementById("d11").value
  d12 = document.getElementById("d12").value
  d21 = document.getElementById("d21").value
  d22 = document.getElementById("d22").value

  zokratesProvider = await zokrates.initialize()

  const response = await fetch(ZOK_PATH);
  const source = await response.text();

  const artifacts = zokratesProvider.compile(source);
  const { witness, output } = zokratesProvider.computeWitness(artifacts, [a21, b11, b22, c11, c22, d21, a11, a12, a22, b12, b21, c12, c21, d11, d12, d22]);

  pkFile = await fetch(PK_PATH)
  pkJson = await pkFile.json()
  pk = pkJson.pk

  const proof = zokratesProvider.utils.formatProof(zokratesProvider.generateProof(
    artifacts.program,
    witness,
    pk
    ));

  return proof
}

const verify = async () => {
  var proof = await getProof()

  document.getElementById("proof").textContent="Proof: " + JSON.stringify(proof);

  var verificationResult = await my_contract.methods.verifyTx(proof[0], proof[1]).call()
  if(verificationResult)
  {
    alert("Success!");
  }
}

const mintWithProof = async () => {
  var proof = await getProof()
  const result = await my_contract.methods.mintWithProof(proof[0], proof[1])
  .send({ from: accounts[0], gas: 0, value: 0 })
  .on('transactionHash', function(hash){
    document.getElementById("web3_message").textContent="Executing...";
  })
  .on('receipt', function(receipt){
    document.getElementById("web3_message").textContent="Success.";    })
  .catch((revertReason) => {
    console.log("ERROR! Transaction reverted: " + revertReason.receipt.transactionHash)
  });
}