# Guía de Pruebas: Servicio de Integración SOAP (BAM)

Este documento contiene las instrucciones y los **"Payloads"** exactos necesarios para probar el servicio SOAP de interconectividad empresarial (BAM) utilizando herramientas cliente como **Postman** o **SoapUI**.

## Justificación Arquitectónica (Para Sustentación)
> *"El servicio SOAP en la ruta `/api/v1/bam/soap/` fue diseñado como un módulo de **Interoperabilidad B2B**. Mientras que el Dashboard de la aplicación consume APIs REST (JSON) por su ligereza en la web, el servicio SOAP proporciona un contrato estricto (WSDL) que permite a sistemas corporativos de terceros (como un ERP SAP o Microsoft Dynamics) extraer de manera segura métricas financieras e indicadores de rendimiento de la plataforma sin intervenir en el Frontend."*

---

## ⚙️ Configuración del Entorno de Prueba (Postman)

1. **Método HTTP:** `POST`
2. **URL del Servicio:** `http://localhost:8000/api/v1/bam/soap/`
3. **Headers (Cabeceras):**
   - **Key:** `Content-Type` | **Value:** `text/xml; charset=utf-8`
   - **Key:** `X-API-Key` | **Value:** `KONRAD-ERP-SECRET-2026` *(Seguridad B2B)*
4. **Body (Cuerpo):**
   - Seleccionar la opción `raw`
   - Cambiar el formato desplegable de `JSON` a `XML`

A continuación, copia y pega el código XML de la prueba que desees ejecutar en la caja de texto del Body y presiona **Send**.

---

## 🧪 Prueba 1: Ingresos Totales por Suscripciones y Ventas

**Descripción:** Retorna la suma total (en pesos/dólares) de todas las suscripciones pagadas y las ventas de órdenes con estado "PAGADA" en los últimos N días.

**Body (XML):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<soap11env:Envelope xmlns:soap11env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="comercial.konrad.bam.soap">
  <soap11env:Body>
    <tns:get_ingresos_totales>
      <!-- Parámetro: Cantidad de días hacia atrás a consultar (Ej. 30 días) -->
      <tns:dias>30</tns:dias>
    </tns:get_ingresos_totales>
  </soap11env:Body>
</soap11env:Envelope>
```

---

## 🧪 Prueba 2: Tasa de Conversión de Vendedores

**Descripción:** Retorna el porcentaje (%) histórico de solicitudes de vendedores que han sido pasadas exitosamente a estado "APROBADA" frente al total de solicitudes.

**Body (XML):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<soap11env:Envelope xmlns:soap11env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="comercial.konrad.bam.soap">
  <soap11env:Body>
    <tns:get_tasa_conversion_vendedores />
  </soap11env:Body>
</soap11env:Envelope>
```

---

## 🧪 Prueba 3: Producto Estrella (Más Vendido)

**Descripción:** Retorna el nombre en texto del producto que más unidades ha logrado vender (Órdenes Pagadas) en un lapso de tiempo específico.

**Body (XML):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<soap11env:Envelope xmlns:soap11env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="comercial.konrad.bam.soap">
  <soap11env:Body>
    <tns:get_producto_mas_vendido>
       <!-- Parámetro: Periodo de análisis en días -->
      <tns:dias>90</tns:dias>
    </tns:get_producto_mas_vendido>
  </soap11env:Body>
</soap11env:Envelope>
```

---

## 💡 ¿Cómo consultar el WSDL Oficial?
Si el jurado te pregunta dónde está la definición del contrato del servicio, diles que pueden acceder en vivo al WSDL haciendo una petición GET en el navegador web a esta ruta:

**URL WSDL:**
`http://localhost:8000/api/v1/bam/soap/?wsdl`

El navegador les mostrará el archivo XML raíz que cualquier aplicación en el mundo puede leer para entender cómo conectarse a la base de datos de Konrad Commerce.
