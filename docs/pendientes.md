# Pendientes

**Última revisión: 2026-10-04.** El despliegue vigente es el stack de Dokploy
descrito en [`despliegue-dokploy.md`](despliegue-dokploy.md).

## Despliegue

- Crear el servicio Docker Compose en Dokploy con path
  `./deploy/compose.lab.yaml` y definir `POSTGRES_PASSWORD`.
- Asignar el dominio definitivo al servicio `frontend`, puerto 3000, y registrar
  aquí y en el README la URL resultante.
- Configurar una copia periódica del volumen `postgres_data` hacia almacenamiento
  externo y documentar una restauración de prueba.
- Dar de baja manualmente los recursos anteriores en Render, Vercel y Neon
  después de verificar Dokploy. La eliminación de sus archivos en este
  repositorio no elimina recursos remotos ni cargos asociados.
- Rotar o revocar cualquier credencial de Neon compartida anteriormente, aunque
  el proveedor ya no forme parte del sistema.

## Equipo y calidad

- Crear `SONAR_TOKEN` si se mantendrá el análisis de SonarCloud en CI.
- Registrar la prueba de carga concurrente de aproximadamente cinco sesiones.
- Definir migraciones con Alembic antes de introducir cambios destructivos de
  esquema; actualmente el arranque usa `Base.metadata.create_all`.
- Reforzar mediante pruebas las reglas de dependencia entre módulos.
- Implementar los módulos `identity`, `inventory` y `orders`, todavía vacíos.
