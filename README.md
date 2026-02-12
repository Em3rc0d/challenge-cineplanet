# gpets Evolution - Reto Técnico Backend Developer (Cineplanet)

Este proyecto es una solución completa para el reto técnico de Backend Developer en Cineplanet. Consiste en una aplicación web moderna para la gestión de mascotas y dueños, integrando mapas en tiempo real y autenticación robusta.

![Estado](https://img.shields.io/badge/Estado-Completado-success)
![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-2.7.18-green)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

## Descripción del Reto

El objetivo fue evolucionar una aplicación básica hacia un sistema robusto, seguro y escalable, implementando las siguientes características clave:

1.  **Autenticación y Seguridad**: Implementación de Login con Google utilizando Firebase Authentication. Protección de endpoints del backend mediante un filtro de seguridad personalizado (`FirebaseAuthenticationFilter`).
2.  **Base de Datos en Tiempo Real**: Integración con **Firebase Realtime Database** para la persistencia de datos.
3.  **Visualización Geográfica**: Uso de **Google Maps API** para visualizar la ubicación de las mascotas mediante marcadores interactivos.
4.  **Actualizaciones en Tiempo Real**: Implementación de **WebSockets (STOMP)** para reflejar cambios en la ubicación y estado de las mascotas instantáneamente en todos los clientes conectados, sin recargar la página.
5.  **Gestión de Dueños y Mascotas**: Desarrollo de una API RESTful para registrar dueños y mascotas, manteniendo la integridad de los datos.
6.  **Containerización**: Empaquetado de la aplicación con **Docker** para asegurar un despliegue consistente en cualquier entorno.
7.  **Externalización de Secretos**: Uso de variables de entorno (`.env`) para manejar credenciales sensibles de manera segura.

## Tecnologías

*   **Backend**: Java 21, Spring Boot 2.7.18 (Web, WebSocket, Security)
*   **Base de Datos**: Firebase Realtime Database
*   **Autenticación**: Firebase Auth (Google Sign-In)
*   **Frontend**: HTML5, CSS3, JavaScript (Vanilla), Google Maps JS API
*   **Comunicación Real-time**: SockJS, STOMP
*   **Herramientas**: Maven, Docker, Lombok

---

## Guía de Inicio Rápido

### Requisitos Previos

*   **Java 21** instalado.
*   **Docker** (opcional, para despliegue en contenedor).
*   Cuenta de **Google Cloud / Firebase** activa.

### 1. Configuración de Credenciales

Para ejecutar la aplicación, necesitas configurar dos archivos esenciales que **no** se incluyen en el repositorio por seguridad.

#### A. Archivo `.env` (Variables de Entorno)
Crea un archivo llamado `.env` en la raíz del proyecto (`challenge/`) con el siguiente contenido, reemplazando los valores con los de tu proyecto de Firebase/Google Cloud:

```env
# Google Maps
GOOGLE_MAPS_API_KEY=AIzaSyBr... (Tu API Key de Google Maps)

# Firebase Configuration (Obtenlo de la consola de Firebase > Project Settings)
FIREBASE_API_KEY=AIzaSyBr...
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_DATABASE_URL=https://tu-proyecto-default-rtdb.firebaseio.com/
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef
FIREBASE_MEASUREMENT_ID=G-XYZ123

# Backend Service Account (Apunta al archivo JSON del paso B)
FIREBASE_CONFIG_PATH=classpath:sAccount.json
```

#### B. `sAccount.json` (Service Account de Firebase)
1.  Ve a la Consola de Firebase > Configuración del proyecto > Cuentas de servicio.
2.  Genera una nueva clave privada.
3.  Descarga el archivo JSON.
4.  Renómbralo a `sAccount.json`.
5.  Colócalo en la carpeta: `src/main/resources/`.

---

### 2. Ejecutar la Aplicación

#### Opción A: Con Docker (Recomendado)

Esta opción empaqueta todo en un contenedor aislado.

1.  **Construir la imagen:**
    ```bash
    docker build -t gpets .
    ```

2.  **Correr el contenedor:**
    (El flag `--env-file .env` inyecta tus secretos al contenedor)
    ```bash
    docker run -p 8080:8080 --env-file .env gpets
    ```

#### Opción B: Localmente con Maven

1.  Asegúrate de que el archivo `.env` esté en la raíz.
2.  Ejecuta:
    ```bash
    ./mvnw clean spring-boot:run
    ```

---

### 3. Acceder a la Aplicación

1.  Abre tu navegador en: [http://localhost:8080](http://localhost:8080)
2.  **Login**: Haz clic en "Login with Google".
3.  **Mapa**: Verás tu ubicación (o Lima por defecto). Haz clic en el mapa para seleccionar una ubicación.
4.  **Registrar Dueño**: Llena el formulario en la barra lateral (se vincula a tu usuario de Google).
5.  **Registrar Mascota**: Ingresa los datos y "Add Pet". ¡Verás aparecer el marcador en tiempo real!

> **Nota**: Si intentas acceder desde otra IP (ej. celular), asegúrate de agregar esa IP a los "Orígenes de JavaScript autorizados" en tu consola de Google Cloud (APIs & Services > Credentials).

---

## Documentación de API

La aplicación expone los siguientes endpoints REST:

### Configuración
*   `GET /api/config`: Devuelve las claves públicas (Maps API Key, Firebase Config) necesarias para inicializar el frontend. **Público**.

### Mascotas (`/api/pets`)
*   `GET /api/pets`: Obtiene todas las mascotas registradas. **Requiere Auth**.
*   `POST /api/pets`: Registra una nueva mascota. **Requiere Auth**.
*   `GET /api/pets/{id}`: Obtiene detalle de una mascota. **Requiere Auth**.

### Dueños (`/api/owners`)
*   `POST /api/owners`: Registra/Actualiza un dueño. **Requiere Auth**.
*   `GET /api/owners/{id}`: Obtiene información del dueño. **Requiere Auth**.

### WebSockets
*   **Endpoint**: `/ws-gpets`
*   **Topic**: `/topic/pets` (Suscripción para recibir actualizaciones de nuevas mascotas o cambios).

---

## Estructura del Proyecto

*   `src/main/java/.../config`: Configuraciones de Firebase, WebSocket y Seguridad.
*   `src/main/java/.../controller`: Controladores REST para Config, Mascotas y Dueños.
*   `src/main/java/.../model`: Modelos de datos (Pet, Owner, Location).
*   `src/main/java/.../service`: Lógica de negocio y comunicación con Firebase.
*   `src/main/resources/static`: Frontend (HTML, CSS, JS).
