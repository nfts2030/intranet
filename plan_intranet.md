

```markdown
# Plan Optimizado: Intranet PetGas con Supabase + Gemini

## **Objetivo Principal**
Crear una intranet interna para gestión de clientes e incidencias, migrando datos del formulario existente a Supabase, implementando análisis automático de mensajes con Gemini y manteniendo las rutas actuales.

---

## **Arquitectura Técnica**
### 1. **Migración de Datos a Supabase**
- **Backend Modificado**:
  - Actualizar el script de procesamiento del formulario (`index.html`) para enviar datos a Supabase en lugar de almacenar localmente.
  - Usar la API de Supabase JS para insertar registros en la tabla `clientes`.
  
- **Estructura de Tabla en Supabase**:
  ```sql
  CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    mensaje TEXT,
    referencia VARCHAR(50) UNIQUE, -- Número de referencia del correo
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- **Generación de Referencia Única**:
  - Implementar función en el backend que genere un UUID v4 al recibir el formulario.
  - Almacenar este UUID en Supabase y enviarlo al usuario vía correo.

---

### 2. **Sistema de Correos Electrónicos**
- **Flujo de Confirmación**:
  1. Usuario envía formulario → Backend genera UUID → Inserta en Supabase → Envía correo con UUID.
  2. **Rastreo**: El UUID se almacena en el campo `referencia` de Supabase y en el cuerpo del correo.

- **Plantilla de Correo**:
  ```html
  <p>Su solicitud ha sido recibida. Número de referencia: <strong>{{ uuid }}</strong></p>
  ```

---

### 3. **Admin Page con Autenticación Simulada**
- **Frontend Temporal**:
  - Crear página `/admin` con interfaz básica.
  - Usar `localStorage` para simular sesión de administrador (evitando carga inicial en Supabase Auth).
  
- **Interfaz de Administrador**:
  - Listado de solicitudes con filtros (nombre, estado, fecha).
  - Detalle de cada solicitud con información completa y acciones (responder, cerrar).

---

### 4. **Integración con Gemini AI**
- **Análisis Automático de Mensajes**:
  - Trigger de Supabase: Ejecutar función `analyze_message` al insertar un nuevo registro.
  - Uso de Google Generative AI para clasificar el mensaje:
    ```javascript
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    async function analyzeMessage(mensaje) {
      const prompt = `
        Clasifica este mensaje de cliente en una categoría:
        - Queja
        - Sugerencia
        - Consulta
        - Otro
        
        Mensaje: "${mensaje}"
        
        Responde SOLO con la categoría.
      `;
      
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    }
    ```
  - Guardar resultado en nueva columna `categoria` en Supabase.

---

### 5. **Flujos de Trabajo (Embudos)**
- **Automatización Basada en Categorías**:
  | Categoría   | Acción Automática                          |
  |-------------|-------------------------------------------|
  | Queja       | Asignar prioridad alta, notificar equipo  |
  | Consulta    | Enviar respuesta automática con FAQ       |
  | Sugerencia  | Etiquetar para revisión mensual           |

- **Dashboard de Estadísticas**:
  - Gráficos en tiempo real con datos de Supabase (ej: cantidad de solicitudes por categoría).

---

## **Implementación Paso a Paso**
1. **Fase 1: Migración a Supabase**
   - Configurar proyecto en Supabase.
   - Modificar `index.html` para enviar datos a Supabase via fetch().
   - Pruebas unitarias con Postman.

2. **Fase 2: Sistema de Referencias**
   - Implementar UUID generation en backend.
   - Validar envío de correos con Mailtrap (entorno de prueba).

3. **Fase 3: Admin Page Temporal**
   - Desarrollar UI con React/Vue.js.
   - Conectar a Supabase para listar registros.

4. **Fase 4: Integración con Gemini**
   - Activar API Key de Google AI Studio.
   - Crear trigger en Supabase para ejecutar `analyze_message`.

5. **Fase 5: Autenticación Real**
   - Reemplazar simulación por Supabase Auth.
   - Configurar políticas de acceso (RLS) en tablas.

---

## **Consideraciones Críticas**
- **Seguridad**:
  - Validar todos los inputs del formulario.
  - Usar variables de entorno para credenciales.
  - Habilitar RLS en Supabase con políticas restrictivas.
  
- **Escalabilidad**:
  - Limitar llamadas a Gemini (usar caché para mensajes repetidos).
  - Implementar paginación en el admin panel.

- **Monitoreo**:
  - Logs de errores en Supabase.
  - Alertas para fallos en envío de correos.

---

## **Recursos Necesarios**
- Cuenta en [Supabase](https://supabase.com/)
- Clave API de [Google AI Studio](https://makersuite.google.com/)
- Servicio de emails transicional (Mailgun/Mailchimp)

Este plan mantiene las rutas existentes (`/contacto/`, `/admin`), migra datos de forma segura a Supabase, y añade capacidades de IA sin interrumpir el flujo actual de usuarios.
```