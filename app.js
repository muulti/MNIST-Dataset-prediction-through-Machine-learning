const canvas = document.getElementById("grid");
const ctx = canvas.getContext("2d");

const CELL = 10, SIZE = 28;
canvas.width = canvas.height = SIZE * CELL;

const pixels = new Float32Array(SIZE * SIZE);
let drawing = false, model = null;


// Model
async function init() {
    try {
        const response = await fetch("./model.json");
        if (!response.ok) throw new Error(`Could not load model.json: ${response.status}`);
        model = await response.json();
        console.log("Model loaded");
    } catch (error) {
        console.error(error);
    }
}


// Drawing
canvas.addEventListener("pointerdown", e => {
    drawing = true;
    paint(e);
});

canvas.addEventListener("pointermove", e => {
    if (drawing) paint(e);
});

window.addEventListener("pointerup", () => drawing = false);

function paint(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / rect.width * SIZE);
    const y = Math.floor((e.clientY - rect.top) / rect.height * SIZE);

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= SIZE || yy >= SIZE) continue;

            const i = yy * SIZE + xx;
            pixels[i] = Math.min(1, pixels[i] + 0.4);
        }
    }

    render();
}


// Rendering
function render() {
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const value = Math.round(pixels[y * SIZE + x] * 255);
            ctx.fillStyle = `rgb(${value},${value},${value})`;
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
    }

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 1; i < SIZE; i++) {
        ctx.moveTo(i * CELL + .5, 0);
        ctx.lineTo(i * CELL + .5, SIZE * CELL);
        ctx.moveTo(0, i * CELL + .5);
        ctx.lineTo(SIZE * CELL, i * CELL + .5);
    }

    ctx.stroke();
}


// Buttons
document.getElementById("clear").addEventListener("click", clearGrid);
document.getElementById("predict").addEventListener("click", predictDigit);

function clearGrid() {
    pixels.fill(0);
    render();
    document.getElementById("prediction").textContent = "Draw a digit";
    document.getElementById("probs").innerHTML = "";
}


// Model functions
function linear(input, W, b) {
    b = b.flat();
    return b.map((bias, j) =>
        input.reduce((sum, value, i) => sum + value * W[i][j], bias)
    );
}

function relu(values) {
    return values.map(x => Math.max(0, x));
}

function softmax(values) {
    const max = Math.max(...values);
    const exps = values.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
}

function predict(input) {
    let x = relu(linear([...input], model.W0, model.b0));
    x = relu(linear(x, model.W1, model.b1));
    return softmax(linear(x, model.W2, model.b2));
}


// Prediction
function predictDigit() {
    console.log("b0:", model.b0.length, model.b0[0]);
    console.log("b1:", model.b1.length, model.b1[0]);
    console.log("b2:", model.b2.length, model.b2[0]);

    console.log("W0 valid:", model.W0.flat().every(Number.isFinite));
    console.log("W1 valid:", model.W1.flat().every(Number.isFinite));
    console.log("W2 valid:", model.W2.flat().every(Number.isFinite));

    console.log("b0 valid:", model.b0.every(Number.isFinite));
    console.log("b1 valid:", model.b1.every(Number.isFinite));
    console.log("b2 valid:", model.b2.every(Number.isFinite));

    if (!model) {
        console.error("Model has not loaded yet.");
        return;
    }

    const probabilities = predict(pixels);
    const digit = probabilities.indexOf(Math.max(...probabilities));

    console.log("Probabilities:", probabilities);
    console.log("Max:", Math.max(...probabilities));
    console.log("Digit:", digit);

    document.getElementById("prediction").textContent = `Prediction: ${digit}`;
    showProbabilities(probabilities);
}

function showProbabilities(probabilities) {
    const container = document.getElementById("probs");
    container.innerHTML = "";

    probabilities.forEach((probability, digit) => {
        const row = document.createElement("div");
        row.className = "bar";

        row.innerHTML = `
            <span>${digit}</span>
            <div class="fill" style="width:${probability * 220}px"></div>
            <span>${(probability * 100).toFixed(1)}%</span>
        `;

        container.appendChild(row);
    });
}


// Start
render();
init();
