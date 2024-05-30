$(document).ready(function () {
  let isCalling = false;
  let isInCall = false;
  let currentCallSocketId = null;
  let identified = false;
  let userData = {
    name: '',
    role: ''
  };

  const { RTCPeerConnection, RTCSessionDescription } = window;

  let peerConnection = createPeerConnection()

  function createPeerConnection() {
    const pc = new RTCPeerConnection();
    pc.ontrack = function ({ streams: [stream] }) {
      const remoteVideo = document.getElementById("remote-video");
      if (remoteVideo) {
        remoteVideo.srcObject = stream;
      }
    };
    return pc;
  }

  function resetPeerConnection() {
    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.close();
    }
    peerConnection = createPeerConnection();

    const localVideo = document.getElementById("local-video");
    const localStream = localVideo.srcObject;

    if (localStream) {
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }
  }

  function updateUserData() {
    userData.name = $('#userName').val();
    userData.role = $('#userRole').val();
  }

  $('#userName, #userRole').on('input change', function () {
    updateUserData();
  });

  function checkRoles() {

    if (userData.role == 'doctor') {
      $('.list-patients-online').show();
    } else {
      $('.list-doctors-online').show();
    }

  }

  const domainAndProtocol = window.location.protocol + "//" + window.location.host;
  const socket = io.connect(domainAndProtocol);

  $('#button-next').click(function () {
    if (userData.name == "" || userData.role == "") {
      alert("Se identifique antes de prosseguir");
      return;
    }
    identified = true;
    $('.identification').hide();
    checkRoles();
    socket.emit('user-identified', userData);
  })

  function createBoxPatient(patient) {
    const patientContainerEl = document.createElement("div");
    patientContainerEl.setAttribute("id", patient.id);
    patientContainerEl.setAttribute("class", "box-card");
    patientContainerEl.innerHTML = patient.name;

    patientContainerEl.addEventListener('click', () => {
      callPatient(patient.id);
    });

    return patientContainerEl;
  }

  function notificationAudio() {
    new Audio('../audios/notification.mp3').play();
  }

  socket.on("update-patient-list", ({ patients }) => {
    updatePatientList(patients);
    if (patients.length > 0) {
      notificationAudio();
    }
  });


  function updatePatientList(patients) {
    const activePatientContainer = document.getElementById("list-patients-online");
    patients.forEach(patient => {
      const alreadyExistingPatient = document.getElementById(patient.id);

      if (!alreadyExistingPatient) {
        const userContainerEl = createBoxPatient(patient);
        activePatientContainer.appendChild(userContainerEl);
      }
    });
  }

  function tryingCall() {
    document.getElementById("remote-video").style.display = "none";
    document.getElementById("calling-patient").style.display = "block";
    document.getElementById("modal-meeting").style.display = "block";
  }

  function tryingCallRejected() {
    resetPeerConnection();
    currentCallSocketId = null;
    isAlreadyCalling = false;

    const remoteVideo = document.getElementById("remote-video");
    if (remoteVideo) {
      remoteVideo.srcObject = null;
      remoteVideo.style.display = "none";
    }

    document.getElementById("calling-patient").style.display = "none";
    document.getElementById("modal-meeting").style.display = "none";
  }

  function tryingCallAccepted() {
    console.log('peer', peerConnection);
    document.getElementById("remote-video").style.display = "block";
    document.getElementById("calling-patient").style.display = "none";
    document.getElementById("modal-meeting").style.display = "block";

  }

  async function callPatient(socketId) {
    if (!isCalling && !isInCall) {
      isCalling = true;
      currentCallSocketId = socketId;
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

      socket.emit("call-user", {
        offer,
        to: socketId
      });

      tryingCall();
    }

  }


  socket.on("call-made", async data => {
    if (!isCalling && !isInCall && data.socket === currentCallSocketId) {
      const confirmed = confirm(
        `O Médico ${data.data.name} deseja se conectar com você, deseja aceitar?`
      );

      if (confirmed) {

        try {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

          socket.emit("make-answer", {
            answer,
            to: data.socket
          });
          isInCall = true;
          tryingCallAccepted();

        } catch (error) {
          console.error('Erro ao configurar a conexão WebRTC:', error);
          alert('Não foi possivel conectar, entre em contato com o desenvolvedor.')
        }

      } else {
        socket.emit("reject-call", {
          from: data.socket
        });
        isCalling = false;
        currentCallSocketId = null;
        tryingCallRejected();
      }
    }

  });

  function callFinished() {
    currentCallSocketId = null;
    isCalling = false;
    isInCall = false;
    tryingCallRejected();
    alert(`Usuario foi desconectado`);
  }

  socket.on("remove-user", ({ socketId }) => {
    const elToRemove = document.getElementById(socketId);
    if (elToRemove) {
      elToRemove.remove();
    }
    if (currentCallSocketId === socketId) {
      callFinished();
    }
  });

  socket.on("answer-made", async data => {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.answer)
    );

    if (!isCalling) {
      isCalling = true;
      callPatient(data.socket);
    }
    tryingCallAccepted();
  });

  socket.on("call-rejected", data => {
    callFinished();
  });


  document.getElementById('button-end-call').addEventListener('click', () => {
    socket.emit('end-call', { socketId: currentCallSocketId });
    tryingCallRejected();
  });

  socket.on("call-ended", data => {
    currentCallSocketId = null;
    isAlreadyCalling = false;
    tryingCallRejected();
    alert('A chamada foi encerrada.');
  });


  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((localMediaStream) => {
      console.log(localMediaStream);
      const localVideo = document.getElementById("local-video");
      localVideo.srcObject = localMediaStream;
      localMediaStream.getTracks().forEach(track => peerConnection.addTrack(track, localMediaStream));
    })
    .catch((error) => {
      console.log("Rejected!", error);
      alert('Verifique as permissões de Microfone e Camera');
    });

});





