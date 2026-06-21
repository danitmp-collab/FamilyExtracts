# Family_extracts

Aplicacion web para centralizar movimientos bancarios familiares a partir de extractos Excel.

## Estado

Fase 10 completada: estructura base, preparacion de Supabase, autenticacion, modelo de datos, seeds iniciales, CRUD de entidades economicas, CRUD de cuentas bancarias, vista previa de importacion Excel, deteccion de duplicados en preview, importacion definitiva, historial de importaciones por cuenta y consulta basica de movimientos por cuenta.

No incluye todavia consultas globales, edicion de movimientos, exportaciones, graficas ni dashboard financiero.

## Stack

- Next.js App Router
- React
- TypeScript
- Supabase Auth
- Vercel

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Los valores salen de Supabase Project Settings > API.

## Ejecutar en local

```bash
npm install
npm run dev
```

La aplicacion quedara disponible en `http://localhost:3000`.

## Configuracion Supabase

1. Crea un proyecto en Supabase.
2. Activa Auth con email y password.
3. Configura las URLs del proyecto:
   - Site URL: `http://localhost:3000`
   - Redirect URL local: `http://localhost:3000/auth/callback`
   - Redirect URL Vercel: `https://TU_DOMINIO.vercel.app/auth/callback`
4. Copia `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local`.
5. Aplica las migraciones de `supabase/migrations` en tu proyecto Supabase.

## Migraciones

La Fase 2 crea el esquema principal en:

```text
supabase/migrations/20260605120000_create_core_schema.sql
```

Incluye tablas, claves foraneas, constraints, indices basicos, triggers de `updated_at`, trigger de perfil para `auth.users` y RLS por workspace.

## Seeds

La Fase 3 crea los datos iniciales en:

```text
supabase/seed.sql
```

Antes de ejecutarlo, crea el usuario Dani en Supabase Auth y sustituye `REPLACE_WITH_DANI_EMAIL` por su email real:

```sql
select set_config('app.seed_admin_email', 'dani@example.com', false);
```

El seed crea o actualiza:

- Workspace: `Familia Dani`
- Perfil admin: `Dani`
- Membresia admin de Dani en el workspace
- Entidades economicas: `Dani`, `Cris`, `Madre`, `Aina`, `Danielin`, `Casa`, `Taller`

## Despliegue en Vercel

1. Conecta el repositorio de GitHub en Vercel.
2. Configura las mismas variables de entorno en Vercel.
3. Usa el comando de build por defecto: `npm run build`.
4. Configura en Supabase la URL final de Vercel como redirect permitido.

## Fases pendientes

- Fase 11: pendiente de definir.
