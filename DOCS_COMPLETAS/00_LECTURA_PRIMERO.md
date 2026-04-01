# 📚 DOCUMENTACIÓN COMPLETA DE MATRIPUNTOS

## 🎯 LECTURA RECOMENDADA (EN ESTE ORDEN)

Este documento te guiará por todos los documentos en el orden correcto para entender el proyecto completamente.

---

## **PARTE 1: VISIÓN Y CONTEXTO**

### 1. **PROYECTO_VISION.md** (empezar aquí)
- ¿Qué es Matripuntos?
- Por qué existe
- Objetivo principal
- Propuesta de valor

**Tiempo estimado: 5 minutos**

---

## **PARTE 2: ESPECIFICACIONES TÉCNICAS**

### 2. **ESPECIFICACION_COMPLETA.md**
- Stack tecnológico
- Arquitectura general
- Base de datos (11 tablas con relaciones)
- Endpoints API (15+ endpoints)
- Flujos de autenticación

**Tiempo estimado: 20 minutos**

---

## **PARTE 3: LÓGICA DE NEGOCIO**

### 3. **SISTEMA_PUNTOS_COMPLETO.md**
- Cómo se calculan los matripuntos
- Fórmula exacta con ejemplos
- Multiplicadores (tipo actividad, franja horaria, duración, hijos)
- Compensaciones
- Casos de uso

**Tiempo estimado: 15 minutos**

---

## **PARTE 4: FUNCIONALIDADES DETALLADAS**

### 4. **FUNCIONALIDADES_DETALLADAS.md**
- Cada feature con:
  - Descripción completa
  - Casos de uso
  - Flujos paso a paso
  - Pantallas implicadas
  - Campos y validaciones

**Tiempo estimado: 25 minutos**

---

## **PARTE 5: DISEÑO Y MOCKUPS**

### 5. **MOCKUPS_ASCII.md**
- Wireframes de todas las 5 páginas
- Flujos visuales
- Componentes principales
- Layout responsive

**Tiempo estimado: 10 minutos**

---

## **PARTE 6: ESTRUCTURA DEL CÓDIGO**

### 6. **ESTRUCTURA_CODIGO.md**
- Carpetas y archivos clave
- Qué hace cada archivo
- Dónde están las funcionalidades
- Patrones de código

**Tiempo estimado: 15 minutos**

---

## **PARTE 7: GUÍAS PRÁCTICAS**

### 7. **GUIA_DESPLIEGUE_PRODUCCION.md**
- Paso a paso para llevar a producción
- Configuración de servicios (Supabase, Railway, Vercel)
- Variables de entorno
- Testing en producción

**Tiempo estimado: 30 minutos (si lo implementas)**

### 8. **GUIA_DESARROLLO_LOCAL.md**
- Cómo ejecutar en local
- Debugging
- Modificar y extender
- Agregar nuevas features

**Tiempo estimado: 15 minutos**

---

## **PARTE 8: REFERENCIAS**

### 9. **REFERENCIA_API.md**
- Todos los 15+ endpoints
- Parámetros exactos
- Respuestas esperadas
- Códigos de error

**Tiempo estimado: Consulta según sea necesario**

### 10. **DICCIONARIO_TERMINOS.md**
- Términos técnicos explicados
- Vocabulario del negocio
- Abreviaturas usadas

**Tiempo estimado: Consulta según sea necesario**

---

## **QUICKSTART PARA NUEVOS DESARROLLADORES**

Si solo tienes 30 minutos:
1. PROYECTO_VISION.md (5 min)
2. ESPECIFICACION_COMPLETA.md (10 min)
3. MOCKUPS_ASCII.md (10 min)
4. ESTRUCTURA_CODIGO.md (5 min)

---

## **SI QUIERES IMPLEMENTAR CAMBIOS**

1. Lee: SISTEMA_PUNTOS_COMPLETO.md (entiende la lógica)
2. Lee: FUNCIONALIDADES_DETALLADAS.md (qué existe)
3. Lee: ESTRUCTURA_CODIGO.md (dónde cambiar)
4. Lee: GUIA_DESARROLLO_LOCAL.md (cómo probar)

---

## **SI QUIERES DESPLEGAR A PRODUCCIÓN**

1. Lee: ESPECIFICACION_COMPLETA.md (entiende la arquitectura)
2. Lee: GUIA_DESPLIEGUE_PRODUCCION.md (paso a paso)
3. Ejecuta cada paso cuidadosamente

---

## **DURACIÓN TOTAL POR TIPO DE USUARIO**

| Tipo | Documentos | Tiempo |
|------|-----------|--------|
| **Entender el proyecto** | 1-5 | 60 min |
| **Continuar desarrollo** | 1-8 | 120 min |
| **Desplegar a producción** | 1-7 | 150 min |
| **Mantenimiento/Fixes** | 1,6,9,10 | 60 min |

---

## **ESTRUCTURA DE CARPETAS**

```
DOCS_COMPLETAS/
├── 00_LECTURA_PRIMERO.md          ← EMPIEZA AQUÍ
├── 01_PROYECTO_VISION.md           ← Qué es y por qué
├── 02_ESPECIFICACION_COMPLETA.md   ← Tech stack y arquitectura
├── 03_SISTEMA_PUNTOS_COMPLETO.md   ← Cálculos de puntos
├── 04_FUNCIONALIDADES_DETALLADAS.md ← Cada feature
├── 05_MOCKUPS_ASCII.md              ← Wireframes
├── 06_ESTRUCTURA_CODIGO.md          ← Dónde está cada cosa
├── 07_GUIA_DESPLIEGUE_PRODUCCION.md ← Cómo llevar a producción
├── 08_GUIA_DESARROLLO_LOCAL.md      ← Cómo trabajar localmente
├── 09_REFERENCIA_API.md             ← Todos los endpoints
└── 10_DICCIONARIO_TERMINOS.md       ← Glosario
```

---

## **INFORMACIÓN CRÍTICA RESUMIDA**

### Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: SQLite (local) → PostgreSQL (Supabase en prod)
- **Auth**: JWT tokens
- **State**: Zustand
- **UI**: Tailwind CSS + Lucide icons

### Arquitectura
```
Cliente (React)
    ↓ API Call + JWT
Servidor (Express)
    ↓ Prisma ORM
Base de Datos (SQL)
```

### Funcionalidad Principal
Pareja crea actividades, las negocia con puntos, y llega a acuerdos sobre quién se encarga de qué.

### Cálculo de Puntos
```
Puntos = Base × FactorTipo × FactorFranja × FactorDuración × FactorHijos × (1 - Compensación%)
```

### Flujo Principal
Usuario → Login → Dashboard → Solicitar Actividad → Negociar → Aceptar

---

## **NOTAS IMPORTANTES**

⚠️ **Antes de continuar el desarrollo:**
- Lee TODO (especialmente SISTEMA_PUNTOS_COMPLETO.md)
- Entiende cómo se calculan los puntos
- Mira los mockups para saber qué falta

💾 **Para producción:**
- Usa Supabase para la base de datos
- Usa Railway para el backend
- Usa Vercel para el frontend
- Todas las variables de entorno están documentadas

🔧 **Para debugging:**
- Backend logs en terminal (puerto 3000)
- Frontend logs en DevTools (puerto 5173)
- DB logs en Supabase dashboard

---

## **PRÓXIMOS PASOS DESPUÉS DE LEER TODO**

1. Entender la lógica actual del sistema
2. Identificar qué features faltan
3. Decidir qué agregar
4. Seguir GUIA_DESARROLLO_LOCAL.md para implementar
5. Testear en local
6. Desplegar con GUIA_DESPLIEGUE_PRODUCCION.md

---

## **¿PREGUNTAS FRECUENTES?**

**P: ¿Por dónde empiezo si soy nuevo?**
R: Empieza con PROYECTO_VISION.md, luego lee en orden.

**P: ¿Qué documentos leo si solo quiero arreglar un bug?**
R: Lee ESTRUCTURA_CODIGO.md + REFERENCIA_API.md

**P: ¿Cómo agrego una nueva feature?**
R: Lee FUNCIONALIDADES_DETALLADAS.md + GUIA_DESARROLLO_LOCAL.md

**P: ¿Dónde está el código?**
R: Está en el repositorio GitHub. ESTRUCTURA_CODIGO.md te dice dónde.

---

## **CONTACTO Y RECURSOS**

- **Repo GitHub**: https://github.com/wikiedu/claude_matripuntos
- **Frontend en producción**: https://matripuntos.vercel.app
- **Backend en producción**: https://matripuntos-production-xxxx.up.railway.app
- **Base de datos**: Supabase (PostgreSQL)

---

**¡Bienvenido al equipo de Matripuntos! 🚀**

Comienza leyendo el siguiente documento: `01_PROYECTO_VISION.md`
