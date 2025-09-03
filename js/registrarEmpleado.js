const API_URL = "https://tpinicial-master2-production.up.railway.app"; // ← URL de tu backend
console.log("✅ script.js cargado correctamente");

function mostrar(mensaje, error = false) {
  const resultado = document.getElementById("resultadoRegistro");
  resultado.textContent = mensaje;
  resultado.style.color = error ? "red" : "green";
  resultado.className = error ? "error" : "success";
}

async function registrarNuevoEmpleado() {
  const legajo = document.getElementById("legajoRegistro").value.trim();
  const area = document.getElementById("areaRegistro").value.trim();
  const rol = document.getElementById("rolRegistro").value.trim();
  const turno = document.getElementById("turnoRegistro").value.trim().toLowerCase();

  if (!legajo || !area || !rol || !turno) {
    mostrar("Completa todos los campos.", true);
    return;
  }

  // Validar formato de turno
  const turnosValidos = ['mañana', 'tarde', 'noche'];
  if (!turnosValidos.includes(turno)) {
    mostrar("Turno debe ser: mañana, tarde o noche", true);
    return;
  }

  const video = document.getElementById("videoRegistro");

  // Activar cámara si no está activa
  if (!video.srcObject) {
    try {
      mostrar("Activando cámara...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      video.srcObject = stream;

      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          video.play().then(resolve);
        };
      });
      
      mostrar("Cámara activada. Preparando captura...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      mostrar("No se pudo acceder a la cámara: " + error.message, true);
      return;
    }
  }

  if (video.readyState < 2) {
    mostrar("Espera que la cámara se inicialice completamente...", true);
    return;
  }

  mostrar("Capturando imagen...");

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);

  try {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          resolve(blob);
        } else {
          reject(new Error("No se pudo generar la imagen"));
        }
      }, "image/jpeg", 0.8);
    });

    const formData = new FormData();
    formData.append("imagen", blob);
    formData.append("legajo", legajo);
    formData.append("area", area);
    formData.append("rol", rol);
    formData.append("turno", turno);

    mostrar("Registrando empleado...");

    const res = await fetch(`${API_URL}/registrar_empleado`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const json = await res.json();
    mostrar(json.mensaje, !json.exito);

    // Si fue exitoso, limpiar campos y detener cámara
    if (json.exito) {
      document.getElementById("legajoRegistro").value = "";
      document.getElementById("areaRegistro").value = "";
      document.getElementById("rolRegistro").value = "";
      document.getElementById("turnoRegistro").value = "";
      
      // Detener cámara
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
    }

  } catch (error) {
    console.error("Error completo:", error);
    mostrar("Error al registrar: " + error.message, true);
  }
}

// Test de conectividad al cargar
window.addEventListener('load', async () => {
  try {
    const response = await fetch(`${API_URL}/ping`);
    if (response.ok) {
      console.log("✅ Servidor conectado");
    }
  } catch (error) {
    console.error("❌ Error de conexión:", error);
    mostrar("⚠️ No se pudo conectar con el servidor", true);
  }
});