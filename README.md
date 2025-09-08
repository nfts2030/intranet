
# Guía de Implementación: Intranet PetGas con Supabase + Gemini

## Resumen

Este proyecto integra Supabase y Gemini con un formulario de contacto existente basado en PHP. El sistema ahora guarda los envíos de formularios en una base de datos de Supabase, analiza los mensajes con Gemini para categorizarlos y muestra los datos en un panel de administración.

## Cambios Realizados

*   **`godaddy-backup/index.html`**: El formulario ahora se envía a `api/contact.php`.
*   **`api/composer.json`**: Se agregaron `supabase/supabase-php` y `google-gemini-php/client` como dependencias.
*   **`api/contact.php`**:
    *   Ahora se conecta a Supabase e inserta los datos del formulario en la tabla `clientes`.
    *   Llama al script `api/analyze_message.php` para obtener la categoría del mensaje.
    *   Actualiza la tabla `clientes` con la categoría.
    *   Se ha eliminado el antiguo sistema de almacenamiento basado en archivos.
*   **`api/analyze_message.php`**: Este nuevo script analiza el mensaje usando la API de Gemini y devuelve la categoría.
*   **`admin.html`**: Este nuevo archivo muestra los datos de la tabla `clientes` en Supabase, incluida la categoría.

## Próximos Pasos

1.  **Crear la tabla `clientes` en Supabase:**
    Crea una tabla llamada `clientes` en tu proyecto de Supabase con las siguientes columnas:
    *   `id` (SERIAL PRIMARY KEY)
    *   `nombre` (VARCHAR)
    *   `email` (VARCHAR)
    *   `telefono` (VARCHAR)
    *   `mensaje` (TEXT)
    *   `referencia` (VARCHAR)
    *   `created_at` (TIMESTAMPTZ)
    *   `categoria` (VARCHAR)

2.  **Configurar las variables de entorno:**
    En el archivo `.env` en el directorio `api`, agrega tus credenciales:
    *   `SUPABASE_URL`: La URL de tu proyecto de Supabase.
    *   `SUPABASE_KEY`: La clave de tu proyecto de Supabase.
    *   `GEMINI_API_KEY`: Tu clave de API de Gemini.
    *   `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_SECURE`, `SMTP_PORT`, `MAIL_FROM`, `MAIL_TO`: Tus credenciales de SMTP si deseas enviar correos electrónicos.

3.  **Configurar tu servidor web:**
    Asegúrate de que tu servidor web (por ejemplo, Apache o Nginx) esté configurado para manejar scripts de PHP. El directorio `api` debe ser accesible y `godaddy-backup/index.html` debe ser la página principal.

4.  **Actualizar `admin.html`:**
    Reemplaza `YOUR_SUPABASE_URL` y `YOUR_SUPABASE_KEY` en el archivo `admin.html` con tus credenciales reales de Supabase.

5.  **Actualizar la tabla `clientes` para seguimiento de respuestas:**
    Ejecuta el siguiente comando para ver las instrucciones SQL necesarias:
    ```bash
    npm run show-sql
    ```
    Luego copia y pega las instrucciones en el SQL Editor de tu dashboard de Supabase.

## Cómo Ejecutar el Proyecto Localmente

El proyecto utiliza un servidor de Node.js. Asegúrate de tener Node.js y npm instalados.

1.  **Instala las dependencias:**
    En una terminal, en la raíz del proyecto, ejecuta:
    ```bash
    npm install
    ```

2.  **Inicia el servidor:**
    Una vez instaladas las dependencias, inicia el servidor con:
    ```bash
    node server.js
    ```
    El servidor se ejecutará en `http://localhost:3000`.

3.  **Abre el formulario de contacto** en tu navegador en la siguiente URL:

    [http://localhost:3000/index.html](http://localhost:3000/index.html)

4.  **Abre el panel de administración** en tu navegador en la siguiente URL:

    [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

## Uso

*   **Formulario de contacto:** Accede a `godaddy-backup/index.html` en tu navegador.
*   **Panel de administración:** Accede a `admin.html` en tu navegador. Se te pedirá una contraseña (la contraseña predeterminada es `admin`).
