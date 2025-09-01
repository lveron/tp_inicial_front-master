const API_URL = "http://localhost:5000"; // URL base del backend
console.log("✅ script.js cargado correctamente");


async function validarYRegistrar() {
  const legajo = document.getElementById("legajo").value.trim();
  const turno = document.getElementById("turno").value.trim();

  if (!legajo || !turno) {
    mostrar("Debe ingresar legajo y turno.", true);
    return;
  }

  try {
    const validacion = await fetch(`${API_URL}/validar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legajo, turno })
    }).then(res => res.json());

    if (!validacion.valido) {
      mostrar(validacion.mensaje, true);
      return;
    }

    mostrar("Validación correcta. Activando cámara...");
    activarCamara();

    setTimeout(() => capturarYReconocer(legajo, turno), 2000);
  } catch (error) {
    mostrar("Error al validar: " + error.message, true);
  }
}


function mostrar(mensaje, error = false) {
  const resultado = document.getElementById("resultado");
  resultado.textContent = mensaje;
  resultado.style.color = error ? "red" : "green";
}

function activarCamara() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      document.getElementById("video").srcObject = stream;
    })
    .catch(() => mostrar("No se pudo acceder a la cámara", true));
}

async function capturarYReconocer(legajo, turno) {
  const video = document.getElementById("video");

  // Esperar hasta que el video tenga dimensiones válidas
  if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    mostrar("Esperá unos segundos, la cámara aún no está lista.", true);
    console.warn("⚠️ Video no listo o sin dimensiones.");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    mostrar("No se pudo acceder al contexto del canvas.", true);
    console.warn("⚠️ Contexto de canvas nulo.");
    return;
  }

  ctx.drawImage(video, 0, 0);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
  if (!blob) {
    mostrar("No se pudo capturar la imagen. Probá de nuevo.", true);
    console.warn("⚠️ Blob nulo.");
    return;
  }

  const formData = new FormData();
  formData.append("imagen", blob);
  formData.append("legajo", legajo);
  formData.append("turno", turno);

  try {
    const respuesta = await fetch(`${API_URL}/reconocer`, {
      method: "POST",
      body: formData
    }).then(res => res.json());

    mostrar(respuesta.mensaje, !respuesta.exito);
  } catch (error) {
    console.error("❌ Error en el fetch:", error);
    mostrar("Error al reconocer: " + error.message, true);
  }
}






