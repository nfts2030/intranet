
# Guía de Configuración de Supabase

Esta guía te ayudará a configurar tu base de datos de Supabase para la intranet de PetGas.

## 1. Creación de la Tabla `clientes`

Ejecuta la siguiente consulta SQL en el editor de SQL de tu proyecto de Supabase para crear la tabla `clientes`:

```sql
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255),
  email VARCHAR(255),
  telefono VARCHAR(255),
  mensaje TEXT,
  referencia VARCHAR(255) UNIQUE,
  categoria VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. Habilitar Row Level Security (RLS)

Por seguridad, es muy recomendable habilitar Row Level Security (RLS) en tu tabla `clientes`. Esto asegurará que solo los usuarios autenticados puedan acceder a los datos.

1.  Ve a la sección `Authentication` -> `Policies` en tu panel de Supabase.
2.  Busca la tabla `clientes` y haz clic en `Enable RLS`.

## 3. Políticas de Acceso (Ejemplo)

Aquí tienes un ejemplo de políticas que puedes usar. Estas políticas permiten a los usuarios autenticados (con el rol `authenticated`) realizar todas las operaciones (CRUD) en la tabla `clientes`.

**Permitir acceso de lectura a usuarios autenticados:**

```sql
CREATE POLICY "Enable read access for authenticated users" 
ON public.clientes
FOR SELECT
USING (auth.role() = 'authenticated');
```

**Permitir acceso de inserción a usuarios autenticados:**

```sql
CREATE POLICY "Enable insert for authenticated users" 
ON public.clientes
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

**Permitir acceso de actualización a usuarios autenticados:**

```sql
CREATE POLICY "Enable update for authenticated users" 
ON public.clientes
FOR UPDATE
USING (auth.role() = 'authenticated');
```

**Permitir acceso de eliminación a usuarios autenticados:**

```sql
CREATE POLICY "Enable delete for authenticated users" 
ON public.clientes
FOR DELETE
USING (auth.role() = 'authenticated');
```

**Nota:** Para el panel de administración, si no vas a implementar un sistema de autenticación de usuarios de Supabase, puedes usar la clave `service_role` en tu backend para eludir las políticas de RLS. La configuración actual del proyecto ya utiliza la `service_role` en el backend de PHP.
