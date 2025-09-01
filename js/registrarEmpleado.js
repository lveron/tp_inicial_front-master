const API_URL = "http://localhost:5000"; // URL base del backend
console.log("✅ script.js cargado correctamente");
function mostrar(mensaje, error = false) {
  const resultado = document.getElementById("resultadoRegistro");
  resultado.textContent = mensaje;
  resultado.style.color = error ? "red" : "green";
}
async function registrarNuevoEmpleado() {
  const video = document.getElementById("videoRegistro");

  // Activar cámara solo si no está activa
  if (!video.srcObject) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      // Esperar a que el video esté listo antes de capturar
      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });
    } catch (error) {
      mostrar("No se pudo acceder a la cámara", true);
      return;
    }
  }

  // Ahora capturás el frame como siempre
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
  if (!blob) {
    mostrar("No se pudo capturar la imagen.", true);
    return;
  }

  const legajo = document.getElementById("legajoRegistro").value.trim();
  const area = document.getElementById("areaRegistro").value.trim();
  const rol = document.getElementById("rolRegistro").value.trim();
  const turno = document.getElementById("turnoRegistro").value.trim();

  if (!legajo || !area || !rol || !turno) {
    mostrar("Completá todos los campos.", true);
    return;
  }

  const formData = new FormData();
  formData.append("imagen", blob);
  formData.append("legajo", legajo);
  formData.append("area", area);
  formData.append("rol", rol);
  formData.append("turno", turno);

  try {
    const res = await fetch(`${API_URL}/registrar_empleado`, {
      method: "POST",
      body: formData
    });
    const json = await res.json();
    mostrar(json.mensaje, !json.exito);
  } catch (error) {
    mostrar("Error al registrar: " + error.message, true);
  }
}
