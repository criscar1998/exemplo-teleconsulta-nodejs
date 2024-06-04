import { Server as SocketIOServer } from "socket.io";
import { generateUniqueId } from "./_helpers/genereteUniqueId";

export const handleWebSocketRoutes = (io: SocketIOServer) => {
  const EVENT_CONNECTION = "connection";
  const EVENT_JOIN = "join room";
  const EVENT_OFFER = "offer";
  const EVENT_ANSWER = "answer";
  const EVENT_CANDIDATE = "candidate";
  const EVENT_DISCONNECT_USER = "disconnect-user";
  const EVENT_DISCONNECT = "disconnect";
  const EVENT_CREATE_ROOM = "create room";
  const EVENT_CALL = "call";
  const EVENT_LEAVEROOM = "leave room";

  // Socket.io connection event
  io.on(EVENT_CONNECTION, (socket) => {
    console.log("A user connected.");

    socket.on(EVENT_CREATE_ROOM, () => {
      const roomId = generateUniqueId();
      console.log("Sala de atendimento criada:", roomId);
      socket.emit(EVENT_CREATE_ROOM, {
        status: true,
        message: "Sala Criada Com Sucesso",
        roomId,
      });
    });

    socket.on(EVENT_JOIN, (roomId) => {
      if (!!io.sockets.adapter.rooms[roomId]) {
        socket.emit(EVENT_JOIN, {
          status: false,
          message: "A Sala já fechou ou é inexistente",
        });
        console.log(`A Sala já fechou ou é inexistente: ${roomId}`);
        return;
      }

      console.log(`Novo usuario ${socket.id} entrou na sala: ${roomId}`);
      socket.join(roomId);
      socket.emit(EVENT_JOIN, {
        status: true,
        message: "Você entrou na sala",
      });
      socket.to(roomId).emit(EVENT_CALL, { id: socket.id });
    });

    socket.on(EVENT_OFFER, (data) => {
      console.log(`${socket.id} ofertando a ${data.id}`);
      socket.to(data.id).emit(EVENT_OFFER, {
        id: socket.id,
        offer: data.offer,
      });
    });

    socket.on(EVENT_ANSWER, (data) => {
      console.log(`${socket.id} respondendo a ${data.id}`);
      socket.to(data.id).emit(EVENT_ANSWER, {
        id: socket.id,
        answer: data.answer,
      });
    });

    socket.on(EVENT_CANDIDATE, (data) => {
      console.log(`${socket.id} enviou um candidato para ${data.id}`);
      socket.to(data.id).emit(EVENT_CANDIDATE, {
        id: socket.id,
        candidate: data.candidate,
      });
    });

    socket.on(EVENT_LEAVEROOM, (roomId) => {
      socket.leave(roomId);
      console.log(`${socket.id} saiu da sala ${roomId}`);
      socket.to(roomId).emit(EVENT_LEAVEROOM, {
        id: socket.id,
        message: "Participante saiu da sala"
      });
    });

    socket.on(EVENT_DISCONNECT, () => {
      console.log(`${socket.id} desconectou`);
      io.emit(EVENT_DISCONNECT_USER, {
        id: socket.id,
      });
    });
  });
};
