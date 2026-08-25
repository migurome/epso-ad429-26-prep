# Cola de sitios de referencia pendientes de inspección

Lista de trabajo para ir revisando e incorporando contenido "poco a poco" a los bancos de la plataforma. Generada tras una búsqueda amplia (2026-08-22) por categorías: fuentes oficiales UE/gobierno, sitios de terceros específicos de EPSO, publishers de tests psicométricos genéricos (SHL/Kenexa/Cubiks, cuyo formato EPSO imita), y documentación técnica libre para las dos áreas del temario de Ciencia de Datos que el banco de teoría ya señala como huérfanas (HPC y APIs).

**Regla fija, no negociable, antes de tocar cualquier sitio de la Categoría B o C**: comprobar sus Términos de Servicio antes de extraer una sola pregunta. El precedente de esta sesión es `freeepsoquestions.com`: su ToS prohibía explícitamente "copiar/extraer/reproducir en bulk" y "usar sistemas automatizados para acceder o recopilar datos", así que nos negamos a scrapearlo pese a que el usuario insistió dos veces — solo tomamos patrones de diseño genéricos, nunca contenido específico. Cualquier sitio nuevo debe pasar por el mismo filtro. Si el ToS prohíbe scraping/reproducción en bulk, la única vía legítima es leer manualmente unas pocas preguntas de muestra "gratis" que el propio sitio muestra como anzuelo (igual que se hizo aquí con EPSO oficial, donde SÍ estaba permitido por tratarse de material publicado explícitamente para práctica de candidatos).

Estado: 🟡 Pendiente · 🔵 Revisado, uso limitado/bajo valor · 🟢 Revisado, ToS permite algo de uso · 🔴 Revisado, prohibido · ✅ Ya integrado

---

## A. Fuentes oficiales de gobierno/UE (máxima prioridad — el precedente de mejor calidad legal es justo el que ya usamos)

| Sitio | Qué podría aportar | Estado | Notas |
|---|---|---|---|
| `eu-careers.europa.eu` — OAT interactivo (`verbal-ades`, `numerical-testAD-NL`, etc.) | 🔵 Revisado (2026-08-25): existe de verdad (autenticación LTI hacia una instancia externa de TAO Cloud), pero no se pudo comparar su contenido directamente (carga en iframe autenticado, no accesible vía fetch simple). La convención de nombres de EPSO ("**Accessible version** of Sample tests") indica que el PDF es un formato alternativo del MISMO contenido por accesibilidad digital, no un banco distinto. | 🔵 |
| `eu-careers.europa.eu/en/sample-tests/written-test-0` y páginas de EUFTE/FRWT | 🔵 Revisado: solo enlaza a documentos-fuente genéricos e ilustrativos (no ligados a una convocatoria concreta); la página de "asignación de campo" del written test da 404; no se encontró ningún archivo de dossieres reales de convocatorias AD7 ICT pasadas. Confirma que EPSO no publica prompts EUFTE reutilizables a propósito. | 🔵 |
| `publicjobs.ie` (Public Appointments Service, Irlanda) — página de razonamiento verbal | 🔴 Revisado: T&C (`/en/terms-conditions`) permite reproducir contenido "solo para fines no comerciales dentro de tu organización" y "uso personal"; cualquier otro uso "está prohibido" sin consentimiento escrito expreso — no obtenido. Bloqueado para integrarlo en la plataforma. | 🔴 |
| `data.europa.eu/en/academy` | 🟡 Revisado parcialmente: los quizzes de autoevaluación existen de verdad (gratuitos, no de pago) y cubren justo el Topic 3 (DCAT-AP), pero están dentro de un LMS externo (academy.europa.eu) que exige inscribirse — no se pudo ver el contenido de las preguntas sin una sesión autenticada. Pendiente de una revisión manual si alguien quiere inscribirse. | 🟡 |
| EUR-Lex — convocatorias EPSO anteriores de perfil similar (AD7 ICT/TIC de años previos) | 🔵 Revisado: comparada EPSO/AD/398/22 con la actual — pruebas de razonamiento sin cambios; sí cambió el formato de fase 2/3 (2022 usaba estudio de caso + entrevistas; 2026 usa MCQ de campo + EUFTE) y la taxonomía de campos (2022 tenía 5 campos con datos/IA integrados en desarrollo de software; 2026 tiene 4 campos con Ciencia de Datos como campo propio — reestructuración real, no solo cambio de nombre). Dato de contexto interesante, sin contenido de práctica nuevo que extraer. La convocatoria de 2016 (EPSO/AD/331/16) no se pudo leer (PDF ilegible vía fetch). | 🔵 |

## B. Sitios de terceros específicos de preparación EPSO (requieren revisión de ToS antes de cualquier uso)

| Sitio | Qué ofrece (según lo indagado) | Estado |
|---|---|---|
| `eutraining.eu` | 🔴 Revisado (2026-08-25): ToS (`/content/terms-use`) prohíbe explícitamente scraping y extracción de datos ("may not scrape or otherwise copy the Content... any data mining, data gathering or extraction method"). 5 preguntas gratis por tipo de test, pero tras registro. | 🔴 |
| `prepari.eu` | 🔴 Revisado: ToS prohíbe copiar/redistribuir sin autorización explícita. | 🔴 |
| `epsoprep.com` / `blog.epsoprep.com` | 🔴 Revisado: ToS prohíbe copiar/distribuir/modificar sin permiso. Su artículo "11 Free EPSO Test Resources" solo enlaza a fuentes ya conocidas (EPSO oficial, grupos de Facebook, páginas nacionales) — no aporta sitios nuevos de bancos de preguntas. | 🔴 |
| `epsogenius.com` | 🔴 Revisado: Terms prohíbe explícitamente "scrape or extract question content"; contenido IA "no puede reproducirse ni distribuirse". | 🔴 |
| `epsopractice.eu/es` | 🔴 Revisado: ToS §13 prohíbe expresamente "scrape, systematically extract, copy, or harvest content or data"; §12 prohíbe distribuir preguntas/explicaciones sin permiso. | 🔴 |
| `prep4eu.com` | 🔴 Revisado (con reservas — fetch directo bloqueado, ToS reconstruido vía buscador, revisar directamente si se convierte en candidato real): indicios de prohibición de copia/redistribución. | 🔴 |
| `jobtestprep.co.uk/epso-sample-test-free` | 🔴 Revisado: copyright prohíbe expresamente reproducir/redistribuir sin permiso escrito. Muestra 5 preguntas completas con respuesta explicada, de acceso público sin registro — el contenido gratuito más concreto de todo el lote, pero sigue bajo prohibición general de reproducción. | 🔴 |
| `practice4me.com/epso-test-preparation` | 🔴 Revisado: disclaimer prohíbe copiar/cambiar/vender el contenido. Muestra 5 preguntas completas con respuesta explicada, acceso público sin registro (mismo perfil que JobTestPrep). | 🔴 |
| `epsotraining.eu` | 🟡 Técnicamente inaccesible (2026-08-25): el dominio devuelve HTTP 522 (Cloudflare, origen caído/no responde) en dos intentos separados. No se pudo revisar ni ToS ni contenido. Reintentar en una sesión futura antes de descartarlo definitivamente. | 🟡 |
| `epsodrill.com` | 🔵 Revisado (2026-08-25): sus Terms no contienen ninguna cláusula explícita sobre scraping/copia/redistribución (solo una cláusula genérica de "uso aceptable" contra ingeniería inversa y abuso de API). Ofrece 10 preguntas gratis por sección (Verbal, Numérico, Abstracto, Conocimiento UE, Competencia digital) con explicaciones, sin registro; el resto (1.279 preguntas totales) es de pago (9,99 €/mes o 24,99 € pago único). **Decisión**: aunque no hay prohibición expresa de scraping, la ausencia de prohibición no equivale a una licencia de reutilización — el contenido sigue protegido por copyright por defecto y es su producto comercial principal. Se trata como bajo valor para nuestros fines, no como fuente de preguntas a incorporar. | 🔵 |
| `qualitrainer.eu/en/epso-tests` | 🔵 Revisado: es una página informativa/afiliada que redirige a paquetes de pago de JobTestPrep; no aloja banco propio de preguntas EPSO. Sin contenido original que extraer. | 🔵 |
| `psychometriq.com/epso-reasoning-skills-tests` | 🔵 Revisado: mayoritariamente página de venta; solo 5 preguntas de muestra embebidas (secuencias numéricas, series, antónimos, secuencias de figuras, matrices) y un enlace a Google Drive con un test gratuito genérico. Bajo valor. | 🔵 |
| `orseu-concours.com` | 🔵 Revisado (2026-08-25): su blog "Ressources gratuites de préparation aux tests EPSO" solo enlaza fuentes ya conocidas y oficiales (eu-careers.europa.eu, el demo test oficial de EPSO, quizzes de la UE de learning-corner.learning.europa.eu y europarl.europa.eu, Europass Digital Skills) más un test genérico no específico de EPSO (vskills.in) y vídeos de YouTube. No aporta ningún sitio de terceros nuevo. | 🔵 |
| `postgradsuccess.org` | 🔵 Revisado (2026-08-25): sin ToS visible. El "mini test" y el ejemplo de Written Test con respuesta modelo mencionados no son en realidad de acceso libre — el portal de entrenamiento real se desbloquea con una palabra clave que solo aparece dentro de su libro de pago ("EPSO Unlocked"); lo único gratis de verdad es una guía PDF en griego y descripciones genéricas de las pruebas. Sin contenido extraíble. | 🔵 |
| `eu-testbook.com` | 🔵 Revisado (2026-08-25): sitio de venta del libro "The Ultimate EU Test Book" (John Harper Publishing / András Baneth); no tiene preguntas de muestra propias — remite explícitamente a `eutraining.eu` para practicar, sitio ya revisado y marcado 🔴. Sin contenido propio que aportar. | 🔵 |
| `open-exam-prep.com` | Anuncia "Free EPSO Verbal Reasoning Practice Test 2026: 100 Questions" — intentado revisar (2026-08-25) pero el sitio devolvió HTTP 429 (rate limit) en dos intentos seguidos, incluyendo a una URL de subpágina. No se pudo comprobar ToS ni contenido real. Reintentar más adelante, posiblemente con más espaciado entre peticiones. | 🟡 |

## C. Publishers de tests psicométricos genéricos (SHL / Kenexa / Cubiks-Talogy) — mismo formato que EPSO, pero contenido genérico no específico de la UE

Útiles sobre todo como **inspiración de formato y estilo de distractores**, no como fuente de preguntas EPSO literales — igual que ya hicimos con el rediseño visual de razonamiento abstracto inspirado en (no copiado de) freeepsoquestions.com.

| Sitio | Contenido | Estado |
|---|---|---|
| `graduatesfirst.com` | 🔴 Revisado (2026-08-25): Terms §2.1–2.2 prohíben republicar o reproducir el material del sitio sin permiso previo. Ofrece tests completos "gratis" (numérico, verbal, lógico) pero solo tras registro; sin preguntas Kenexa/Cubiks específicas visibles sin cuenta. | 🔴 |
| `assessmentday.co.uk` | 🔴 Revisado: Terms §2.2/§3.1 prohíben expresamente reproducir/copiar/distribuir contenido del sitio y limitan el uso a licencia personal intransferible. | 🔴 |
| `practiceaptitudetests.com` | 🔴 Revisado: mismo bloque legal que psychometrictests.org/careerroo.com/lawtests.com/fintest.io (propiedad de Picked Group Ltd) — prohíbe expresamente ingeniería inversa, copia, distribución y "cualquier reproducción o redistribución de cualquier Producto". | 🔴 |
| `psychometrictests.org` | 🔴 Revisado: Terms prohíben explícitamente ingeniería inversa, copia, redistribución y "deep-linking"; advierte de "severe civil and criminal penalties" por reproducción no autorizada. | 🔴 |
| `careerroo.com` | 🔴 Revisado: mismo bloque legal verbatim que psychometrictests.org (misma plataforma/red de marcas) — prohibición expresa de copia/redistribución. | 🔴 |
| `lawtests.com` | 🔴 Revisado: mismo bloque legal verbatim que psychometrictests.org, con cláusula adicional que prohíbe cualquier uso comercial o de reventa. | 🔴 |
| `fintest.io` | 🔴 Revisado: mismo bloque legal verbatim que psychometrictests.org (misma red de marcas). | 🔴 |

**Nota (2026-08-25)**: `psychometrictests.org`, `careerroo.com`, `lawtests.com`, `fintest.io` y `practiceaptitudetests.com` comparten el mismo texto legal palabra por palabra — son la misma plataforma/red comercial operando bajo varias marcas (Picked Group Ltd), no sitios independientes. Los 7 sitios de esta categoría quedan cerrados: todos prohíben expresamente la reproducción de su contenido, así que se descartan como fuente de preguntas; solo sirven como referencia de formato ya aprovechada en el rediseño visual de razonamiento abstracto.

## D. Documentación técnica libre para rellenar los huecos señalados en el banco MCQ de Ciencia de Datos

✅ **Integrado (2026-08-25)**: los 5 recursos se verificaron en vivo (los 5 URLs devuelven 200) y se añadieron como enlaces de "Further Reading" en `Docs/4.- Field-Related MCQ - Data Science.md`, bajo nuevas secciones "HPC and Parallel Processing (Topic 4)" y "Advanced Data Integration and APIs (Topic 5)" — cierra el hueco que el propio documento admitía explícitamente. No se usaron para generar preguntas nuevas (solo enlaces, no extracción de contenido).

| Recurso | URL | Para qué tema |
|---|---|---|
| MIT OpenCourseWare — Parallel Computing (18.337J) | https://ocw.mit.edu/courses/18-337j-parallel-computing-fall-2011/ | Topic 4 (HPC) |
| LLNL — Introduction to Parallel Computing Tutorial | https://hpc.llnl.gov/documentation/tutorials/introduction-parallel-computing-tutorial | Topic 4 (HPC) |
| Coursera — Introduction to High Performance and Parallel Computing (U. Colorado Boulder) | https://www.coursera.org/learn/introduction-high-performance-computing | Topic 4 (HPC) |
| Google Cloud API Design Guide | https://docs.cloud.google.com/apis/design | Topic 5 (APIs) |
| Microsoft REST API Guidelines (GitHub) | https://github.com/microsoft/api-guidelines | Topic 5 (APIs) |

## E. Gobernanza / FAIR / GDPR (Topic 8) — para reforzar o verificar el banco ya ampliado

✅ **Integrado (2026-08-25)**: ambos recursos verificados en vivo y añadidos a la sección "Reproducibility, Ethics and Governance" de "Further Reading" en el mismo documento.

| Recurso | URL |
|---|---|
| GO FAIR (sitio oficial de la iniciativa FAIR) | https://www.go-fair.org |
| "The FAIR Guiding Principles..." (Wilkinson et al., *Scientific Data*, Nature) | https://www.nature.com/articles/sdata201618 |

---

## Cómo usar esta lista

1. Antes de tocar cualquier fila de la Categoría B o C: `WebFetch` a su página de Términos de Servicio / Legal Notice, igual que se hizo con `freeepsoquestions.com`. Actualizar la columna Estado.
2. Si el ToS permite reutilización (o el sitio muestra explícitamente preguntas "gratis" sin restricción de scraping — como los propios PDF de EPSO), extraer solo esas preguntas de muestra puntuales, nunca scrapear en bulk salvo que el ToS lo autorice expresamente.
3. Si el ToS prohíbe scraping (lo más probable en la mayoría de la Categoría B, dado que compiten comercialmente con contenido similar a EPSO), tratar el sitio solo como **índice de otras fuentes** que ellos mismos citan (varios blogs de esta lista literalmente enlazan a más recursos gratuitos) o como inspiración de formato, nunca como fuente de contenido literal.
4. Ir marcando esta tabla en sucesivas sesiones — no hace falta agotarla toda de una vez.

**Estado de la cola (2026-08-25)**: Categorías B y C ya están cerradas — los 20 sitios se revisaron y ninguno resultó legítimamente aprovechable como fuente de preguntas (todos 🔴 prohibido o 🔵 bajo valor/sin contenido extraíble), salvo dos fallos técnicos puntuales (`epsotraining.eu`, `open-exam-prep.com`) a reintentar más adelante. Lo único que queda genuinamente pendiente en toda la lista es el ítem 🟡 de la Categoría A (`data.europa.eu/en/academy`), que requiere que una persona se inscriba manualmente en el LMS externo — no es algo que se pueda resolver de forma automatizada. Conclusión práctica: la vía de "adoptar preguntas de terceros" está agotada; el contenido de la plataforma seguirá creciendo por transcripción de fuentes propias (libros) y generación asistida propia, no por incorporación de bancos externos.
