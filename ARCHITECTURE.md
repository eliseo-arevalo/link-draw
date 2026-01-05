# Excaligraph - Arquitectura Core (Sprint 1 & 2)

## 🏗️ Arquitectura General

```mermaid
graph TB
    subgraph "UI Layer (Sprint 3)"
        UI[React Components]
    end
    
    subgraph "Service Layer"
        DS[DrawingService]
        LS[LinkService]
    end
    
    subgraph "State Management"
        DrawStore[DrawingStore]
        TreeStore[TreeStore]
        TempStore[TempStore]
    end
    
    subgraph "Adapters"
        ExcAdapter[ExcalidrawAdapter]
    end
    
    subgraph "Repository"
        LSRepo[LocalStorageRepository]
    end
    
    subgraph "External"
        Excalidraw[Excalidraw Library]
        LocalStorage[Browser LocalStorage]
    end
    
    UI --> DS
    UI --> LS
    UI --> DrawStore
    UI --> TreeStore
    UI --> TempStore
    
    DS --> LSRepo
    DS --> ExcAdapter
    
    LS --> LSRepo
    LS --> ExcAdapter
    
    ExcAdapter --> Excalidraw
    LSRepo --> LocalStorage
    
    style DS fill:#a8e6cf
    style LS fill:#a8e6cf
    style ExcAdapter fill:#ffd3b6
    style LSRepo fill:#ffd3b6
```

---

## 📦 Capas de la Arquitectura

### **1. Repository Layer** (Persistencia)
```
src/shared/repositories/
└── localStorage/
    ├── LocalStorageRepository.ts    # Implementa IGraphRepository
    └── helpers/
        ├── tree-builder.ts          # Construye árbol de drawings
        └── circular-validator.ts    # Valida referencias circulares
```

**Responsabilidad**: Abstraer el acceso a datos
- CRUD de drawings
- Construcción de árbol jerárquico
- Validación de integridad

---

### **2. Adapter Layer** (Integración Externa)
```
src/shared/adapters/
└── excalidraw/
    └── ExcalidrawAdapter.ts         # Implementa ICanvasAdapter
```

**Responsabilidad**: Adaptar Excalidraw a nuestra interfaz
- Gestión de elementos del canvas
- Extracción de links
- Detección de cambios
- Callbacks de eventos

---

### **3. Service Layer** (Lógica de Negocio)
```
src/shared/services/
├── DrawingService.ts                # Orquesta CRUD y canvas
├── LinkService.ts                   # Gestiona links y ciclos
└── link/
    └── graph-algorithms.ts          # Algoritmos de grafos (DFS)
```

**Responsabilidad**: Coordinar operaciones complejas
- Orquestar Repository + Adapter
- Validar reglas de negocio
- Detectar referencias circulares

---

### **4. State Management** (Estado Global)
```
src/shared/store/
├── drawingStore.ts                  # Títulos, navegación, focus
├── treeStore.ts                     # Operaciones de árbol
├── tempStore.ts                     # Drawings temporales
└── graphStore.ts                    # Barrel export
```

**Responsabilidad**: Estado reactivo de la UI
- Optimistic UI updates
- Gestión de temporales
- Navegación activa

---

## 🔄 Flujos Principales

### **Flujo 1: Crear Drawing**

```mermaid
sequenceDiagram
    participant UI
    participant DS as DrawingService
    participant Repo as LocalStorageRepository
    participant Store as TreeStore
    
    UI->>DS: createDrawing(input)
    DS->>Repo: createDrawing(title, parentId)
    Repo->>Repo: generateId()
    Repo->>Repo: validate parent exists
    Repo-->>DS: drawingId
    DS->>Repo: saveDrawing(id, content)
    Repo->>Repo: saveAll(drawings)
    Repo-->>DS: void
    DS-->>UI: drawingId
    UI->>Store: addDrawingToTree(id, title, parentId)
    Store->>Store: update tree state
```

**Pasos**:
1. UI llama a `DrawingService.createDrawing()`
2. Service crea el drawing en el repository
3. Service guarda el contenido
4. UI actualiza el store para optimistic UI

---

### **Flujo 2: Cargar Drawing en Canvas**

```mermaid
sequenceDiagram
    participant UI
    participant DS as DrawingService
    participant Repo as LocalStorageRepository
    participant Adapter as ExcalidrawAdapter
    participant Excalidraw
    
    UI->>DS: loadDrawing(id)
    DS->>Repo: loadDrawing(id)
    Repo->>Repo: getAll()
    Repo-->>DS: drawing
    DS->>Adapter: setContent(drawing.content)
    Adapter->>Excalidraw: updateScene({elements, appState})
    Adapter->>Adapter: markAsSaved()
    DS-->>UI: drawing
```

**Pasos**:
1. UI solicita cargar un drawing
2. Service lo obtiene del repository
3. Service lo carga en el adapter
4. Adapter actualiza Excalidraw
5. Marca como guardado (sin cambios)

---

### **Flujo 3: Auto-Save**

```mermaid
sequenceDiagram
    participant User
    participant Excalidraw
    participant Adapter as ExcalidrawAdapter
    participant Hook as useAutoSave
    participant DS as DrawingService
    participant Repo as LocalStorageRepository
    
    User->>Excalidraw: dibuja/edita
    Excalidraw->>Adapter: onChange(elements, appState)
    Adapter->>Adapter: notifyChange()
    Adapter->>Hook: callback()
    Hook->>Hook: debounce (2s)
    Hook->>DS: saveCurrentDrawing(id)
    DS->>Adapter: getContent()
    Adapter-->>DS: {elements, appState, files}
    DS->>Repo: saveDrawing(id, content)
    Repo->>Repo: updateDrawing()
    Repo->>Repo: saveAll()
    DS->>Adapter: markAsSaved()
```

**Pasos**:
1. Usuario edita en Excalidraw
2. Excalidraw dispara onChange
3. Adapter notifica a los callbacks
4. Hook de auto-save espera 2s (debounce)
5. Service guarda el contenido
6. Marca como guardado

---

### **Flujo 4: Detección de Referencias Circulares**

```mermaid
sequenceDiagram
    participant UI
    participant LS as LinkService
    participant Repo as LocalStorageRepository
    participant Utils as tree-utils
    
    UI->>LS: wouldCreateCircularReference(drawingId, newParentId)
    
    alt newParentId is null
        LS-->>UI: {hasCircularReference: false}
    else drawingId === newParentId
        LS-->>UI: {hasCircularReference: true, message: "Cannot be own parent"}
    else check tree
        LS->>Repo: getDrawingsTree()
        Repo-->>LS: tree[]
        LS->>LS: isDescendantOf(tree, newParent, drawing)
        LS->>Utils: findInTree(tree, ancestor)
        Utils-->>LS: ancestorNode
        LS->>Utils: nodeExists(children, descendant)
        Utils-->>LS: boolean
        
        alt is descendant
            LS->>Utils: getPathToNode(tree, newParentId)
            Utils-->>LS: path[]
            LS-->>UI: {hasCircularReference: true, path, message}
        else not descendant
            LS-->>UI: {hasCircularReference: false}
        end
    end
```

**Algoritmo**:
1. Valida casos triviales (null, self-reference)
2. Obtiene el árbol de drawings
3. Busca si el nuevo padre es descendiente del drawing
4. Si es descendiente → circular reference
5. Retorna resultado con path si hay ciclo

---

### **Flujo 5: Extraer Links de Drawing**

```mermaid
sequenceDiagram
    participant UI
    participant LS as LinkService
    participant Repo as LocalStorageRepository
    participant Adapter as ExcalidrawAdapter
    participant DrawingLinks as drawing-links.ts
    
    UI->>LS: getDrawingLinks(drawingId)
    LS->>Repo: loadDrawing(drawingId)
    Repo-->>LS: drawing
    LS->>LS: extractLinksFromContent(content)
    LS->>Adapter: getContent() [save original]
    LS->>Adapter: setContent(drawing.content)
    LS->>Adapter: extractDrawingLinks()
    Adapter->>DrawingLinks: findDrawingLinks(elements)
    
    loop for each element
        DrawingLinks->>DrawingLinks: isDrawingLink(element.link)
        DrawingLinks->>DrawingLinks: parseDrawingLink(link)
        DrawingLinks->>DrawingLinks: create DrawingLinkInfo
    end
    
    DrawingLinks-->>Adapter: DrawingLinkInfo[]
    Adapter-->>LS: DrawingLink[]
    LS->>Adapter: setContent(originalContent) [restore]
    LS-->>UI: DrawingLink[]
```

**Pasos**:
1. Service carga el drawing
2. Guarda contenido actual del canvas
3. Carga contenido del drawing temporalmente
4. Extrae links usando utilidades
5. Restaura contenido original
6. Retorna links encontrados

---

## 🗂️ Estructura de Datos

### **Drawing**
```typescript
interface Drawing {
  id: string                    // UUID
  title: string                 // "Mi Diagrama"
  content: ExcalidrawContent    // {elements, appState, files}
  parent_id: string | null      // Jerarquía
  is_public: boolean
  created_at: string            // ISO timestamp
  updated_at: string            // ISO timestamp
}
```

### **DrawingTreeNode**
```typescript
interface DrawingTreeNode extends Drawing {
  children?: DrawingTreeNode[]  // Árbol recursivo
}
```

### **DrawingLink**
```typescript
interface DrawingLink {
  elementId: string             // ID del elemento con el link
  targetDrawingId: string       // ID del drawing destino
  targetType: "drawing" | "element" | "frame"
}
```

---

## 🔗 Formato de Links

```
drawing://[drawingId]                    → Link a drawing completo
drawing://[drawingId]#element:[elementId] → Link a elemento específico
drawing://[drawingId]#frame:[frameId]     → Link a frame específico
```

**Ejemplo**:
```
drawing://abc123
drawing://abc123#element:xyz789
drawing://abc123#frame:frame-001
```

---

## 🎯 Patrones de Diseño Utilizados

### **1. Repository Pattern**
- `IGraphRepository` abstrae persistencia
- Permite cambiar de localStorage a Firebase sin cambiar servicios

### **2. Adapter Pattern**
- `ExcalidrawAdapter` adapta API de Excalidraw
- Permite cambiar de librería de canvas sin cambiar servicios

### **3. Service Layer Pattern**
- `DrawingService` y `LinkService` encapsulan lógica de negocio
- Orquestan Repository + Adapter

### **4. Dependency Injection**
- Servicios reciben dependencias en constructor
- Facilita testing y flexibilidad

### **5. Observer Pattern**
- `ExcalidrawAdapter` usa callbacks (onChange, onSave)
- Hooks de React se suscriben a cambios

---

## 📊 Complejidad de Operaciones

| Operación | Complejidad | Notas |
|-----------|-------------|-------|
| `createDrawing` | O(n) | Validar parent existe |
| `loadDrawing` | O(n) | Buscar en array |
| `getDrawingsTree` | O(n) | Construir árbol con Map |
| `setDrawingParent` | O(d) | d = profundidad del árbol |
| `getDrawingSummaries` | O(n) | Con Set para hasChildren |
| `wouldCreateCircularReference` | O(d) | Caminar hacia arriba |
| `detectCycle` (links) | O(V + E) | DFS en grafo |
| `getBacklinks` | O(n) | Iterar todos los drawings |

**Optimizaciones aplicadas**:
- ✅ Uso de `Map` para lookups O(1)
- ✅ Uso de `Set` para checks O(1)
- ✅ Evitar iteraciones anidadas
- ✅ Extracción de links sin I/O repetido

---

## 🚀 Preparado para Sprint 3

**Lo que tenemos**:
- ✅ Persistencia funcionando (LocalStorage)
- ✅ Adaptador de Excalidraw
- ✅ Servicios con lógica de negocio
- ✅ State management con Zustand
- ✅ Detección de ciclos
- ✅ Auto-save hooks

**Lo que falta (Sprint 3)**:
- ⏳ Componentes de UI
- ⏳ Integración de servicios con UI
- ⏳ Navegación entre drawings
- ⏳ Visualización del árbol
- ⏳ Canvas con Excalidraw

---

## 📝 Notas de Implementación

### **Decisiones Clave**

1. **LocalStorage como primera implementación**
   - Rápido para desarrollo
   - Fácil de debuggear
   - Preparado para migrar a Supabase

2. **Links almacenados en contenido**
   - No hay tabla separada de links
   - Se extraen on-demand del contenido
   - Simplifica la implementación inicial

3. **Stores divididos por dominio**
   - `drawingStore`: UI state (títulos, navegación)
   - `treeStore`: Operaciones de árbol
   - `tempStore`: Drawings temporales
   - Cada uno < 200 líneas

4. **Mutación de canvas encapsulada**
   - `extractLinksFromContent()` es privado
   - Guarda/restaura estado del canvas
   - Evita efectos secundarios visibles

5. **Validación en múltiples capas**
   - Repository: Valida integridad de datos
   - Service: Valida reglas de negocio
   - UI: Validación de formularios (Sprint 3)

---

**Arquitectura sólida y lista para construir la UI** 🎯
