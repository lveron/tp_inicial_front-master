const API_URL = "https://tpinicial-master2-production.up.railway.app"; // ← URL de tu backend
console.log("✅ script.js cargado correctamente");

async function validarYRegistrar() {
  const legajo = document.getElementById("legajo").value.trim();
  const turno = document.getElementById("turno").value.trim();

  if (!legajo || !turno) {
    mostrar("Debe ingresar legajo y turno.", true);
    return;
  }

  try {
    mostrar("Conectando con servidor...");
    
    const validacion = await fetch(`${API_URL}/validar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legajo, turno })
    }).then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    });

    if (!validacion.valido) {
      mostrar(validacion.mensaje, true);
      return;
    }

    mostrar("Validación correcta. Activando cámara...");
    await activarCamara();

    setTimeout(() => capturarYReconocer(legajo, turno), 3000);
  } catch (error) {
    console.error("Error completo:", error);
    mostrar("Error de conexión con servidor: " + error.message, true);
  }
}

function mostrar(mensaje, error = false) {
  const resultado = document.getElementById("resultado");
  resultado.textContent = mensaje;
  resultado.style.color = error ? "red" : "green";
}

async function activarCamara() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById("video");
    video.srcObject = stream;
    
    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve).catch(reject);
      };
    });
  } catch (error) {
    mostrar("No se pudo acceder a la cámara: " + error.message, true);
    throw error;
  }
}

async function capturarYReconocer(legajo, turno) {
  const video = document.getElementById("video");

  if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    mostrar("Espera unos segundos, la cámara aún no está lista.", true);
    setTimeout(() => capturarYReconocer(legajo, turno), 1000);
    return;
  }

  mostrar("Capturando imagen...");

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    mostrar("Error del navegador: no se pudo crear contexto de canvas.", true);
    return;
  }

  ctx.drawImage(video, 0, 0);

  try {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo crear la imagen"));
      }, "image/jpeg", 0.8);
    });

    const formData = new FormData();
    formData.append("imagen", blob);
    formData.append("legajo", legajo);
    formData.append("turno", turno);

    mostrar("Enviando para reconocimiento...");

    const respuesta = await fetch(`${API_URL}/reconocer`, {
      method: "POST",
      body: formData
    }).then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    });

    mostrar(respuesta.mensaje, !respuesta.exito);
    
    // Detener la cámara después del reconocimiento
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }

  } catch (error) {
    console.error("Error en reconocimiento:", error);
    mostrar("Error al procesar: " + error.message, true);
  }
}

// Test de conectividad al cargar
window.addEventListener('load', async () => {
  try {
    const response = await fetch(`${API_URL}/ping`);
    if (response.ok) {
      console.log("✅ Servidor conectado");
      const data = await response.json();
      console.log("Respuesta del servidor:", data);
    }
  } catch (error) {
    console.error("❌ Error de conexión:", error);
    mostrar("⚠️ No se pudo conectar con el servidor", true);
  }
});