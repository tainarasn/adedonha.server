import express from "express"
import { Server } from "socket.io"
import cors from "cors"

const app = express()
const server = require("http").createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*",
    },
})

app.use(cors())

// Step 1: Armazenando usuários por sala
const rooms: { [key: string]: Array<{ id: string; username: string }> } = {}
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
]


io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`)
    console.log(`Salas do cliente ${socket.id}:`, socket.rooms)

    socket.on("join-room", (data: { roomId: string; username: string }) => {
        const { roomId, username } = data

        // Step 2: Atualizar lista de usuários
        if (!rooms[roomId]) {
            rooms[roomId] = []
        }
        if (!rooms[roomId].some((user) => user.id === socket.id)) {
            rooms[roomId].push({ id: socket.id, username })
        }

        socket.join(roomId)
        console.log(`User ${username} (ID: ${socket.id}) entrou na sala ${roomId}`)

        // Step 3: Emitindo atualização de lista de usuários
        io.to(roomId).emit("user-list", rooms[roomId])
        io.to(roomId).emit("user-joined", { id: socket.id, username, rooms: socket.rooms })
    })

    socket.on("leave-room", (data: { roomId: string; username: string }) => {
        const { roomId, username } = data

        rooms[roomId] = rooms[roomId].filter((user) => user.id !== socket.id)
        socket.leave(roomId)

        io.to(roomId).emit("user-list", rooms[roomId])
        socket.to(roomId).emit("user-left", { userId: socket.id, username })
    })

    socket.on("disconnect", () => {
        // Remove o usuário de todas as salas e atualiza essas salas
        for (const roomId in rooms) {
            if (rooms[roomId].some((user) => user.id === socket.id)) {
                rooms[roomId] = rooms[roomId].filter((user) => user.id !== socket.id)
                io.to(roomId).emit("user-list", rooms[roomId])
            }
        }
        console.log(`User disconnected: ${socket.id}`)
    })

    //Step 4: Lidar com eventos do jogo
    socket.on("submit-answer", (data: { roomId: string; answer: string }) => {
        const { roomId, answer } = data
        // Lide com a lógica de resposta aqui
        io.to(roomId).emit("new-answer", { userId: socket.id, answer })
    })

    socket.on("start-game", (data: { roomId: string }) => {
        const { roomId } = data

        // Sorteia uma letra e uma categoria
        const randomLetter = letters[Math.floor(Math.random() * letters.length)]

        // Envia a letra e a categoria para todos os usuários na sala
        io.to(roomId).emit("game-data", { letter: randomLetter })
    })

    socket.on("stop-game", (data: { roomId: string }) => {
        const { roomId } = data

        // Informa todos os usuários na sala que o jogo foi parado
        io.to(roomId).emit("game-stopped")
    })
})

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000/")
})
