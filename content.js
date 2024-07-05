const originalConsoleLog = console.log;

// Função para obter a data e hora formatadas
function getFormattedDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Janeiro é 0!
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

console.log = function (...args) {
    const prefix = `myplugin -- ${getFormattedDateTime()}`;
    originalConsoleLog.apply(console, [prefix, ...args]);
};

console.log("CONTENT STARTED")

async function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function tentarAtePegarValor(func, delay = 1000, tentativas = 30) {
    console.log("tentando pegar valor...")
    let count = 0;
    let value = null;
    while (!value && count < tentativas) {
        value = await func();
        if (value) break;
        count++;
        await delay(delay);
    }
    console.log("retornando ", value)
    return value;
}

function addButtonToRoomCards() {
    // Seleciona todas as divs com a classe RoomCardWrapper
    const roomCards = document.querySelectorAll('.RoomCardWrapper');

    roomCards.forEach(card => {
        if (card.querySelector('.myplugin-button')) {
            return;
        }

        card.style.position = "relative";
        // Cria um novo botão
        const button = document.createElement('button');
        button.innerText = 'Analisar';
        button.className = 'myplugin-button';
        button.style.margin = '0px';
        button.style.backgroundColor = '#e7e7e7';
        button.style.color = '#e7e7e7';
        button.style.top = '4px';
        button.style.position = 'absolute';
        button.style.color = "black";
        button.style.textTransform = "none";
        button.style.padding = "8px";
        button.style.left = "162px";

        // Adiciona um evento de clique ao botão
        button.addEventListener('click', () => {
            const jogadorLinks = card.querySelectorAll('[href^="/jogador/"]');
            if (!jogadorLinks.length) return
            [jogadorLinks[0]].forEach(async link => {
                console.log("click")
                const hrefVal = link.getAttribute('href');
                const idMatch = hrefVal.match(/\/jogador\/(\d+)$/);
                const jogadorId = idMatch ? idMatch[1] : null;
                getPlayerInfo(jogadorId)
            });
        });

        // Adiciona o botão à div RoomCardWrapper
        card.appendChild(button);
    });
}

setInterval(() => {
    addButtonToRoomCards();
}, 1000);

async function fetchPlayerData(request, sender, sendResponse) {
    const value = await tentarAtePegarValor(() => {
        const adrElement = document.querySelector('.StatsBoxPlayerInfoItem__name')?.closest('.StatsBoxPlayerInfoItem__Content')?.querySelector('.StatsBoxPlayerInfoItem__value');
        const adrValue = adrElement ? adrElement.textContent : null;
        return adrValue
    })
    sendResponse(value)
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("onMessage ", request.action)
    if (request.action === 'fetchPlayerData') {
        fetchPlayerData(request, sender, sendResponse)
    }
});

function getPlayerInfo(playerId) {
    chrome.runtime.sendMessage({ type: 'getPlayerInfo', id: playerId }, (response) => {
        if (response) {
            console.log('Received response getData:', id, response.message);
        } else {
            console.error('No response from background');
        }
    });
}
