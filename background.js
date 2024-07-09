console.log('myplugin Background script running');
class Gerente {
    constructor() {
        this.players = [];
    }

    start() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log("onMessage", request);
            if (request.type === 'getPlayerInfo') {
                console.log("GET PLAYER INFO");
                this.handleGetPlayerInfo(request.id).then(response => {
                    sendResponse(response);
                }).catch(error => {
                    sendResponse({ error: error.message });
                });
                return true;
            }
        });
    }

    async handleGetPlayerInfo(playerId) {
        const tab = await this.createTab(playerId);
        try {
            const response = await this.fetchPlayerData(tab.id, playerId);
            return response;
        } finally {
            chrome.tabs.remove(tab.id);
        }
    }

    createTab(playerId) {
        return new Promise((resolve, reject) => {
            chrome.tabs.create({ url: 'https://gamersclub.com.br/jogador/' + playerId, active: false }, tab => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError));
                } else {
                    resolve(tab);
                }
            });
        });
    }

    fetchPlayerData(tabId, playerId) {
        return new Promise((resolve, reject) => {
            const listener = (tabIdUpdated, changeInfo, tab) => {
                if (tabId === tabIdUpdated && changeInfo.status === 'complete') {
                    chrome.tabs.sendMessage(tabId, { type: 'fetchPlayerData' }, response => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError));
                        } else {
                            resolve({ ...response, playerId: playerId });
                        }
                    });
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    }
}

// Criação da instância de Gerente e chamada do método start
let gerente = new Gerente();
gerente.start();