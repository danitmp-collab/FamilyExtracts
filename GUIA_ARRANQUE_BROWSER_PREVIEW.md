# Guia de arranque local y pruebas responsive

## Arranque manual de la aplicacion

Abrir PowerShell y ejecutar:

```powershell
cd C:\Codex\Familyextracts
npm.cmd run dev
```

Usar `npm.cmd`, no `npm`, para evitar el bloqueo de `npm.ps1` por la Execution Policy de PowerShell.

No cerrar esa ventana de PowerShell mientras se use Browser Preview. El servidor vive en esa terminal.

## Puerto local

Cuando el servidor arranque, buscar la linea:

```text
Local: http://localhost:XXXX
```

Usar exactamente ese puerto en Browser Preview.

En la prueba actual del proyecto, Next detecto:

```text
http://localhost:3001
```

porque el puerto `3000` estaba ocupado.

## Comprobacion rapida por HTTP

Con el servidor arrancado, verificar el puerto detectado:

```powershell
Invoke-WebRequest -Uri http://localhost:3001 -UseBasicParsing
```

Si la consola mostro otro puerto, sustituir `3001` por el puerto indicado en la linea `Local`.

## Browser Preview

Abrir Browser Preview en la URL local detectada, por ejemplo:

```text
http://localhost:3001
```

Para revisar movil principal, configurar la vista en:

```text
390 x 844
```

Detenerse cuando se vea la pantalla de login.

## Senales de arranque correcto

El servidor esta funcionando si aparece algo parecido a:

```text
Ready in X.Xs
Local: http://localhost:XXXX
```

Tambien puede aparecer:

```text
Compiled
```

despues de abrir una pagina.

## Errores habituales

Si aparece:

```text
ERR_CONNECTION_REFUSED
```

normalmente significa que:

- El servidor no esta arrancado.
- La ventana de PowerShell donde corria el servidor se cerro.
- Se esta usando un puerto incorrecto.
- Browser Preview esta apuntando a `3000`, pero Next arranco en `3001` u otro puerto.

Si PowerShell muestra un bloqueo de `npm.ps1`, no cambiar la politica global del sistema. Usar:

```powershell
npm.cmd run dev
```

## Medidas recomendadas para pruebas responsive

Movil principal:

```text
390 x 844
```

Android medio:

```text
412 x 915
```

Tablet vertical:

```text
768 x 1024
```

Escritorio portatil:

```text
1366 x 768
```

Escritorio completo:

```text
1920 x 1080
```
