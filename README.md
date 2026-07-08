# Inmobiliaria del Pino — Gestión de alquileres

Aplicación interna para gestionar los pisos en alquiler (Toledo, Pinto y Madrid):
pisos, inquilinos, contratos, ingresos, gastos y procesamiento de documentos con IA.

**Stack:** React + Vite (frontend estático) · Supabase (base de datos, login,
documentos y Edge Functions) · GitHub Pages (hosting) · API de Anthropic (IA).

## Puesta en marcha

### 1. Subir el código a GitHub

1. Crear un repositorio nuevo llamado `inmobiliaria-del-pino`.
2. Subir todo el contenido de esta carpeta (por web: *uploading an existing
   file* arrastrando los archivos, o por git: `git init`, `git add .`,
   `git commit`, `git push`).

### 2. Activar GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. En *Build and deployment*, elegir **Source: GitHub Actions**.
3. El workflow de `.github/workflows/deploy.yml` se ejecutará en cada push
   a `main` y publicará la web.

### 3. Conectar el dominio

1. En **Settings → Pages → Custom domain**, escribir `inmobiliariadelpino.es`
   (el archivo `public/CNAME` ya lo deja fijado en cada despliegue).
2. En el panel DNS de Hostinger, crear:
   - 4 registros **A** para `@` apuntando a:
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - 1 registro **CNAME** para `www` apuntando a `TU-USUARIO.github.io`
3. Cuando el DNS propague, marcar **Enforce HTTPS** en Settings → Pages.

### 4. Conectar Supabase

1. En el repositorio: **Settings → Secrets and variables → Actions →
   pestaña Variables → New repository variable**, crear:
   - `VITE_SUPABASE_URL` → la URL del proyecto de Supabase
   - `VITE_SUPABASE_ANON_KEY` → la clave pública (anon/publishable) del proyecto
2. Volver a lanzar el despliegue (Actions → Desplegar en GitHub Pages →
   *Run workflow*).

> La clave `anon` está pensada para usarse en el navegador: los datos quedan
> protegidos por las políticas de seguridad (RLS) de la base de datos, no por
> el secreto de la clave. La clave `service_role` NUNCA debe ponerse aquí.

### 5. Crear los usuarios administradores

En Supabase: **Authentication → Users → Add user**, creando los dos usuarios
(madre e hijo) con email y contraseña. No hay registro público en la web.

## Desarrollo local

```bash
cp .env.example .env   # y rellenar los valores
npm install
npm run dev
```
