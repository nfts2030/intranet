# 📧 Formulario de Contacto - GoDaddy Backup Solution

## 🎯 Descripción General

Esta es una solución de respaldo completamente funcional para el formulario de contacto de PETGAS México, diseñada específicamente para funcionar en servidores compartidos de GoDaddy usando PHP y HTML5.

**¿Por qué esta solución?**
- ✅ **100% compatible** con hosting compartido de GoDaddy
- ✅ **Sin dependencias** externas (no requiere Node.js, npm, etc.)
- ✅ **PHP nativo** con función `mail()` integrada
- ✅ **Backup confiable** cuando Vercel/SendGrid fallan
- ✅ **Diseño responsive** idéntico al sitio principal

## 📁 Estructura de Archivos

```
godaddy-backup/
├── index.html              # Página principal del formulario
├── process_contact.php     # Procesador del formulario
├── .htaccess              # Configuraciones de seguridad
├── README_GODADDY.md      # Este archivo
└── logs/ (se crea automáticamente)
    ├── contact_log.txt
    ├── submissions_YYYY-MM.json
    └── failed_submissions_YYYY-MM.json
```

## 🚀 Instalación en GoDaddy

### Paso 1: Subir Archivos

1. **Accede a tu cPanel de GoDaddy**
   - Ve a tu panel de control
   - Busca "File Manager" o "Administrador de Archivos"

2. **Navega a tu dominio**
   ```
   /public_html/tu-dominio.com/
   ```

3. **Crea una carpeta para el formulario**
   ```
   /public_html/tu-dominio.com/contacto/
   ```

4. **Sube los archivos**
   - `index.html`
   - `process_contact.php`
   - `.htaccess`

### Paso 2: Configurar Permisos

Asegúrate de que los permisos sean correctos:

```bash
# Archivos PHP y HTML
chmod 644 index.html
chmod 644 process_contact.php
chmod 644 .htaccess

# Directorio principal
chmod 755 contacto/
```

### Paso 3: Configurar Email

1. **Los emails ya están configurados correctamente**:
   ```php
   $config = [
       'to_email' => 'contacto@petgas.com.mx',        // ✅ Ya configurado
       'smtp_host' => 'mail.petgas.com.mx',           // ✅ Servidor correcto
       'smtp_user' => 'contacto@petgas.com.mx',       // ✅ Usuario configurado
       'smtp_pass' => 'NyeaR[QcW;tP',                 // ✅ Contraseña incluida
       'smtp_port' => 587,                            // ✅ Puerto TLS
       'backup_smtp_port' => 465,                     // ✅ Puerto SSL backup
       // ... resto de la configuración
   ];
   ```

2. **El servidor de correo ya está configurado**
   - Servidor: `mail.petgas.com.mx`
   - Usuario: `contacto@petgas.com.mx`
   - Puertos: 587 (TLS) y 465 (SSL) como backup
   - **No necesitas cambiar nada en la configuración**

## 🧪 Pruebas

### Prueba Local
```bash
# Abre en tu navegador:
https://tu-dominio.com/contacto/

# O directamente el HTML:
https://tu-dominio.com/contacto/index.html
```

### Prueba del Procesador
```bash
# Test directo del PHP (debe devolver error de método):
https://tu-dominio.com/contacto/process_contact.php
```

### Prueba con cURL
```bash
curl -X POST https://tu-dominio.com/contacto/process_contact.php \
  -d "name=Test User" \
  -d "email=test@example.com" \
  -d "phone=5551234567" \
  -d "subject=cotizacion" \
  -d "message=Test message from cURL" \
  -d "privacy=on"
```

## ⚙️ Configuración Avanzada

### Variables de Configuración

En `process_contact.php`, puedes modificar:

```php
$config = [
    'to_email' => 'contacto@petgas.com.mx',           // Email destino ✅
    'from_email' => 'noreply@petgas.com.mx',          // Email remitente ✅
    'smtp_host' => 'mail.petgas.com.mx',              // Servidor SMTP ✅
    'smtp_user' => 'contacto@petgas.com.mx',          // Usuario SMTP ✅
    'smtp_pass' => 'NyeaR[QcW;tP',                    // Contraseña SMTP ✅
    'smtp_port' => 587,                               // Puerto TLS ✅
    'smtp_secure' => 'tls',                           // Tipo de seguridad ✅
    'backup_smtp_port' => 465,                        // Puerto SSL backup ✅
    'use_smtp' => true,                               // Usar SMTP auténtico ✅
    'from_name' => 'Formulario de Contacto PETGAS',   // Nombre remitente
    'subject_prefix' => 'Nuevo contacto desde web: ', // Prefijo asunto
    'log_file' => 'contact_log.txt',                  // Archivo de logs
    'max_message_length' => 5000,                     // Límite caracteres mensaje
    'required_fields' => ['name', 'email', 'subject', 'message', 'privacy']
];
```

### Personalizar Diseño

El CSS está incluido en `index.html`. Puedes modificar:

```css
/* Colores principales */
:root {
    --primary-color: #0a4b2a;      /* Verde PETGAS */
    --secondary-color: #0d6a3a;    /* Verde hover */
    --success-color: #28a745;       /* Verde éxito */
    --error-color: #dc3545;         /* Rojo error */
}
```

### Campos del Formulario

Para agregar/modificar campos, edita tanto `index.html` como `process_contact.php`:

1. **HTML:** Agrega el input
2. **PHP:** Añade validación y procesamiento
3. **Email Template:** Incluye el campo en el template

## 🔐 Seguridad

### Protecciones Incluidas

- ✅ **Validación de entrada** (sanitización, longitud, formato)
- ✅ **Protección anti-spam** (patrones sospechosos)
- ✅ **Rate limiting** (5 envíos por hora por IP)
- ✅ **Headers de seguridad** (XSS, clickjacking, etc.)
- ✅ **Protección de archivos** (logs no accesibles públicamente)
- ✅ **CORS configurado** para APIs
- ✅ **Validación de métodos HTTP**

### Logs de Seguridad

Los logs se guardan automáticamente en:

```
contact_log.txt              # Log general
submissions_YYYY-MM.json     # Envíos exitosos
failed_submissions_YYYY-MM.json # Envíos fallidos
rate_limit.json             # Control de frecuencia
```

## 📊 Monitoreo

### Verificar Funcionamiento

1. **Revisar logs de error de PHP**
   ```bash
   # En cPanel → Error Logs
   # O archivo: /logs/error_log
   ```

2. **Monitorear envíos exitosos**
   ```bash
   # Revisar: submissions_YYYY-MM.json
   # Cada envío exitoso se registra aquí
   ```

3. **Detectar problemas**
   ```bash
   # Revisar: failed_submissions_YYYY-MM.json
   # Fallos y errores se registran aquí
   ```

### Estadísticas Básicas

El sistema genera automáticamente:
- Conteo de envíos por mes
- IPs que más envían (posible spam)
- Errores más comunes
- Tipos de consulta más frecuentes

## 🐛 Troubleshooting

### Email no llega

1. **La configuración de email ya está correcta:**
   ```php
   // Ya está configurado en process_contact.php:
   'to_email' => 'contacto@petgas.com.mx',        // ✅ Correcto
   'smtp_host' => 'mail.petgas.com.mx',           // ✅ Servidor real
   'smtp_user' => 'contacto@petgas.com.mx',       // ✅ Usuario real
   'smtp_pass' => 'NyeaR[QcW;tP',                 // ✅ Contraseña real
   ```

2. **Revisa logs de GoDaddy:**
   - cPanel → Logs → Error Logs
   - Busca errores relacionados con SMTP o `mail()`
   - Archivo local: `contact_log.txt` en tu directorio

3. **Prueba la conexión SMTP:**
   ```php
   // Crear test_smtp.php temporal:
   <?php
   ini_set('SMTP', 'mail.petgas.com.mx');
   ini_set('smtp_port', 587);
   $test = mail('contacto@petgas.com.mx', 'Test PETGAS', 'Test desde GoDaddy');
   echo $test ? '✅ SMTP funciona' : '❌ SMTP falló';
   ?>
   ```

### Formulario no responde

1. **Verifica permisos:**
   ```bash
   chmod 644 process_contact.php
   chmod 755 directorio/
   ```

2. **Revisa .htaccess:**
   - Comenta líneas que puedan causar error 500
   - Prueba sin .htaccess temporalmente

3. **Verifica PHP version:**
   - GoDaddy suele usar PHP 7.4 o 8.x
   - Revisa compatibilidad del código

### Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| 500 Internal Server Error | .htaccess malformado | Revisar sintaxis |
| Mail function disabled | Hosting restrictivo | Contactar soporte |
| CORS errors | Headers mal configurados | Verificar Access-Control-* |
| JSON parse error | PHP output incorrecto | Revisar que no haya `echo` extra |

## 🔄 Integración con Sitio Principal

### Como Backup Automático

En tu sitio principal (Vercel), puedes agregar este endpoint como fallback:

```typescript
// En tu API de Vercel (contact-v2.ts):
if (allEmailMethodsFailed) {
    try {
        // URL real de tu servidor GoDaddy
        const response = await fetch('https://petgas.com.mx/contacto/process_contact.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                name: formData.name,
                email: formData.email,
                phone: formData.phone || '',
                subject: formData.subject,
                message: formData.message,
                privacy: 'on'
            })
        });
        
        const result = await response.json();
        if (result.success) {
            return { 
                success: true, 
                sent: true,
                method: 'GoDaddy Backup SMTP',
                message: result.message 
            };
        }
    } catch (error) {
        console.log('GoDaddy backup also failed:', error);
    }
}
```

### Como Página de Emergencia

Cuando el sitio principal falle, puedes redirigir temporalmente:

```javascript
// Redirect de emergencia - URL real
if (mainSiteDown) {
    window.location.href = 'https://petgas.com.mx/contacto/';
}

// O como iframe en el sitio principal:
<iframe 
    src="https://petgas.com.mx/contacto/" 
    width="100%" 
    height="800"
    style="border: none; border-radius: 10px;">
</iframe>
```

## 📈 Próximos Pasos

### Mejoras Opcionales

1. **Base de datos** (en lugar de archivos JSON)
2. **Dashboard de administración**
3. **Integración con CRM**
4. **Notificaciones push**
5. **Auto-respuestas personalizadas**

### Mantenimiento

- **Revisar logs mensualmente**
- **Limpiar archivos antiguos** (>6 meses)
- **Actualizar patrones anti-spam**
- **Monitorear uso de recursos**

---

## 📞 Soporte

Si tienes problemas con la instalación:

1. **Revisa los logs** (siempre el primer paso)
2. **Verifica la configuración** de email en GoDaddy
3. **Prueba cada componente** por separado
4. **Contacta soporte de GoDaddy** si el problema es del servidor

---

**Fecha de creación:** 30 de Agosto, 2025
**Versión:** 1.0
**Compatible con:** PHP 7.4+, GoDaddy Shared Hosting