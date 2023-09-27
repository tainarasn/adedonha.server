"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const server = require("http").createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
});
app.use((0, cors_1.default)());
// Step 1: Armazenando usuários por sala
const rooms = {};
const roomAnswers = {};
const letters = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
];
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    console.log(`Salas do cliente ${socket.id}:`, socket.rooms);
    socket.on("join-room", (data) => {
        const { roomId, username } = data;
        // Step 2: Atualizar lista de usuários
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }
        if (!rooms[roomId].some((user) => user.id === socket.id)) {
            rooms[roomId].push({ id: socket.id, username });
        }
        socket.join(roomId);
        console.log(`User ${username} (ID: ${socket.id}) entrou na sala ${roomId}`);
        // Step 3: Emitindo atualização de lista de usuários
        io.to(roomId).emit("user-list", rooms[roomId]);
        io.to(roomId).emit("user-joined", { id: socket.id, username, rooms: socket.rooms });
    });
    socket.on("leave-room", (data) => {
        const { roomId, username } = data;
        rooms[roomId] = rooms[roomId].filter((user) => user.id !== socket.id);
        socket.leave(roomId);
        io.to(roomId).emit("user-list", rooms[roomId]);
        socket.to(roomId).emit("user-left", { userId: socket.id, username });
    });
    socket.on("disconnect", () => {
        // Remove o usuário de todas as salas e atualiza essas salas
        for (const roomId in rooms) {
            if (rooms[roomId].some((user) => user.id === socket.id)) {
                rooms[roomId] = rooms[roomId].filter((user) => user.id !== socket.id);
                io.to(roomId).emit("user-list", rooms[roomId]);
            }
        }
        console.log(`User disconnected: ${socket.id}`);
    });
    //Step 4: Lidar com eventos do jogo
    socket.on("submit-answer", (data) => {
        const { roomId, answer } = data;
        console.log(`Received answers from user ${socket.id} in room ${roomId}:`, answer);
        if (!roomAnswers[roomId]) {
            roomAnswers[roomId] = {};
        }
        roomAnswers[roomId][socket.id] = answer;
        // io.to(roomId).emit("new-answer", { userId: socket.id, answer })
        console.log(`Received answers from user ${socket.id} in room ${roomId}:`, answer);
    });
    socket.on("start-game", (data) => {
        const { roomId } = data;
        // Sorteia uma letra e uma categoria
        const randomLetter = letters[Math.floor(Math.random() * letters.length)];
        // Envia a letra e a categoria para todos os usuários na sala
        io.to(roomId).emit("game-data", { letter: randomLetter });
    });
    socket.on("stop-game", (data) => {
        const { roomId } = data;
        // Solicitar respostas de todos os jogadores
        io.to(roomId).emit("request-answers");
        // Depois de esperar um curto período de tempo (por exemplo, 2 segundos) para coletar respostas,
        setTimeout(() => {
            // Calcular a pontuação
            const scores = {};
            const allUsers = rooms[roomId];
            for (const user of allUsers) {
                const userId = user.id;
                scores[userId] = 0;
                // Se não houver respostas para um usuário, continue com o próximo usuário
                if (!roomAnswers[roomId] || !roomAnswers[roomId][userId])
                    continue;
                for (const category in roomAnswers[roomId][userId]) {
                    const word = roomAnswers[roomId][userId][category];
                    if (!word) {
                        continue; // Se a resposta estiver vazia, não adicione pontos e vá para a próxima categoria
                    }
                    const otherUsers = Object.keys(roomAnswers[roomId]).filter((id) => id !== userId);
                    if (otherUsers.some((id) => roomAnswers[roomId][id][category] === word)) {
                        scores[userId] += 50;
                    }
                    else {
                        scores[userId] += 100;
                    }
                }
            }
            console.log(`Calculated scores for room ${roomId}:`, scores);
            io.to(roomId).emit("game-results", { scores, answers: roomAnswers[roomId] });
            io.to(roomId).emit("game-stopped");
        }, 2000);
    });
});
server.listen(3000, () => {
    console.log("Server running on http://localhost:3000/");
});
