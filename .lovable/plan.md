
# Mejora profesional del sistema de reproducción

Plan enfocado **solo** en el sistema de video. No toco el diseño global, navegación, perfiles, comentarios ni introduzco cuentas premium. Reutilizo `Watch.tsx`, `BrandIntro`, `VideoActions`, `Comments` y `VideoCard` sin cambiarlos por fuera.

---

## 1. Reproductor profesional (`<ProVideoPlayer />`)

Nuevo componente `src/components/player/ProVideoPlayer.tsx` que reemplaza el `<video controls>` actual dentro de `Watch.tsx`. Sustitución quirúrgica: mismo contenedor `aspect-video`, misma posición del `BrandIntro`, mismas callbacks (`onPlay`, `onTimeUpdate`, `onLoadedMetadata`).

Características:
- Controles custom (play/pause, mute, volumen, tiempo, fullscreen, PiP, settings).
- **Fullscreen** nativo + fallback iOS (`webkitEnterFullscreen` sobre `<video>`).
- **Picture-in-Picture** (`requestPictureInPicture`) cuando el navegador lo soporte.
- **Selector de calidad** manual (360/480/720/1080) + modo **Auto** (ABR de HLS.js).
- **Velocidad de reproducción** (0.5, 0.75, 1, 1.25, 1.5, 2).
- **Reanudación**: guarda `currentTime` cada 5 s en `localStorage` por `video_id` y restaura al cargar (con prompt "Continuar desde X:XX").
- **Atajos**: Space, K, ←/→ (±5 s), J/L (±10 s), ↑/↓ volumen, M mute, F fullscreen, P PiP, 0–9 saltar %.
- **Barra de progreso** fluida con preview de hover (timestamp) y buffer visible.
- **Indicador de calidad** activa en la esquina (480p / AUTO·720p).
- **Móvil**: double-tap para ±10 s, controles táctiles más grandes, auto-hide.
- **Loader** y manejo de errores de red con botón de reintento.

Probado en Chrome, Firefox, Edge y Safari (incl. iOS — Safari nativo HLS).

## 2. Streaming adaptativo HLS

- Añado `hls.js` como dependencia.
- Lógica de fuente:
  - Si `video.hls_url` existe → reproducir con `hls.js` (o nativo en Safari).
  - Si no → fallback al `video_url` MP4 actual (compatibilidad total con la biblioteca existente).
- Soporta `master.m3u8` con variantes 360p/480p/720p/1080p. ABR automático por `hls.js`; selección manual mapeada a `hls.currentLevel`.
- Configuración tuning: `lowLatencyMode`, `maxBufferLength` corto al inicio para arranque rápido, `startLevel: -1` (auto basado en ancho de banda inicial).
- **La transcodificación a HLS no se hace en el cliente.** Documento en `docs/video-pipeline.md` el flujo recomendado (subida → worker externo con ffmpeg → bucket Storage `videos-hls/{id}/master.m3u8` → guardar URL en `videos.hls_url`). Dejo el `hls_url` opcional en BD; mientras no exista, el reproductor sigue sirviendo MP4 sin romper nada.

Cambio de esquema (migración):
```
ALTER TABLE public.videos
  ADD COLUMN hls_url text,
  ADD COLUMN qualities jsonb;  -- ej: [{"height":720,"bitrate":2500000}, ...]
```

## 3. Optimización de carga

- Sin descarga hasta Play: poster + `preload="none"` por defecto; solo `metadata` cuando el usuario interactúa.
- `<ProVideoPlayer>` cargado con `React.lazy` + `Suspense` desde `Watch.tsx` (se descarga `hls.js` solo cuando entras a una ficha).
- Recomendados (`VideoCard`) ya usan thumbnail — no toco eso.
- Reducción de buffer inicial vía config de `hls.js` para TTFP rápido.

## 4. Estadísticas avanzadas

Nueva tabla `playback_events` (append-only) + mantener `views` actual para no romper la home.

```sql
CREATE TABLE public.playback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  visitor_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,    -- 'start' | 'progress' | 'complete' | 'abandon' | 'quality_change' | 'error'
  watch_seconds int,
  watch_percentage numeric,
  quality_height int,
  country text,                  -- de CF header
  device text,                   -- mobile|tablet|desktop
  browser text,
  os text,
  created_at timestamptz DEFAULT now()
);
-- + GRANT + RLS (INSERT vía edge function con service role; SELECT solo admin via has_role)
-- + índices (video_id, created_at), (created_at)
```

- Nueva edge function `track-playback` recibe los eventos batched (uno cada 15 s + en `pause`/`ended`/`visibilitychange`). Extrae country de `CF-IPCountry`, parsea UA para device/browser/OS.
- Cliente: hook `usePlaybackTracker(videoRef, video)` dentro del player.
- **Mantengo** `track-view` existente intacto (sigue contando views legítimas para el contador público).
- Panel admin: extiendo `src/pages/Stats.tsx` (que ya existe) con nuevas pestañas: Resumen, Retención (curva % vs tiempo), Calidades, Países, Dispositivos/Navegadores/SO, Abandonos. Gráficos con `recharts` (ya instalado normalmente en shadcn stack; si no, lo añado).

## 5. Protección del contenido

- Edge function nueva `sign-video-url` que devuelve URL firmada de Supabase Storage (TTL 4 h) para el `hls_url`/`video_url`. El cliente pide la URL al hacer Play; nunca se expone la ruta cruda en el HTML.
- Validación de `Origin`/`Referer` contra allowlist de dominios en la edge function (anti-hotlinking).
- Rate-limit por IP+visitor_id en `sign-video-url` y `track-playback` (tabla `rate_limits` con ventanas deslizantes, o KV simple por minuto en la propia función).
- Bucket Storage marcado privado; acceso solo vía URL firmada.
- Para vídeos legacy MP4 públicos: el `sign-video-url` sigue funcionando, devolviendo la URL pública si el bucket es público — sin romper nada.

## 6. CDN y rendimiento global

- Documento la separación: **origen** = Supabase Storage; **CDN** = Cloudflare delante del dominio del bucket o de un endpoint propio (`media.tudominio.com`).
- Helper `src/lib/media.ts` con `getMediaUrl(path)` que aplica `VITE_CDN_BASE_URL` si está definida (override del host de Storage). Si no hay CDN configurado, devuelve la URL original — totalmente retrocompatible.
- Cabeceras `Cache-Control` largas para segmentos `.ts`/`.m4s`, cortas para `.m3u8` (documentado).
- Edge functions y BD no se tocan en el hot path de descarga: el CDN sirve el contenido directamente.

---

## Detalle técnico

**Dependencias nuevas**: `hls.js`, `ua-parser-js` (server-side en edge function).

**Archivos nuevos**:
- `src/components/player/ProVideoPlayer.tsx`
- `src/components/player/PlayerControls.tsx`
- `src/components/player/QualityMenu.tsx`
- `src/components/player/SpeedMenu.tsx`
- `src/components/player/useHls.ts`
- `src/components/player/useKeyboardShortcuts.ts`
- `src/components/player/usePlaybackTracker.ts`
- `src/components/player/useResume.ts`
- `src/lib/media.ts`
- `supabase/functions/track-playback/index.ts`
- `supabase/functions/sign-video-url/index.ts`
- `supabase/migrations/<ts>_video_pro_player.sql`
- `docs/video-pipeline.md` (cómo generar HLS y configurar CDN)

**Archivos modificados** (mínimo, solo bloque del reproductor):
- `src/pages/Watch.tsx` — sustituir bloque `<video>` por `<ProVideoPlayer>`.
- `src/pages/Stats.tsx` — añadir pestañas de retención/calidades/geo.
- `src/integrations/supabase/types.ts` — regenerado tras migración.

**No toco**: layout global, header, sidebar, home, perfiles, sistema de auth, monetización, diseño visual, comentarios, follows, likes.

---

## Preguntas antes de implementar

1. **HLS transcoding**: ¿ya tienes un pipeline para generar `.m3u8`, o por ahora dejo solo el soporte en el reproductor (que reproducirá HLS cuando exista `hls_url`, y MP4 mientras no) y documento el pipeline ffmpeg para que lo conectes después?
2. **CDN**: ¿usas ya Cloudflare delante de Storage? Si sí, dime el host base para configurar `VITE_CDN_BASE_URL`. Si no, lo dejo preparado y desactivado.
3. **URLs firmadas**: ¿el bucket `videos` es público actualmente? Si lo es, ¿quieres que lo migre a privado + URLs firmadas, o prefieres mantenerlo público por ahora y dejar solo el anti-hotlinking por Referer?
