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
app.use(express.json()) // Adicionando middleware para analisar solicitações JSON

// Step 1: Armazenando usuários por sala
const rooms: { [key: string]: Array<{ id: string; username: string }> } = {}
const roomAnswers: { [key: string]: { [userId: string]: { [category: string]: string } } } = {}

app.post("/create-room", (req, res) => {
    const roomId = new Date().getTime().toString() // Usando timestamp como um simples ID de sala
    rooms[roomId] = []
    res.json({ roomId })
})

app.get("/rooms", (req, res) => {
    const roomList = Object.keys(rooms)
    res.json({ rooms: roomList })
})

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

    socket.on("update-username", (username) => {
        console.log(`Username updated: ${username}`);
        
    });
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
    socket.on("submit-answer", (data: { roomId: string; answer: { [category: string]: string } }) => {
        const { roomId, answer } = data

        console.log(`Received answers from user ${socket.id} in room ${roomId}:`, answer)

        if (!roomAnswers[roomId]) {
            roomAnswers[roomId] = {}
        }

        roomAnswers[roomId][socket.id] = answer

        // io.to(roomId).emit("new-answer", { userId: socket.id, answer })
        console.log(`Received answers from user ${socket.id} in room ${roomId}:`, answer)
    })

    socket.on("start-game", (data: { roomId: string }) => {
        const { roomId } = data

        // Sorteia uma letra e uma categoria
        const randomLetter = letters[Math.floor(Math.random() * letters.length)]

        // Envia a letra e a categoria para todos os usuários na sala
        io.to(roomId).emit("game-data", { letter: randomLetter })
    })

    socket.on("stop-game", (data: { roomId: string; username: String }) => {
        const { roomId, username } = data

        // Solicitar respostas de todos os jogadores
        io.to(roomId).emit("request-answers")
        console.log("Emitting stop-activated with username:", username)
        io.in(roomId).emit("stop-activated", { username }) // Notify all players who activated the stop

        // Depois de esperar um curto período de tempo (por exemplo, 2 segundos) para coletar respostas,

        setTimeout(() => {
            // Calcular a pontuação
            const scores: { [userId: string]: number } = {}
            const allUsers = rooms[roomId]

            for (const user of allUsers) {
                const userId = user.id
                scores[userId] = 0

                // Se não houver respostas para um usuário, continue com o próximo usuário
                if (!roomAnswers[roomId] || !roomAnswers[roomId][userId]) continue

                for (const category in roomAnswers[roomId][userId]) {
                    const word = roomAnswers[roomId][userId][category]
                    if (!word) {
                        continue // Se a resposta estiver vazia, não adicione pontos e vá para a próxima categoria
                    }

                    const otherUsers = Object.keys(roomAnswers[roomId]).filter((id) => id !== userId)
                    if (otherUsers.some((id) => roomAnswers[roomId][id][category] === word)) {
                        scores[userId] += 50
                    } else {
                        scores[userId] += 100
                    }
                }
            }

            console.log(`Calculated scores for room ${roomId}:`, scores)
            io.to(roomId).emit("game-results", { scores, answers: roomAnswers[roomId] })
            io.to(roomId).emit("game-stopped")
        }, 1000)
    })
})
server.listen(3000, () => {
    console.log("Server running on http://localhost:3000/")
})

