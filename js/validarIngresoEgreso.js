@app.route('/reconocer', methods=['POST'])
def reconocer():
    try:
        if not RECONOCIMIENTO_DISPONIBLE:
            return jsonify({"exito": False, "mensaje": "Servicio de reconocimiento no disponible"}), 200
            
        # Obtener datos
        legajo = request.form.get('legajo')
        turno = request.form.get('turno')
        imagen = request.files.get('imagen')
        
        if not all([legajo, turno, imagen]):
            return jsonify({"exito": False, "mensaje": "Legajo, turno e imagen son requeridos"}), 200
        
        # Validar legajo y turno
        if not validador_legajo.validar(legajo):
            return jsonify({"exito": False, "mensaje": "Legajo no válido"}), 200
            
        if not validador_turno.validar(legajo, turno):
            return jsonify({"exito": False, "mensaje": "Turno no válido para este empleado"}), 200
        
        # Obtener embeddings de todos los empleados
        empleados_embeddings = {}
        empleados = database_manager.obtener_todos_empleados()
        
        if not empleados:
            return jsonify({"exito": False, "mensaje": "No hay empleados registrados"}), 200
            
        for empleado in empleados:
            if empleado.get('embedding'):
                empleados_embeddings[empleado['legajo']] = empleado['embedding']
        
        if not empleados_embeddings:
            return jsonify({"exito": False, "mensaje": "No hay embeddings disponibles para reconocimiento"}), 200
        
        # Reconocer empleado
        try:
            empleado_reconocido, distancia = reconocer_empleado(imagen, empleados_embeddings)
        except Exception as e:
            print(f"ERROR en reconocimiento facial: {e}")
            return jsonify({"exito": False, "mensaje": "Error en el proceso de reconocimiento facial"}), 200
        
        if empleado_reconocido == legajo:
            # Registrar asistencia
            try:
                resultado = registrar_asistencias.registrar(legajo, turno)
                
                return jsonify({
                    "exito": True,
                    "mensaje": "Ingreso registrado correctamente",
                    "legajo": legajo,
                    "reconocido": True,
                    "distancia": float(distancia) if distancia is not None else None,
                    "asistencia_registrada": resultado,
                    "timestamp": datetime.now().isoformat()
                }), 200
            except Exception as e:
                print(f"ERROR registrando asistencia: {e}")
                return jsonify({
                    "exito": True,
                    "mensaje": "Empleado reconocido, pero error registrando asistencia",
                    "legajo": legajo,
                    "reconocido": True,
                    "distancia": float(distancia) if distancia is not None else None,
                    "asistencia_registrada": False,
                    "timestamp": datetime.now().isoformat()
                }), 200
        else:
            return jsonify({
                "exito": False,
                "mensaje": f"La persona no coincide con el legajo {legajo}. Detectado: {empleado_reconocido or 'Desconocido'}",
                "legajo": legajo,
                "reconocido": False,
                "distancia": float(distancia) if distancia is not None else None,
                "empleado_detectado": empleado_reconocido
            }), 200
            
    except Exception as e:
        print(f"ERROR en reconocer: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"exito": False, "mensaje": f"Error interno: {str(e)}"}), 200
