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
            // [jogadorLinks[0]]
            jogadorLinks.forEach(async link => {
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
    console.log("fetchPlayerData")
    const player = {}
    const adr = await tentarAtePegarValor(() => {
        const adrElement = document.querySelector('.StatsBoxPlayerInfoItem__name')?.closest('.StatsBoxPlayerInfoItem__Content')?.querySelector('.StatsBoxPlayerInfoItem__value');
        const adrValue = adrElement ? adrElement.textContent : null;
        return adrValue
    })

    const statsItems = document.querySelectorAll('.StatsBoxPlayerInfoItem__Content');

    statsItems.forEach(item => {
        const nameElement = item.querySelector('.StatsBoxPlayerInfoItem__name');
        const valueElement = item.querySelector('.StatsBoxPlayerInfoItem__value');

        if (nameElement && valueElement) {
            const name = nameElement.textContent.trim();
            const value = valueElement.textContent.trim();

            // Formata o nome para usar como chave do objeto
            const formattedName = name.replace(/ /g, '_').replace('%', 'Percent').replace('.', '');

            player[formattedName] = value;
        }
    });

    let partidas = getPlayerPartidas()

    player.partidas = partidas

    sendResponse(player)
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("onMessage ", request)
    if (request.type === 'fetchPlayerData') {
        fetchPlayerData(request, sender, sendResponse)
    }
});

function getPlayerInfo(playerId) {
    console.log('getPlayerInfo', playerId)
    chrome.runtime.sendMessage({ type: 'getPlayerInfo', id: playerId }, (response) => {
        if (response) {
            console.log('Received response getPlayerInfo:', response);
            setPlayerInfo(response)
        } else {
            console.error('No response from background');
        }
    });
}

function setPlayerInfo(player) {
    if (player.ADR) {
        console.log("ADD DIV ADR")
        addDivToPlayerLink(player.playerId, "ADR", player.ADR)
    }

    if (player.KDR) {
        console.log("ADD DIV KDR")
        addDivToPlayerLink(player.playerId, "KDR", player.KDR)
    }

    processPlayerStats(player)
}

function processPlayerStats(player) {
    console.log('processing player stats', player)
    if (!player?.partidas) return

    Object.keys(player.partidas).forEach(game => {
        Object.keys(player.partidas[game]).forEach(grupo => {
            const vitoriasKey = 'vitorias';
            const derrotasKey = 'derrotas';
            const label = `${game}.${grupo}`;
            let vitorias = player.partidas[game][grupo][vitoriasKey] || 0
            let derrotas = player.partidas[game][grupo][derrotasKey] || 0
            addDivToPlayerLink(player.playerId, label, `v:${vitorias}/d:${derrotas}`);
        });
    });
}

function addDivToPlayerLink(playerId, label, value) {
    console.log("addDivToPlayerLink", playerId, label, value)
    // Seleciona o elemento <a> com a classe 'LobbyPlayerVertical' e o href especificado
    let playerLink = document.querySelector(`a.LobbyPlayerVertical[href='/jogador/${playerId}']`);

    if (playerLink) {
        console.log(`Player link found for ID: ${playerId}`);
        // Cria a nova div
        let newSpan = document.createElement("div")
        newSpan.style.fontSize = '10px'
        newSpan.textContent = label;
        newSpan.style.width = "100%"
        let newDiv = document.createElement('div');
        newDiv.textContent = value; // Adicione o conteúdo que desejar
        newDiv.style.color = 'wihte'; // Exemplo de estilização
        newDiv.style.fontSize = '12px'
        newDiv.style.width = "100%"
        playerLink.appendChild(newSpan);
        newSpan.appendChild(newDiv);
    } else {
        console.error(`Player link not found for ID: ${playerId}`);
    }
}

function getPlayerPartidas() {
    let partidas = { cs2: {}, csgo: {} };

    const historyCSGO = document.querySelector('#csgo-history-list');
    const historyCSGOItems = historyCSGO.querySelectorAll('.gc-card-history-item');
    historyCSGOItems.forEach(item => {
        parseVitoriasEDerrotas(item, "csgo")
    });

    const historyCS2 = document.querySelector('#cs2-history-list');
    const historyCS2Items = historyCS2.querySelectorAll('.gc-card-history-item');
    historyCS2Items.forEach(item => {
        parseVitoriasEDerrotas(item, "cs2")
    });

    function parseVitoriasEDerrotas(item, game) {
        const titleElement = item?.querySelector('.gc-card-history-title');
        const detailElements = item?.querySelectorAll('.gc-card-history-detail span');

        if (titleElement && detailElements.length >= 2) {
            const title = titleElement.textContent.trim();
            const vitorias = detailElements[0]?.textContent?.trim()?.split(' ')[0] || 0;
            const derrotas = detailElements[1]?.textContent?.trim()?.split(' ')[0] || 0;

            partidas[game][title] = {
                vitorias: vitorias,
                derrotas: derrotas
            };
        }
    }
    console.log(partidas)
    return partidas;
}