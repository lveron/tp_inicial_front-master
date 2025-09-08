const API_URL = "https://tpinicial-master2-production.up.railway.app";
console.log("✅ script.js cargado correctamente");

async function validarYRegistrar() {
  console.log("🟡 Iniciando validarYRegistrar()");
  
  const legajo = document.getElementById("legajo").value.trim();
  const turno = document.getElementById("turno").value.trim();
  
  console.log("🟡 Valores:", { legajo, turno });

  if (!legajo || !turno) {
    mostrar("Debe ingresar legajo y turno.", true);
    return;
  }

  try {
    mostrar("Conectando con servidor...");
    console.log("🟡 Enviando validación...");
    
    const validacion = await fetch(`${API_URL}/validar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legajo, turno })
    }).then(res => {
      console.log("🟡 Status validación:", res.status);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    });

    console.log("🟡 Respuesta validación:", validacion);

    if (!validacion.valido) {
      console.log("🔴 Validación falló:", validacion.mensaje);
      mostrar(validacion.mensaje, true);
      return;
    }

    console.log("🟢 Validación OK, activando cámara...");
    mostrar("Validación correcta. Activando cámara...");
    
    try {
      await activarCamara();
      console.log("🟢 Cámara activada exitosamente");
      setTimeout(() => capturarYReconocer(legajo, turno), 3000);
    } catch (cameraError) {
      console.error("🔴 Error activando cámara:", cameraError);
      mostrar("Error activando cámara: " + cameraError.message, true);
    }
    
  } catch (error) {
    console.error("🔴 Error completo:", error);
    mostrar("Error de conexión con servidor: " + error.message, true);
  }
}

function mostrar(mensaje, error = false) {
  const resultado = document.getElementById("resultado");
  resultado.textContent = mensaje;
  resultado.style.color = error ? "red" : "green";
}

async function activarCamara() {
  console.log("🟡 Intentando activar cámara...");
  
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Tu navegador no soporta acceso a cámara");
    }

    console.log("🟡 Solicitando acceso a cámara...");
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user" 
      } 
    });
    
    console.log("🟡 Stream obtenido:", stream);
    
    const video = document.getElementById("video");
    if (!video) {
      throw new Error("Elemento video no encontrado");
    }
    
    video.srcObject = stream;
    console.log("🟡 Stream asignado al video");
    
    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        console.log("🟡 Metadata cargada, iniciando video...");
        video.play()
          .then(() => {
            console.log("🟢 Video reproduciendo correctamente");
            resolve();
          })
          .catch(error => {
            console.error("🔴 Error reproduciendo video:", error);
            reject(error);
          });
      };
      
      video.onerror = (error) => {
        console.error("🔴 Error en elemento video:", error);
        reject(new Error("Error en elemento video"));
      };
    });
  } catch (error) {
    console.error("🔴 Error completo activando cámara:", error);
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
