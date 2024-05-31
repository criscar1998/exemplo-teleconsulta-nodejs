import { Server as SocketIOServer } from "socket.io";
import { generateUniqueId } from "./_helpers/genereteUniqueId";

export const handleWebSocketRoutes = (io: SocketIOServer) => {
  const rooms = {};

  // Socket.io connection event
  io.on("connection", (socket) => {
    console.log("A user connected.");

    socket.on("create room", () => {
      const roomId = generateUniqueId();
      socket.join(roomId);
      rooms[roomId] = true;
      socket.emit("create room", {
        status: true,
        message: "Sala Criada Com Sucesso",
        roomId,
      });
    });

    // Join room event
    socket.on("join room", (roomId) => {
      if (rooms[roomId]) {
        
        if (socket.rooms.has(roomId)) {
          socket.emit("join room", {
            status: true,
            message: "Entrou na sala",
            roomId,
          });
          return;
        }

        socket.join(roomId);
        socket.emit("join room", {
          status: true,
          message: "Entrou na sala",
          roomId,
        });
        console.log("Usuario entrou na sala:", roomId);
      } else {
        socket.emit("join room", {
          status: false,
          message: "Sala inexistente",
          roomId,
        });
        console.log("Usuario tentou acessar uma sala inexistente");
      }
    });

    socket.on("check room", (roomId) => {
      if (rooms[roomId]) {
        socket.emit("check room", { status: true, message: "Sala existente" });
      } else {
        socket.emit("check room", {
          status: false,
          message: "Sala inexistente",
        });
      }
    });

    socket.on("leave room", (roomId) => {
        socket.leave(roomId);
        socket.emit("leave room", {
          status: true,
          message: "Saiu da sala",
          roomId,
        });
        socket.to(roomId).emit("user left", {
          message: "Um usuário saiu da sala",
          roomId,
        });
        console.log("Usuario saiu da sala");
    });

    // Offer event
    socket.on("offer", (offer, roomId) => {
      socket.to(roomId).emit("offer", offer);
      console.log("Sent offer to room:", roomId);
    });

    // Answer event
    socket.on("answer", (answer, roomId) => {
      socket.to(roomId).emit("answer", answer);
      console.log("Sent answer to room:", roomId);
    });

    // ICE candidate event
    socket.on("ice candidate", (candidate, roomId) => {
      socket.to(roomId).emit("ice candidate", candidate);
      console.log("Sent ICE candidate to room:", roomId);
    });

    // Disconnect event
    socket.on("disconnect", () => {
      console.log("A user disconnected.");
    });
  });
};
