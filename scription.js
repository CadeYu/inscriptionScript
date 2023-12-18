const { ethers } = require('ethers');
//私钥
const private_key = "";
//接受钱包地址，其实就是发送的地址
const recipient_address = "";
//铭文信息
const data = '';
const rpc_map = {
    //具体区块链网络的rpc
    'mainnet': '',
};

function getTransactionEIP1559(rpcUrl, textData, priorityFee) {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    if (!provider._isProvider) {
        throw new Error("Not connected to Ethereum network");
    }

    const privateKey = private_key;
    const senderWallet = new ethers.Wallet(privateKey, provider);
    console.log(senderWallet.address)
    return Promise.all([
        senderWallet.getTransactionCount('pending'),
        provider.getBlock('latest').then((block) => block.baseFeePerGas),
        ethers.utils.parseUnits(priorityFee.toString(), 'gwei')
    ]).then(([nonce, baseFee, maxPriorityFeePerGas]) => {
        const maxFeePerGas = baseFee.add(maxPriorityFeePerGas);

        const transaction = {
            type: 2, 
            chainId: provider.network.chainId,
            nonce: nonce,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            maxFeePerGas: maxFeePerGas,
            gasLimit: 50000, 
            to: recipient_address,
            value: ethers.utils.parseEther("0"), 
            data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(textData))
        };

        console.log(`Transaction: ${JSON.stringify(transaction)}`);
        return { transaction, senderWallet, nonce };
    });
}

function signedSend({ transaction, senderWallet, nonce }, isWait = true) {
    return senderWallet.sendTransaction(transaction)
        .then((tx) => {
            console.log(`Transaction hash: ${tx.hash}`);
            if (isWait) {
                return senderWallet.provider.waitForTransaction(tx.hash)
                    .then((receipt) => {
                        console.log(`Transaction receipt: ${JSON.stringify(receipt)}`);
                        console.log(`Transaction status: ${receipt.status}`);
                    });
            }
        })
        .catch((error) => {
            console.error(`Error sending transaction: ${error.message}`);
        });
}

function sendTransaction(number, rpc, testData, isWait = true, priorityFee = 10) {
    return getTransactionEIP1559(rpc, testData, priorityFee)
        .then(({ transaction, senderWallet, nonce }) => {
            const promises = [];
            for (let i = 0; i < number; i++) {
                transaction.nonce = nonce + i;
                promises.push(signedSend({ transaction, senderWallet, nonce: nonce + i }, isWait));
            }
            return Promise.all(promises);
        });
}

if (require.main === module) {
    sendTransaction(10, rpc_map['mainnet'], data, false, 20);
}
