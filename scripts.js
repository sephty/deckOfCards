// ===== VARIABLES PRINCIPALES DEL JUEGO =====
let deckId = "";
let playerMoney = 1000;
let currentBet = 0;
let playerHand = [];
let dealerHand = [];

// ===== OBTENER ELEMENTOS DEL HTML =====
const moneyDisplay = document.getElementById("money-display");
const dealerHandDiv = document.getElementById("dealer-hand");
const playerHandDiv = document.getElementById("player-hand");
const betInput = document.getElementById("bet-input");
const messageDiv = document.getElementById("message");
const dealerScoreText = document.getElementById("dealer-score-text");
const playerScoreText = document.getElementById("player-score-text");

const btnDeal = document.getElementById("btn-deal");
const btnHit = document.getElementById("btn-hit");
const btnStay = document.getElementById("btn-stay");
const btnRestart = document.getElementById("btn-restart");

// ===== OBTENER UN NUEVO MAZO MEZCLADO DESDE LA API =====
async function getNewDeck() {
    const response = await fetch("https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1");
    const data = await response.json();
    
    // Verificamos que exista deck_id antes de usarlo
    if (data && data.deck_id) {
        deckId = data.deck_id;
    }
}

// Llamamos la función apenas carga la página
getNewDeck();

// ===== CALCULAR PUNTUACIÓN (LOS ASES SON ESPECIALES) =====
function calculateScore(hand) {
    let score = 0;
    let aces = 0;

    for (let i = 0; i < hand.length; i++) {
        let cardValue = hand[i].value;

        if (cardValue === "JACK" || cardValue === "QUEEN" || cardValue === "KING") {
            score = score + 10;
        } else if (cardValue === "ACE") {
            score = score + 11;
            aces = aces + 1;
        } else {
            // Convertimos el valor string a número
            score = score + parseInt(cardValue);
        }
    }

    // Si nos pasamos de 21 y tenemos ases, convertimos 11 en 1
    while (score > 21 && aces > 0) {
        score = score - 10;
        aces = aces - 1;
    }

    return score;
}

// ===== ROBAR CARTAS DEL MAZO =====
async function drawCard(count) {
    const response = await fetch("https://deckofcardsapi.com/api/deck/" + deckId + "/draw/?count=" + count);
    const data = await response.json();
    
    // Verificamos que existan cartas antes de retornarlas
    if (data && data.cards) {
        return data.cards;
    }
    return [];
}

// ===== ACTUALIZAR TODA LA INTERFAZ =====
function updateUI(hideDealerCard) {

    // ---- Actualizar jugador ----
    playerHandDiv.innerHTML = "";
    for (let i = 0; i < playerHand.length; i++) {
        let img = document.createElement("img");
        img.src = playerHand[i].image;
        playerHandDiv.appendChild(img);
    }
    playerScoreText.innerText = calculateScore(playerHand);

    // ---- Actualizar crupier ----
    dealerHandDiv.innerHTML = "";
    for (let i = 0; i < dealerHand.length; i++) {
        let img = document.createElement("img");

        // Ocultamos la primera carta si la partida sigue activa
        if (i === 0 && hideDealerCard === true) {
            img.src = "https://deckofcardsapi.com/static/img/back.png";
        } else {
            img.src = dealerHand[i].image;
        }

        dealerHandDiv.appendChild(img);
    }

    // Mostrar o esconder puntuación del crupier
    if (hideDealerCard === true) {
        dealerScoreText.innerText = "?";
    } else {
        dealerScoreText.innerText = calculateScore(dealerHand);
    }

    // Actualizar dinero y apuesta
    moneyDisplay.innerText = "Dinero: $" + playerMoney + " | Apuesta Actual: $" + currentBet;
}

// ===== BOTÓN REPARTIR (INICIAR PARTIDA) =====
btnDeal.addEventListener("click", async function() {

    let betVal = parseInt(betInput.value);

    if (betVal > playerMoney || betVal <= 0) {
        messageDiv.innerText = "¡Apuesta inválida! Solo tienes $" + playerMoney;
        return;
    }

    // Configurar estado inicial de la partida
    currentBet = betVal;
    playerMoney = playerMoney - currentBet;
    playerHand = [];
    dealerHand = [];
    
    btnDeal.disabled = true;
    betInput.disabled = true;
    btnHit.disabled = false;
    btnStay.disabled = false;
    btnRestart.disabled = true;
    messageDiv.innerText = "¡Buena suerte!";

    // Mezclamos un nuevo mazo antes de empezar
    await getNewDeck();

    // Repartimos 4 cartas (2 para cada uno)
    let drawnCards = await drawCard(4);

    playerHand.push(drawnCards[0]);
    dealerHand.push(drawnCards[1]);
    playerHand.push(drawnCards[2]);
    dealerHand.push(drawnCards[3]);

    updateUI(true);

    // Si el jugador tiene 21 de inmediato
    if (calculateScore(playerHand) === 21) {
        endGame("¡Blackjack! ¡Ganaste!");
    }
});

// ===== BOTÓN PEDIR =====
btnHit.addEventListener("click", async function() {

    let cards = await drawCard(1);
    playerHand.push(cards[0]);
    
    let pScore = calculateScore(playerHand);
    updateUI(true);

    if (pScore > 21) {
        endGame("¡Te pasaste! Superaste 21.");
    }
});

// ===== BOTÓN PLANTARSE =====
btnStay.addEventListener("click", async function() {

    btnHit.disabled = true;
    btnStay.disabled = true;
    
    let dScore = calculateScore(dealerHand);

    // El crupier roba hasta tener al menos 17
    while (dScore < 17) {
        let cards = await drawCard(1);
        dealerHand.push(cards[0]);
        dScore = calculateScore(dealerHand);
    }

    updateUI(false); 

    let pScore = calculateScore(playerHand);
    
    if (dScore > 21) {
        endGame("¡El crupier se pasó! ¡Ganaste!");
    } else if (pScore > dScore) {
        endGame("¡Venciste al crupier!");
    } else if (dScore > pScore) {
        endGame("El crupier gana.");
    } else {
        endGame("¡Empate!");
    }
});

// ===== FINALIZAR PARTIDA =====
function endGame(msg) {

    messageDiv.innerText = msg;
    
    // Revisamos el mensaje para saber si ganó, perdió o empató
    if (msg.includes("Gan") || msg.includes("Venc")) {
        playerMoney = playerMoney + (currentBet * 2); 
    } else if (msg.includes("Empate")) {
        playerMoney = playerMoney + currentBet; 
    }

    currentBet = 0;
    updateUI(false);

    btnHit.disabled = true;
    btnStay.disabled = true;
    btnRestart.disabled = false;
}

// ===== BOTÓN REINICIAR =====
btnRestart.addEventListener("click", function() {

    playerHand = [];
    dealerHand = [];

    playerHandDiv.innerHTML = "";
    dealerHandDiv.innerHTML = "";

    playerScoreText.innerText = "0";
    dealerScoreText.innerText = "?";

    messageDiv.innerText = "Haz tu Apuesta!";
    
    btnDeal.disabled = false;
    betInput.disabled = false;
    btnRestart.disabled = true;
    
    moneyDisplay.innerText = "Dinero: $" + playerMoney + " | Apuesta Actual: $0";
    
    if (playerMoney <= 0) {
        messageDiv.innerText = "¡Te quedaste sin dinero! Recarga la página para recibir otros $1000.";
        btnDeal.disabled = true;
    }
});