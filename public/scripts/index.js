$(document).ready(function () {
  let isAlreadyCalling = false;
  let getCalled = false;
  let identified = false;
  let callingPatientAudio;
  let userData = {
    name: '',
    role: ''
  };

  const { RTCPeerConnection, RTCSessionDescription } = window;

  const peerConnection = new RTCPeerConnection();

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

  function callingAudioPatient() {
    if (!callingPatientAudio) {
      callingPatientAudio = new Audio('../audios/calling.mp3');
      callingPatientAudio.play();
    }
  }

  function callingAudioPatientPause() {
    if (callingPatientAudio && !callingPatientAudio.paused) {
      callingPatientAudio.pause();
      callingPatientAudio.currentTime = 0;
    }
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

      const userContainerEl = createBoxPatient(patient);

      activePatientContainer.appendChild(userContainerEl);

    });
  }

  function tryingCall() {
    document.getElementById("remote-video").style.display = "none";
    document.getElementById("calling-patient").style.display = "block";
    document.getElementById("modal-meeting").style.display = "block";
  }

  function tryingCallRejected() {
    document.getElementById("remote-video").style.display = "none";
    document.getElementById("calling-patient").style.display = "none";
    document.getElementById("modal-meeting").style.display = "none";
  }

  function tryingCallAccepted() {
    document.getElementById("remote-video").style.display = "block";
    document.getElementById("calling-patient").style.display = "none";
    document.getElementById("modal-meeting").style.display = "block";
  }

  async function callPatient(socketId) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

    socket.emit("call-user", {
      offer,
      to: socketId
    });

    tryingCall();
  }


  socket.on("call-made", async data => {
    if (getCalled) {
      const confirmed = confirm(
        `O Médico ${data.data.name} deseja se conectar com você, deseja aceitar?`
      );


      if (!confirmed) {
        socket.emit("reject-call", {
          from: data.socket
        });
        return;
      }
    }

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
      tryingCallAccepted();
      getCalled = true;
    } catch (error) {
      console.error('Erro ao configurar a conexão WebRTC:', error);
      alert('Não foi possivel conectar, entre em contato com o desenvolvedor.')
    }
  });

  socket.on("remove-user", ({ socketId }) => {
    const elToRemove = document.getElementById(socketId);

    if (elToRemove) {
      elToRemove.remove();
    }
  });

  socket.on("answer-made", async data => {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.answer)
    );

    if (!isAlreadyCalling) {
      callPatient(data.socket);
      isAlreadyCalling = true;
    }

  });

  socket.on("call-rejected", data => {
    alert(`Paciente: ${data.data.name} rejeitou a teleconsulta.`);
    tryingCallRejected();
  });

  peerConnection.ontrack = function ({ streams: [stream] }) {
    const remoteVideo = document.getElementById("remote-video");
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
    }
  };

  navigator.getUserMedia(
    { video: true, audio: true },
    stream => {
      const localVideo = document.getElementById("local-video");
      if (localVideo) {
        localVideo.srcObject = stream;
      }

      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    },
    error => {
      console.warn(error.message);
    }
  );

});





