# 17 · Copys

Textos listos para usar en el sitio, en los metadatos y en las publicaciones de lanzamiento. **Desarrollo los carga en el seed o en `content/`; no los inventa.** Todo lo que lleva **(validar)** es un dato que debe confirmar el área dueña antes del lanzamiento: mientras tanto se guarda con `isVerified = false` y no se muestra (cifras) o se muestra tal cual con el dato provisional (textos).

Voz (doc 02 §8): **tú**, cálido y directo, frases cortas, orgullo guatemalteco sin exagerar, cero signos de exclamación dobles.

## 1. Global

| Elemento | Texto |
|---|---|
| Marca en el header | Bolik |
| Menú | Productos · Dónde comprar · Escuelas · Mayoreo · Empresas · Nosotros |
| Botón principal del header | Cotizar |
| Buscador (placeholder) | Busca por producto, código o código de barras |
| Etiqueta del badge | {n} productos en tu cotización |
| Botón flotante | Escríbenos por WhatsApp |
| Pie, frase | Útiles para escribir la historia de Guatemala desde 1966. |
| Pie, columnas | Productos · Para ti (Familias, Escuelas, Librerías, Empresas) · Bolik (Nuestra historia, Preguntas frecuentes, Contacto) · Legal |
| Pie, datos | Industrias Bolik, S.A. **(validar razón social)** · San José Villa Nueva, Guatemala · +502 6628 2600 · Lunes a viernes, 7:30 a 16:30 **(validar horario)** |
| Pie, legal | © {año} Bolik. Hecho en Guatemala. |
| Saltar al contenido | Saltar al contenido |
| Splash (`aria-label`) | Bolik, desde 1966 |

## 2. Inicio

### Hero (4 capítulos)

`h1` fijo: **De la materia prima a tu primer trazo.**
Chip: **60 años · Hecho en Guatemala**

| Capítulo | Pestaña | Texto | CTA principal | CTA secundario |
|---|---|---|---|---|
| 1 | Planta | En Villa Nueva fabricamos cada bolígrafo, crayón y marcador que llega a tus manos. Desde 1966. | Ver productos | Nuestra historia |
| 2 | Aula | Útiles que aguantan todo el ciclo escolar: desde el primer garabato hasta el último examen. | Kits escolares | Bolik en tu escuela |
| 3 | Oficina | Bolígrafos que escriben parejo, firma tras firma, en la oficina y en el campo. | Ver bolígrafos | Personalizados con tu logo |
| 4 | Librería | ¿Vendes útiles? Compra directo de fábrica, por cajilla o por fardo. | Cotizar por mayor | Ser distribuidor |

### Cifras (`SiteStat`)

| Cifra | Etiqueta | Estado |
|---|---|---|
| 60 | años escribiendo con Guatemala | Verificada (1966–2026) |
| 150+ | productos | **(validar)** |
| 1,800+ | puntos de venta | **(validar)** |
| 22 | departamentos con Bolik | **(validar)** |

### Soluciones · "Un Bolik para cada etapa"

| Tarjeta | Texto | Enlace |
|---|---|---|
| Colegios | Útiles y actividades para que escribir sea divertido. | `/escuelas` |
| Universidades | Bolígrafos con el logo de tu facultad o asociación. | `/empresas` |
| Empresas | Lapiceros personalizados para eventos y equipos. | `/empresas` |
| Librerías | Precio de fábrica por cajilla y fardo. | `/mayoreo` |
| Distribuidores | Lleva Bolik a tu municipio. | `/mayoreo#distribuidor` |

### Catálogo destacado
- Título: **Encuentra lo que necesitas**
- Texto: Más de 150 útiles **(validar)** para la escuela, la oficina y la casa.
- Botón: Ver todo el catálogo

### Bolik Ultra
- Eyebrow: El favorito de Guatemala **(validar si se puede afirmar; alternativa: "Nuestro bolígrafo estrella")**
- Título: **Bolik Ultra**
- Texto: Bolígrafo hexagonal de punta mediana 1.0 mm con tinta de baja viscosidad: escribe suave y no se corre con el agua.
- Beneficios: Punta de última generación · Tapa ventilada · Resistente al agua y a la luz · Cuerpo hexagonal que no rueda
- Chips: Azul · PT00058 — Negro · PT00059 — Rojo · PT00060
- Botones: Ver ficha · Dónde comprar

### Bolik en tu escuela
- Título: **Bolik en tu escuela**
- Texto: Visitamos colegios con talleres de escritura, dibujo y creatividad. Tú pones las ganas; nosotros, los útiles.
- Botón: Lleva Bolik a tu escuela

### Mayoreo y empresas
- Librerías y distribuidores: **Compra directo de fábrica.** Precio por cajilla y fardo, ejecutivo por zona y preventa escolar. → Cotizar por mayor
- Empresas y universidades: **Tu logo, en manos de todos.** Bolígrafos personalizados para eventos, ferias y kits de bienvenida. → Cotizar personalizados

### Dónde comprar
- Título: **Bolik está cerca de ti**
- Texto: Encuéntranos en librerías, supermercados y cadenas de todo el país, o compra en línea.
- Selector: Elige tu departamento
- Botones: Comprar en Walmart · Comprar en La Torre · Ver todas las tiendas

### Kits escolares 2027
- Título: **Kits escolares 2027**
- Texto: Todo lo de la lista, en un solo paquete, por grado.

### Historia
- Título: **60 años escribiendo con Guatemala**
- Botón: Conoce nuestra historia

### CTA final
- Título: **¿Compras por mayor?**
- Texto: Arma tu lista en minutos y recibe precio de fábrica en un día hábil.
- Botones: Armar mi cotización · Escribir por WhatsApp

## 3. Catálogo, categorías y ficha

| Lugar | Texto |
|---|---|
| `/productos` `h1` | Catálogo Bolik |
| Intro | Útiles escolares y de oficina fabricados en Guatemala. Filtra por uso o busca por código. |
| Filtros | Uso: Escolar · Oficina · Arte y manualidades · Promocional |
| Contador | {n} productos |
| Tarjeta, botón | Ver producto |
| Sin resultados con filtros | No hay productos con esos filtros. · Quitar filtros |

Intros de categoría (2–3 frases, para SEO; el resto de cada intro lo completa el admin):

| Categoría | Intro |
|---|---|
| Bolígrafos | Bolígrafos y lapiceros Bolik de punta mediana y fina, fabricados en Guatemala. Para la escuela, la oficina y para personalizar con tu logo. |
| Lápices y lápices de colores | Lápices de grafito y de colores para dibujar, colorear y escribir desde preprimaria. |
| Crayones de cera | Crayones de cera de colores intensos, pensados para manos pequeñas. |
| Marcadores | Marcadores de pizarra, permanentes y fluorescentes para el aula y la oficina. |
| Pegamentos y silicón | Pegamento y silicón para tareas, manualidades y proyectos escolares. |
| Borradores y sacapuntas | Borradores y sacapuntas que acompañan todo el ciclo escolar. |
| Tijeras, reglas y geometría | Tijeras escolares, reglas y juegos de geometría para clase. |
| Artículos publicitarios | Bolígrafos y artículos con el logo de tu empresa o institución. |

> Las intros deben coincidir con lo que realmente se fabrica: **(validar cada categoría con el catálogo vigente)**.

### Ficha del Bolik Ultra (seed)

- `h1`: **Bolik Ultra**
- Tagline: Bolígrafo hexagonal de punta mediana 1.0 mm.
- Descripción: Bolígrafo fabricado con tintas elásticas para un deslizamiento suave en el papel. Su punta de níquel permite que la bola de carburo de tungsteno ruede mejor, trazo tras trazo.
- Datos clave (`keyFacts`):
  - Fabricado por Industrias Bolik, S.A. en Guatemala.
  - Bolígrafo de cuerpo hexagonal con punta mediana de 1.0 mm.
  - Tinta de baja viscosidad, resistente al agua y a la luz.
  - Colores: azul (PT00058), negro (PT00059) y rojo (PT00060).
  - Se vende en blister de 1, 3 y 5; cajilla de 12; fardo de 100 cajillas.
- Selector de color: Color: {color} · Código {sku}
- Selector de empaque: Presentación · Blister de 1 · Blister de 3 · Blister de 5 · Cajilla de 12 · Fardo (100 cajillas)
- Cantidad: ¿Cuántas {presentación} necesitas?
- Botones: **Agregar a mi cotización** · Preguntar por WhatsApp · Dónde comprar
- Sección medidas: Medidas y empaque
- Advertencia: Uso bajo supervisión de un adulto con niños menores de 3 años. Contiene partes pequeñas que pueden ser ingeridas o inhaladas. Evitar temperaturas superiores a 45 °C y la exposición directa al sol. Almacenar en un lugar seco y ventilado.
- Actualizado: Actualizado el {fecha}
- Relacionados: También te puede servir

## 4. Páginas por público

### `/escuelas`
- `h1`: **¡Aprender a escribir es una aventura!**
- Intro: Llevamos talleres de escritura, dibujo y creatividad a colegios y escuelas de Guatemala. Sin costo para la institución **(validar)**.
- Cómo funciona: 1. Nos escribes · 2. Coordinamos la fecha · 3. Visitamos tu escuela · 4. Entregamos material para cada niño **(validar)**
- Formulario, título: **Lleva Bolik a tu escuela**
- Campos: Nombre del colegio · Nivel (Preprimaria, Primaria, Básicos, Diversificado) · Alumnos aproximados · Departamento · Municipio · Tu nombre · Teléfono o correo · Mes preferido
- Botón: Enviar solicitud

### `/mayoreo`
- `h1`: **Compra Bolik por mayor, directo de fábrica**
- Beneficios: Precio por cajilla y por fardo · Un ejecutivo para tu zona **(validar)** · Preventa para la temporada escolar · Cotización por WhatsApp
- Pasos: 1. Agrega productos · 2. Envía tus datos · 3. Recibe tu precio en un día hábil
- Presentaciones: **Blister** (1, 3 o 5 unidades, listo para colgar) · **Cajilla** (12 unidades) · **Fardo** (100 cajillas)
- Distribuidor, título: **Quiero ser distribuidor**
- Distribuidor, texto: ¿Tienes una librería, tienda o ruta de distribución? Cuéntanos de tu negocio.
- Campos: Nombre del negocio · Tipo (Librería, Tienda, Distribuidor, Otro) · NIT (opcional) · Departamento · Municipio · Tu nombre · Teléfono · Correo
- Botón: Enviar solicitud

### `/empresas`
- `h1`: **Bolígrafos personalizados con el logo de tu empresa**
- Intro: Para eventos, ferias, kits de bienvenida, universidades y campañas. Fabricados en Guatemala.
- Pasos: 1. Cotizas · 2. Nos envías tu logo · 3. Apruebas la muestra digital · 4. Producimos y entregamos
- Pedido mínimo: Pedido mínimo: {pedidoMinimo} unidades (`SiteSetting`)
- Pregunta del formulario: ¿Tienes tu logo listo? (Sí, en vector · Sí, en imagen · Todavía no)

### `/kits-escolares`
- `h1`: **Kits escolares 2027**
- Intro: La lista completa del grado en un solo paquete.
- Botón por kit: Cotizar para mi colegio
- Sin kits publicados: **Próximamente.** Estamos preparando los kits del ciclo 2027.

### `/nuestra-historia`
- `h1`: **60 años escribiendo con Guatemala**
- Intro: En junio de 1966 nació en Guatemala la Fábrica de Bolígrafos K-66. Hoy, como parte de Grupo K-66, seguimos fabricando en Villa Nueva los útiles con los que miles de guatemaltecos aprenden, trabajan y crean.
- Hitos: solo los verificados (`HistoryMilestone.isVerified`). 1966: Nace la Fábrica de Bolígrafos K-66. 2026: 60 años de Bolik. Los intermedios **(validar)**.

### `/donde-comprar`
- `h1`: **Dónde comprar Bolik**
- Intro: Encuentra librerías, supermercados y cadenas con productos Bolik en tu departamento.
- Botón de ubicación: Usar mi ubicación
- Lista: {n} tiendas en {departamento}
- Tarjeta de tienda: Cómo llegar · Llamar
- En línea: Compra en línea en Walmart Guatemala y La Torre.
- `/donde-comprar/[dep]` `h1`: Dónde comprar Bolik en {departamento}

### `/contacto`
- `h1`: **Hablemos**
- Accesos: ¿Quieres cotizar? → Armar cotización · ¿Eres un colegio? → Bolik en tu escuela
- Asuntos: Información de productos · Cotización · Escuelas · Distribución · Otro

### `/cotizacion`
- `h1`: **Mi cotización**
- Tipo de cliente: Librería o tienda · Empresa · Colegio o universidad · Otro
- Campos: Nombre de la institución (opcional para "Otro") · Tu nombre · Teléfono · Correo (al menos uno de los dos) · Departamento · Municipio · Notas ("¿Algo que debamos saber? Fechas, colores, entregas…")
- Botón: **Enviar cotización**
- Nota bajo el botón: No es una compra. Un ejecutivo te enviará precio y disponibilidad.

### `/cotizacion/enviada/[folio]`
- `h1`: **¡Recibimos tu cotización!**
- Texto: Tu número de seguimiento es **{folio}**. Un ejecutivo de {departamento} te contactará en un día hábil.
- Botones: Escribir por WhatsApp con mi folio · Seguir viendo productos

### 404 y 500
- 404: **Esta página se borró como lápiz.** Puede que la dirección haya cambiado. Busca un producto o vuelve al inicio.
- 500: **Algo salió mal de nuestro lado.** Ya lo estamos revisando. Intenta de nuevo o escríbenos por WhatsApp.

<a id="microcopy"></a>
## 5. Microcopy

La fuente única de toasts y diálogos es `src/content/feedback.ts` (starter). Esta tabla resume las reglas y los textos de interfaz que no son feedback.

| Situación | Texto |
|---|---|
| Botón cargando | Enviando… / Guardando… / Buscando… |
| Campo obligatorio | Este dato es necesario |
| Teléfono inválido | Escribe un teléfono de 8 dígitos, por ejemplo 5555 1234 |
| Correo inválido | Revisa tu correo, por ejemplo nombre@correo.com |
| Teléfono o correo | Déjanos al menos un teléfono o un correo |
| Cantidad mínima | La cantidad mínima es 1 |
| Cantidad máxima | Para más de 9,999, escríbenos por WhatsApp |
| NIT | Escribe tu NIT o "CF" |
| Sin JavaScript (formularios) | Para enviar este formulario activa JavaScript o escríbenos por WhatsApp al {numero}. |
| Buscador vacío | Escribe al menos 2 letras |
| Buscador, sugerencias | Prueba con: Bolik Ultra · crayones · marcador de pizarra |
| Mapa cargando | Cargando mapa… |
| Imagen sin cargar (`alt`) | {Producto} {color}, vista {n} |
| Volver arriba | Volver arriba |
| Deshacer | Deshacer |
| Cerrar diálogo | Cerrar |
| Admin, tabla vacía | Todavía no hay {elementos}. |
| Admin, sin resultados | No encontramos {elementos} con esos filtros. |

## 6. Metadatos

Los títulos están en doc 10 §1. Descripciones por defecto (140–160 caracteres; editables en el admin):

| Página | Meta description |
|---|---|
| `/` | Útiles escolares y de oficina fabricados en Guatemala desde 1966. Encuentra dónde comprar Bolik, cotiza por mayor o lleva Bolik a tu escuela. |
| `/productos` | Catálogo completo de Bolik: bolígrafos, lápices, crayones, marcadores y más, hechos en Guatemala. Filtra por uso y cotiza por mayor. |
| `/productos/boligrafos` | Bolígrafos y lapiceros Bolik hechos en Guatemala: Bolik Ultra y más. Mira colores y presentaciones, encuentra dónde comprar o cotiza por mayor. |
| `/productos/boligrafos/bolik-ultra` | Bolik Ultra: bolígrafo hexagonal de punta mediana 1.0 mm, tinta resistente al agua. Azul, negro y rojo. Encuentra dónde comprar o cotiza. |
| `/donde-comprar` | Encuentra librerías, supermercados y cadenas con productos Bolik en tu departamento, o compra en línea en Walmart y La Torre. |
| `/donde-comprar/[dep]` | Tiendas y librerías con productos Bolik en {departamento}: direcciones, teléfonos y cómo llegar. Útiles escolares hechos en Guatemala. |
| `/mayoreo` | Compra lapiceros y útiles escolares Bolik por mayor, directo de fábrica: precio por cajilla y fardo. Cotiza en minutos o hazte distribuidor. |
| `/empresas` | Lapiceros personalizados con el logo de tu empresa o universidad, fabricados en Guatemala por Bolik. Cotiza tu pedido para eventos y ferias. |
| `/escuelas` | Bolik en tu escuela: talleres de escritura, dibujo y creatividad para colegios de Guatemala. Solicita una visita para tus alumnos. |
| `/kits-escolares` | Kits escolares Bolik 2027 por grado: la lista completa en un solo paquete. Cotiza para tu colegio o encuentra dónde comprar. |
| `/nuestra-historia` | Desde 1966, Bolik fabrica en Guatemala los útiles con los que miles aprenden y trabajan. Conoce la historia de la Fábrica de Bolígrafos K-66. |
| `/preguntas-frecuentes` | Respuestas sobre productos Bolik, dónde comprar, compras por mayor, personalizados y visitas a escuelas. |
| `/contacto` | Contacta a Bolik: teléfono, WhatsApp y dirección de la planta en Villa Nueva, Guatemala. Escríbenos para cotizaciones e información. |

Texto alternativo de la imagen OG por defecto: "Bolik, útiles escolares y de oficina hechos en Guatemala".

## 7. Preguntas frecuentes (seed)

Primera oración = respuesta directa (doc 11 §5). Las marcadas **(validar)** no se publican hasta confirmarse.

| Grupo | Pregunta | Respuesta |
|---|---|---|
| Productos | ¿Dónde se fabrican los productos Bolik? | En Guatemala. Bolik fabrica y empaca sus productos en su planta de San José Villa Nueva desde 1966. |
| Productos | ¿Qué punta tiene el Bolik Ultra? | Punta mediana de 1.0 mm. Es de níquel con bola de carburo de tungsteno, y su tinta de baja viscosidad resiste el agua y la luz. |
| Productos | ¿En qué colores viene el Bolik Ultra? | Azul (código PT00058), negro (PT00059) y rojo (PT00060). |
| Productos | ¿Cuántos bolígrafos trae una cajilla? | 12 unidades. Un fardo trae 100 cajillas, es decir, 1,200 bolígrafos. |
| Dónde comprar | ¿Dónde compro productos Bolik? | En librerías, supermercados y cadenas de Guatemala; en línea, en Walmart Guatemala y La Torre. Busca tu departamento en la página Dónde comprar. |
| Dónde comprar | ¿Venden en El Salvador? | **(validar)** |
| Mayoreo | ¿Puedo comprar directo de fábrica? | Sí, para compras por mayor. Arma tu cotización en el sitio y un ejecutivo te enviará precio y disponibilidad en un día hábil. |
| Mayoreo | ¿Cuál es la compra mínima por mayor? | **(validar)** |
| Mayoreo | ¿Cómo me hago distribuidor de Bolik? | Llena la solicitud en la página Mayoreo. Te responderemos en un máximo de 5 días hábiles. |
| Empresas | ¿Hacen lapiceros personalizados con logo? | Sí. Personalizamos bolígrafos para empresas, universidades y eventos; el pedido mínimo es de {pedidoMinimo} unidades. |
| Empresas | ¿Cuánto tarda un pedido personalizado? | **(validar)** |
| Escuelas | ¿Bolik visita escuelas? | Sí. Bolik en tu escuela lleva talleres de escritura y creatividad a colegios; solicita la visita desde la página Escuelas. |
| Escuelas | ¿La visita tiene costo? | **(validar)** |
| General | ¿Desde cuándo existe Bolik? | Desde junio de 1966, cuando nació en Guatemala la Fábrica de Bolígrafos K-66, hoy parte de Grupo K-66. |
| General | ¿El sitio vende en línea? | No. En el sitio puedes ver el catálogo, encontrar dónde comprar y pedir cotizaciones por mayor; para comprar en línea, usa Walmart Guatemala o La Torre. |

## 8. Correos

### Interno (a Ventas)
- Asunto: `Nueva cotización {folio} · {tipoCliente} · {departamento}`
- Cuerpo: Datos del cliente (nombre, institución, teléfono, correo, departamento, municipio), tabla de líneas (producto, color, código, presentación, cantidad), notas, origen (UTM y página), botón **Abrir en el admin**.

### Acuse (al cliente)
- Asunto: `Recibimos tu cotización {folio}`
- Cuerpo:
  > Hola, {nombre}:
  >
  > Recibimos tu solicitud de cotización **{folio}**. Un ejecutivo de ventas te contactará en un día hábil con precios y disponibilidad.
  >
  > Esto es lo que pediste: {tabla de líneas}
  >
  > ¿Necesitas algo antes? Escríbenos por WhatsApp al {numero} y menciona tu folio.
  >
  > Gracias por preferir Bolik, hecho en Guatemala desde 1966.

Escuelas y distribuidores siguen el mismo patrón con sus folios (`ESC`, `DIS`) y los plazos de `feedback.ts`.

## 9. Publicaciones de lanzamiento

Textos listos para quien maneje las redes. Todos los enlaces llevan UTM: `?utm_source={red}&utm_medium=social&utm_campaign=lanzamiento_web_2027`.

### Facebook
**Post 1 · Lanzamiento**
> Estrenamos casa en internet. 🖊️
> En **bolik66.com** ya puedes ver todo nuestro catálogo, encontrar la librería más cercana en tu departamento y, si tienes negocio, cotizar por mayor en minutos.
> 60 años escribiendo con Guatemala, ahora también desde tu teléfono.
> 👉 bolik66.com

**Post 2 · Dónde comprar**
> ¿Dónde consigo Bolik en Xela, Cobán o Zacapa? 📍
> Entra a bolik66.com/donde-comprar, elige tu departamento y listo: tiendas, direcciones y cómo llegar.

### Instagram
**Carrusel (5 láminas)**
1. Nuevo bolik66.com
2. Todo el catálogo en tu teléfono
3. Encuentra tu librería más cercana
4. ¿Tienes negocio? Cotiza por mayor
5. Link en bio

Texto:
> Nuevo bolik66.com ✏️ Catálogo completo, tiendas cerca de ti y cotizaciones por mayor. Hecho en Guatemala desde 1966.
> #Bolik #HechoEnGuatemala #RegresoAClases #ÚtilesEscolares #Guatemala

**Reel (15 s)**
> Gancho: "¿Sabías que tu lapicero favorito se fabrica en Villa Nueva?" → tomas de la planta → pantalla del sitio en un teléfono → "Encuéntralo en bolik66.com".

### LinkedIn
> Bolik estrena sitio web.
> Después de 60 años fabricando útiles escolares y de oficina en Guatemala, lanzamos **bolik66.com**: catálogo con fichas técnicas, localizador de puntos de venta y cotizaciones en línea para librerías, distribuidores, empresas e instituciones educativas.
> Si tu empresa necesita bolígrafos personalizados o tu librería quiere comprar directo de fábrica, empieza aquí: bolik66.com/mayoreo
> #HechoEnGuatemala #Manufactura #Educación

### TikTok (guion de 20 s)
> 0–3 s: "POV: buscas útiles para el regreso a clases y no sabes dónde."
> 3–12 s: Pantalla del teléfono: bolik66.com → Dónde comprar → elegir departamento → aparece la tienda.
> 12–18 s: "Y si tienes librería, cotizas por mayor desde aquí."
> 18–20 s: Logo + "bolik66.com".
> Texto: Regreso a clases resuelto ✏️ #RegresoAClases #Guatemala #Bolik

### WhatsApp (difusión a clientes)
> Hola 👋 Te saluda Bolik.
> Estrenamos sitio web: ahora puedes armar tu cotización por mayor en minutos y recibir precio en un día hábil.
> 👉 bolik66.com/mayoreo
> Si tienes dudas, responde a este mensaje.

### Estado / historias (texto corto)
> Nuevo bolik66.com ✏️ Encuentra Bolik cerca de ti.
