const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateClientesTable() {
  try {
    console.log('Actualizando la tabla clientes...');
    
    // First, let's check if the table exists and its current structure
    console.log('Verificando estructura actual de la tabla clientes...');
    
    // We'll add the columns one by one to avoid issues
    
    // Add response_status column
    try {
      const { error: statusError } = await supabase.rpc('execute_sql', {
        sql: "ALTER TABLE clientes ADD COLUMN IF NOT EXISTS response_status VARCHAR(50) DEFAULT 'Pendiente'"
      });
      
      if (statusError) {
        console.log('Intentando agregar response_status de otra manera...');
        // Alternative approach - this would be done via the Supabase dashboard in practice
        console.log('Por favor, ejecute manualmente en el SQL Editor de Supabase:');
        console.log("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS response_status VARCHAR(50) DEFAULT 'Pendiente';");
      } else {
        console.log('Columna response_status añadida exitosamente');
      }
    } catch (e) {
      console.log('No se pudo agregar response_status automáticamente. Ejecútelo manualmente.');
    }
    
    // Add responded_by column
    try {
      const { error: respondedError } = await supabase.rpc('execute_sql', {
        sql: "ALTER TABLE clientes ADD COLUMN IF NOT EXISTS responded_by VARCHAR(255)"
      });
      
      if (respondedError) {
        console.log('Por favor, ejecute manualmente en el SQL Editor de Supabase:');
        console.log("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS responded_by VARCHAR(255);");
      } else {
        console.log('Columna responded_by añadida exitosamente');
      }
    } catch (e) {
      console.log('No se pudo agregar responded_by automáticamente. Ejecútelo manualmente.');
    }
    
    // Add response_date column
    try {
      const { error: dateError } = await supabase.rpc('execute_sql', {
        sql: "ALTER TABLE clientes ADD COLUMN IF NOT EXISTS response_date TIMESTAMPTZ"
      });
      
      if (dateError) {
        console.log('Por favor, ejecute manualmente en el SQL Editor de Supabase:');
        console.log("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS response_date TIMESTAMPTZ;");
      } else {
        console.log('Columna response_date añadida exitosamente');
      }
    } catch (e) {
      console.log('No se pudo agregar response_date automáticamente. Ejecútelo manualmente.');
    }
    
    // Add response_message column
    try {
      const { error: messageError } = await supabase.rpc('execute_sql', {
        sql: "ALTER TABLE clientes ADD COLUMN IF NOT EXISTS response_message TEXT"
      });
      
      if (messageError) {
        console.log('Por favor, ejecute manualmente en el SQL Editor de Supabase:');
        console.log("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS response_message TEXT;");
      } else {
        console.log('Columna response_message añadida exitosamente');
      }
    } catch (e) {
      console.log('No se pudo agregar response_message automáticamente. Ejecútelo manualmente.');
    }
    
    console.log('\n--- INSTRUCCIONES PARA ACTUALIZAR MANUALMENTE ---');
    console.log('1. Vaya al dashboard de Supabase');
    console.log('2. Seleccione su proyecto');
    console.log('3. Vaya a la sección SQL Editor');
    console.log('4. Ejecute el siguiente SQL:');
    console.log('');
    console.log('-- Agregar columnas para seguimiento de respuestas');
    console.log("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS response_status VARCHAR(50) DEFAULT 'Pendiente';");
    console.log("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS responded_by VARCHAR(255);");
    console.log("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS response_date TIMESTAMPTZ;");
    console.log("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS response_message TEXT;");
    console.log('');
    console.log('-- Agregar comentarios a las columnas');
    console.log("COMMENT ON COLUMN clientes.response_status IS 'Status of the response (Pendiente, En Progreso, Resuelto, Cerrado)';");
    console.log("COMMENT ON COLUMN clientes.responded_by IS 'User who responded to the incident';");
    console.log("COMMENT ON COLUMN clientes.response_date IS 'Date and time when the response was made';");
    console.log("COMMENT ON COLUMN clientes.response_message IS 'Response message from the support team';");
    console.log('');
    console.log('-- Crear índices para mejor rendimiento');
    console.log("CREATE INDEX IF NOT EXISTS idx_clientes_response_status ON clientes (response_status);");
    console.log("CREATE INDEX IF NOT EXISTS idx_clientes_responded_by ON clientes (responded_by);");
    console.log('');
    console.log('-- Crear vista para incidentes pendientes');
    console.log("CREATE OR REPLACE VIEW pending_incidents AS");
    console.log("SELECT id, nombre, email, categoria, created_at, response_status");
    console.log("FROM clientes");
    console.log("WHERE response_status IN ('Pendiente', 'En Progreso')");
    console.log("ORDER BY created_at DESC;");
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Execute the function
updateClientesTable();