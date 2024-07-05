console.log('myplugin Background script running');

chrome.runtime.onInstalled.addListener(() => {
    console.log('myplugin Jogador Stats Fetcher instalado.');
});

class Gerente {
    constructor() {
        this.players = [];
    }

    start() {
        console.log("START");

        // chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        //     if (request.type === 'storeData') {
        //         this.players[request.key] = request.data;
        //         sendResponse({ status: 'success', data: this.players[request.key] });
        //     } else if (request.type === 'getData') {
        //         sendResponse({ status: 'success', data: this.players[request.key] || null });
        //     }
        // });

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log("onMessage", request)
            if (request.type === 'getPlayerInfo') {
                console.log("GET PLAYER INFO");
                chrome.tabs.create({ url: 'https://gamersclub.com.br/jogador/' + request.id, active: false }, (tab) => {
                    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
                        if (tabId === tab.id && changeInfo.status === 'complete') {
                            chrome.tabs.sendMessage(tabId, { type: 'fetchPlayerData' }, (response) => {
                                console.log("response fetchPlayerData", response)
                                sendResponse({ ...response, playerId: request.id });
                                setTimeout(() => {
                                    chrome.tabs.remove(tabId);
                                }, 1000);
                            });
                            chrome.tabs.onUpdated.removeListener(listener);
                        }
                    });
                });
                return true; // Keep the messaging channel open for sendResponse
            }
        });
    }
}

// Criação da instância de Gerente e chamada do método start
let gerente = new Gerente();
gerente.start();