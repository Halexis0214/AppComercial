"use client";

import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { 
  Building2, MapPin, FileSpreadsheet, FileText, 
  ExternalLink, Upload, Plus, Trash2, Download, Eye, 
  Smartphone, Printer, CheckCircle2, Phone, Calendar, ArrowRight
} from "lucide-react";

const LISTA_CIUDADES_COL = [
  "Medellin", "Bogotá", "Tunja", "Pereira", "Armenia", 
  "Manizales", "Cartago", "Cali", "Barranquilla", "Santa Marta", 
  "Cartagena", "Bucaramanga", "Cúcuta", "Villavicencio"
];

const CIUDADES_PAISES: Record<string, string[]> = {
  COP: LISTA_CIUDADES_COL,
  USD: ["Ciudad de Panamá", "San Miguelito", "David", "Colón", "Costa del Este"],
  MXN: ["Ciudad de México", "Guadalajara", "Monterrey", "Puebla", "Querétaro"]
};

// Función auxiliar para formatear nombres de ciudades tal como están arriba (ej: BUCARAMANGA -> Bucaramanga)
const normalizarCiudad = (texto: string) => {
  const match = LISTA_CIUDADES_COL.find(c => c.toLowerCase() === texto.trim().toLowerCase());
  if (match) return match;
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

export default function ImpactarcoPortal() {
  const [modoCliente, setModoCliente] = useState<boolean>(false);
  const [tab, setTab] = useState<"subir" | "mapa" | "cotizacion" | "autorizacion">("cotizacion");

  // Multi-moneda
  const [pais, setPais] = useState<"COP" | "USD" | "MXN">("COP");
  const simboloMoneda = pais === "COP" ? "$" : pais === "USD" ? "US$" : "MX$";

  // Datos Generales de la Propuesta
  const [clienteNombre, setClienteNombre] = useState<string>("");
  const [fechaPauta, setFechaPauta] = useState<string>("");
  const [nombreComercial, setNombreComercial] = useState<string>("Yona Ramirez");
  const [celularComercial, setCelularComercial] = useState<string>("311 500 0000");

  // Estado del Mapa y Edificios
  const [edificios, setEdificios] = useState<any[]>([]);
  const [ciudadFiltro, setCiudadFiltro] = useState<string>("TODAS");
  const [edificioSeleccionado, setEdificioSeleccionado] = useState<any>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 1. ITEMS DE COTIZACIÓN
  const [itemsCotizacion, setItemsCotizacion] = useState<any[]>([
    { id: 1, servicio: "PUBLICIDAD EN ASCENSORES", ciudad: "Medellin", cantidad: 10, vrUnitario: 350000, descuento: 0 },
    { id: 2, servicio: "PUBLICIDAD EN ASCENSORES", ciudad: "Bucaramanga", cantidad: 97, vrUnitario: 350000, descuento: 0 }
  ]);

  // 2. DATOS DE AUTORIZACIÓN DE PAUTA
  const [autorizacion, setAutorizacion] = useState({
    fechaElaboracion: "16/6/2026",
    fechaAutorizacion: "",
    tipoServicio: "Pauta en ascensores",
    diasPauta: "15 dias",
    quincenaAsignada: "2Q" as "1Q" | "2Q" | "AMBAS",
    ciudadesDistribucion: LISTA_CIUDADES_COL.map(c => ({
      nombre: c,
      q1: 0,
      q2: c === "Medellin" ? 10 : c === "Bucaramanga" ? 97 : 0,
      obs: c === "Medellin" || c === "Bucaramanga" ? "Artes validados en el drive" : ""
    })),
    insertos: [
      { servicio: "Dist Insertos", cantidad: 0, observacion: "En la hoja de espacios está el listado de entrega de los insertos" }
    ],
    // Artes hereda automáticamente las ciudades seleccionadas, sin mayúsculas sostenidas
    artes: [
      { ciudad: "Medellin", arte: "", q1: 0, q2: 0, formato: "Marco Acrílico", obs: "Arte en el drive", esNueva: false },
      { ciudad: "Bucaramanga", arte: "", q1: 0, q2: 0, formato: "Marco Acrílico", obs: "Arte en el drive", esNueva: false }
    ],
    observacionesGenerales: "Enviar fotos en alta al instalar por favor.",
    autorizadoPor: "Dirección Comercial / Gerencia"
  });

  // GENERACIÓN AUTOMÁTICA DE DISTRIBUCIÓN Y ARTES
  const generarAutorizacionAutomatica = () => {
    const itemsAscensores = itemsCotizacion.filter(it => 
      it.servicio.toUpperCase().includes("ASCENSOR") || it.servicio.toUpperCase().includes("PAUTA")
    );

    // Ciudades seleccionadas con cantidades
    const ciudadesConPauta: string[] = [];

    const nuevasCiudades = LISTA_CIUDADES_COL.map(ciudadNom => {
      const match = itemsAscensores.find(a => a.ciudad.trim().toLowerCase() === ciudadNom.trim().toLowerCase());
      const cant = match ? Number(match.cantidad) : 0;
      if (cant > 0) ciudadesConPauta.push(ciudadNom);

      return {
        nombre: ciudadNom,
        q1: autorizacion.quincenaAsignada === "1Q" || autorizacion.quincenaAsignada === "AMBAS" ? cant : 0,
        q2: autorizacion.quincenaAsignada === "2Q" || autorizacion.quincenaAsignada === "AMBAS" ? cant : 0,
        obs: cant > 0 ? "Artes validados en el drive" : ""
      };
    });

    // Sincronizar artes con las mismas ciudades escogidas arriba
    const nuevosArtes = ciudadesConPauta.map(ciu => {
      const arteExistente = autorizacion.artes.find(a => a.ciudad.toLowerCase() === ciu.toLowerCase());
      return {
        ciudad: ciu,
        arte: arteExistente ? arteExistente.arte : "",
        q1: arteExistente ? arteExistente.q1 : 0,
        q2: arteExistente ? arteExistente.q2 : 0,
        formato: arteExistente ? arteExistente.formato : "Marco Acrílico",
        obs: arteExistente ? arteExistente.obs : "Arte en el drive",
        esNueva: false
      };
    });

    // Mantener las filas extra que el comercial haya agregado manualmente con "+ Agregar Arte / Fila"
    const artesManuales = autorizacion.artes.filter(a => a.esNueva);

    setAutorizacion(prev => ({
      ...prev,
      ciudadesDistribucion: nuevasCiudades,
      artes: nuevosArtes.length > 0 ? [...nuevosArtes, ...artesManuales] : prev.artes
    }));

    setTab("autorizacion");
    alert("¡Distribución y Artes sincronizados con las ciudades de la cotización!");
  };

  // Totales independientes
  const totalAscensoresQ1 = autorizacion.ciudadesDistribucion.reduce((acc, c) => acc + Number(c.q1 || 0), 0);
  const totalAscensoresQ2 = autorizacion.ciudadesDistribucion.reduce((acc, c) => acc + Number(c.q2 || 0), 0);
  const granTotalAscensores = totalAscensoresQ1 + totalAscensoresQ2;

  const totalArtesQ1 = autorizacion.artes.reduce((acc, a) => acc + Number(a.q1 || 0), 0);
  const totalArtesQ2 = autorizacion.artes.reduce((acc, a) => acc + Number(a.q2 || 0), 0);

  // RENDERIZADO DEL MAPA
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let L: any;
    import("leaflet").then((leafletModule) => {
      L = leafletModule.default || leafletModule;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([7.125, -73.116], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);
        mapInstanceRef.current = map;
      }

      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 200);

      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      const colorEstrato: Record<number, string> = {
        0: "#64748b", 3: "#10b981", 4: "#0ea5e9", 5: "#8b5cf6", 6: "#f59e0b"
      };

      const validos = edificios.filter(e => e.lat && e.lng && !isNaN(e.lat) && !isNaN(e.lng));
      validos.forEach((item) => {
        const color = colorEstrato[item.estrato] || "#0ea5e9";
        const customIcon = L.divIcon({
          className: "custom-pin",
          html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 8px ${color}; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 11px;">E${item.estrato || 'P'}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(mapInstanceRef.current);
        marker.on("click", () => setEdificioSeleccionado(item));
        markersRef.current.push(marker);
      });

      if (validos.length > 0 && mapInstanceRef.current) {
        const bounds = L.latLngBounds(validos.map(e => [e.lat, e.lng]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    });
  }, [edificios, tab]);

  // CARGA DE EXCEL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) return alert("El archivo está vacío.");

        const conteoPorCiudad: Record<string, number> = {};
        const parseados = data.map((row, idx) => {
          const rawLat = String(row["Latitud"] ?? "").replace(/['"]/g, "").trim().replace(",", ".");
          const rawLng = String(row["Longitud"] ?? "").replace(/['"]/g, "").trim().replace(",", ".");
          const ciudad = normalizarCiudad(String(row["Ciudad"] || "Bucaramanga"));
          const carteleras = parseInt(row["carteleras"] || 1) || 1;

          conteoPorCiudad[ciudad] = (conteoPorCiudad[ciudad] || 0) + carteleras;

          return {
            id: idx + 1,
            ciudad,
            edificio: String(row["Nombre"] || `Punto ${idx + 1}`).trim(),
            direccion: String(row["Dirección"] || "").trim(),
            barrio: String(row["Barrio"] || "").trim(),
            sector: String(row["Sector"] || "").trim(),
            comuna: String(row["Comuna (Localidad)"] || "").trim(),
            espacios: carteleras,
            estrato: parseInt(row["Estrato"] || 0) || 0,
            aptos: parseInt(row["Aptos"] || 0) || 0,
            lat: parseFloat(rawLat) || 7.125,
            lng: parseFloat(rawLng) || -73.116,
            foto: String(row["fachada"] || "").trim()
          };
        });

        const nuevosItemsCotizacion = Object.keys(conteoPorCiudad).map((c, i) => ({
          id: Date.now() + i,
          servicio: "PUBLICIDAD EN ASCENSORES",
          ciudad: c,
          cantidad: conteoPorCiudad[c],
          vrUnitario: pais === "COP" ? 350000 : pais === "USD" ? 95 : 1900,
          descuento: 0
        }));

        setEdificios(parseados);
        setItemsCotizacion(nuevosItemsCotizacion);
        setTab("cotizacion");
        alert(`¡Cargados ${parseados.length} edificios con éxito! Se sincronizaron las cantidades en la cotización.`);
      } catch (err) {
        alert("Error al procesar el archivo Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // EXPORTAR EXCEL CLIENTE (A-I)
  const descargarExcelCliente = () => {
    const headers = ["Ciudad", "Nombre", "Dirección", "Barrio", "Sector", "Comuna (Localidad)", "carteleras", "Estrato", "Aptos"];
    const rows = edificios.map(e => [e.ciudad, e.edificio, e.direccion, e.barrio, e.sector, e.comuna, e.espacios, e.estrato, e.aptos]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch: 14 }, { wch: 25 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet");
    XLSX.writeFile(wb, `Listado_Edificios_${(clienteNombre || "Cliente").replace(/\s+/g, "_")}.xlsx`);
  };

  // IMPRIMIR PDF COTIZACIÓN EN TAMAÑO CARTA HORIZONTAL
  const imprimirCotizacionPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const filasHTML = itemsCotizacion.map((it, idx) => {
      const despuesDesc = it.vrUnitario * (1 - it.descuento / 100);
      const subt = it.cantidad * despuesDesc;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="text-align: center; padding: 12px 10px; font-weight: 700; color: #64748b; font-size: 13px;">${idx + 1}</td>
          <td style="padding: 12px 10px; font-weight: 800; color: #0f172a; font-size: 13.5px;">${it.servicio}</td>
          <td style="text-align: center; padding: 12px 10px; font-weight: 700; color: #1e293b; font-size: 13px;">${it.ciudad}</td>
          <td style="text-align: right; padding: 12px 12px; font-weight: 800; color: #0f172a; font-size: 14px;">${Number(it.cantidad).toLocaleString("es-CO")}</td>
          <td style="text-align: right; padding: 12px 12px; font-weight: 600; color: #334155; font-size: 13.5px;">$ ${Number(it.vrUnitario).toLocaleString("es-CO")}</td>
          <td style="text-align: center; padding: 12px 10px; font-weight: 800; color: #d97706; font-size: 13.5px;">${it.descuento}%</td>
          <td style="text-align: right; padding: 12px 12px; font-weight: 700; color: #475569; font-size: 13.5px;">$ ${Math.round(despuesDesc).toLocaleString("es-CO")}</td>
          <td style="text-align: right; padding: 12px 14px; font-weight: 900; color: #0f172a; font-size: 14px; background: #fffbeb;">$ ${Math.round(subt).toLocaleString("es-CO")}</td>
        </tr>
      `;
    }).join("");

    const granTotalSinIva = itemsCotizacion.reduce((acc, it) => acc + (it.cantidad * it.vrUnitario * (1 - it.descuento/100)), 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cotización Oficial - IMPACTARCO</title>
        <style>
          @page { size: letter landscape; margin: 10mm 12mm; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            margin: 0 auto; 
            color: #1e293b; 
            max-width: 1040px; 
            background: #ffffff;
            line-height: 1.4;
          }
          .doc-card { padding: 10px 0; }
          .header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #f59e0b; padding-bottom: 12px; margin-bottom: 12px; }
          .banner-subtitle { background: #0c1e38; color: #ffffff; text-align: center; font-size: 13px; font-weight: 800; letter-spacing: 1px; padding: 9px; border-radius: 6px; margin-bottom: 14px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
          .meta-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
          .meta-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 800; color: #d97706; margin-bottom: 4px; }
          .meta-val { font-size: 15px; font-weight: 900; color: #0f172a; }
          .meta-desc { font-size: 12px; color: #475569; margin-top: 4px; }
          table.data-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-top: 6px; }
          table.data-table th { background: #0c1e38; color: #ffffff; padding: 11px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 800; text-align: left; }
          .total-box { margin-top: 14px; margin-left: auto; width: 380px; background: #fffbeb; border: 2px solid #fcd34d; border-radius: 8px; padding: 12px 18px; }
          .total-row { display: flex; justify-content: space-between; align-items: center; color: #78350f; }
          .total-val { font-size: 20px; font-weight: 900; color: #b45309; }
          .notice-card { background: #f0fdf4; border: 1.5px solid #86efac; border-left: 5px solid #10b981; border-radius: 6px; padding: 10px 14px; margin-top: 14px; color: #166534; font-size: 12px; font-weight: 700; }
          .terms-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; margin-top: 12px; font-size: 11px; color: #475569; }
          .terms-card ol { margin: 4px 0 0 16px; padding: 0; }
          .terms-card li { margin-bottom: 2px; }
          .footer-brand { margin-top: 18px; padding-top: 10px; border-top: 1.5px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="doc-card">
          <div class="header-box">
            <div>
              <img src="/logo2.png" alt="IMPACTARCO" style="max-height: 48px; width: auto; object-contain;" />
              <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 4px;">PUBLICIDAD EN ASCENSORES • NIT 901042202-1</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 20px; font-weight: 900; color: #0c1e38; letter-spacing: -0.5px;">COTIZACIÓN COMERCIAL</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 3px; font-weight: 600;">Emisión: ${new Date().toLocaleDateString("es-CO")} • Cobertura Nacional</div>
            </div>
          </div>

          <div class="banner-subtitle">
            SOMOS TU ALIADO PERFECTO PARA PUBLICIDAD EN ASCENSORES
          </div>

          <div class="meta-grid">
            <div class="meta-card">
              <div class="meta-title">Cliente / Razón Social</div>
              <div class="meta-val">${clienteNombre || "(Pendiente por definir)"}</div>
              <div class="meta-desc"><strong>Fecha de la pauta:</strong> ${fechaPauta || "A convenir con el cliente"}</div>
            </div>
            <div class="meta-card">
              <div class="meta-title">Asesor Comercial Encargado</div>
              <div class="meta-val">${nombreComercial}</div>
              <div class="meta-desc"><strong>Celular:</strong> ${celularComercial} • <strong>Email:</strong> comercial@impactarco.com</div>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Descripción del Servicio</th>
                <th style="text-align: center;">Ciudad</th>
                <th style="text-align: right;">Cantidad</th>
                <th style="text-align: right;">Vr Unitario</th>
                <th style="text-align: center;">Desc.</th>
                <th style="text-align: right;">Despues %</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${filasHTML}
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row">
              <span style="font-weight: 800; text-transform: uppercase; font-size: 12px;">Total Cotizado:</span>
              <span class="total-val">$ ${granTotalSinIva.toLocaleString("es-CO")} ${pais}</span>
            </div>
            <div style="font-size: 10px; color: #92400e; margin-top: 3px; text-align: right;">* Los valores no incluyen IVA (19%)</div>
          </div>

          <div class="notice-card">
            📍 Enviar el material a entregar a nuestros puntos de recepción en cada ciudad. El comercial le hará llegar las direcciones actualizadas de los puntos autorizados.
          </div>

          <div class="terms-card">
            <strong style="color: #0c1e38; text-transform: uppercase; font-size: 10.5px;">Términos y Condiciones Comerciales:</strong>
            <ol>
              <li>Los valores expresados no incluyen IVA (19%).</li>
              <li>El material debe ser entregado por el cliente en las instalaciones asignadas por Impactar.</li>
              <li>El cliente debe realizar la entrega de las muestras en las bodegas designadas con al menos 4 días de anticipación.</li>
            </ol>
          </div>

          <div class="footer-brand">
            <div>EL MOMENTO PERFECTO PARA CONTAR UNA HISTORIA QUE TODOS VAN A LEER</div>
            <div>IMPACTARCO • www.impactarco.com</div>
          </div>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // IMPRIMIR PDF AUTORIZACIÓN EN TAMAÑO CARTA HORIZONTAL
  const imprimirAutorizacionPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const ciudadesConDatos = autorizacion.ciudadesDistribucion.filter(c => c.q1 > 0 || c.q2 > 0);
    const listaMostrar = ciudadesConDatos.length > 0 ? ciudadesConDatos : autorizacion.ciudadesDistribucion.slice(0, 5);

    const filasDistribucion = listaMostrar.map(c => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 9px 12px; font-weight: 800; color: #0f172a; font-size: 12.5px;">${c.nombre}</td>
        <td style="padding: 9px 12px; text-align: center; color: #475569; font-weight: 700; font-size: 13px;">${c.q1 > 0 ? c.q1 : "-"}</td>
        <td style="padding: 9px 12px; text-align: center; font-weight: 900; color: #0284c7; background: #f0f9ff; font-size: 13.5px;">${c.q2 > 0 ? c.q2 : "-"}</td>
        <td style="padding: 9px 12px; font-size: 11px; color: #64748b; font-weight: 600;">${c.obs || "Material validado en Drive"}</td>
      </tr>
    `).join("");

    const filasInsertos = autorizacion.insertos.map(ins => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 9px 12px; font-weight: 800; color: #0f172a; font-size: 12.5px;">${ins.servicio}</td>
        <td style="padding: 9px 12px; text-align: center; font-weight: 900; color: #0f172a; font-size: 13px;">${Number(ins.cantidad).toLocaleString("es-CO")}</td>
        <td style="padding: 9px 12px; font-size: 11px; color: #64748b;">${ins.observacion}</td>
      </tr>
    `).join("");

    const filasArtes = autorizacion.artes.map(art => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 9px 12px; font-weight: 800; color: #0f172a;">${art.ciudad}</td>
        <td style="padding: 9px 12px; font-weight: 700; color: #334155;">${art.arte || "-"}</td>
        <td style="padding: 9px 12px; text-align: center; color: #475569;">${art.q1 > 0 ? art.q1 : "-"}</td>
        <td style="padding: 9px 12px; text-align: center; font-weight: 900; color: #0284c7; font-size: 13px;">${art.q2 > 0 ? art.q2 : "-"}</td>
        <td style="padding: 9px 12px; color: #475569;">${art.formato}</td>
        <td style="padding: 9px 12px; font-size: 11px; color: #64748b;">${art.obs}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Autorización de Pauta - IMPACTARCO</title>
        <style>
          @page { size: letter landscape; margin: 10mm 12mm; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            margin: 0 auto; 
            color: #1e293b; 
            max-width: 1040px; 
            background: #ffffff;
            line-height: 1.4;
          }
          .header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 12px; }
          .banner-subtitle { background: #0c1e38; color: #ffffff; text-align: center; font-size: 13px; font-weight: 800; letter-spacing: 1px; padding: 8px; border-radius: 6px; margin-bottom: 12px; }
          .grid-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
          .meta-pill { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
          .meta-pill-lbl { font-size: 10px; text-transform: uppercase; font-weight: 800; color: #0284c7; }
          .meta-pill-val { font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 3px; }
          .section-bar { background: linear-gradient(90deg, #0c1e38, #1e3a8a); color: #ffffff; font-weight: 800; font-size: 11.5px; padding: 8px 12px; border-radius: 6px 6px 0 0; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          table.data-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1.5px solid #cbd5e1; border-top: none; border-radius: 0 0 6px 6px; overflow: hidden; margin-bottom: 10px; }
          table.data-table th { background: #f1f5f9; color: #334155; padding: 9px 12px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800; text-align: left; border-bottom: 1.5px solid #cbd5e1; }
          .box-obs { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 0 0 6px 6px; padding: 10px 14px; font-size: 12px; color: #334155; font-weight: 600; }
          .signatures-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 28px; padding-top: 12px; }
          .sig-card { border-top: 2px solid #64748b; padding-top: 8px; text-align: center; }
          .sig-role { font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
          .sig-desc { font-size: 10px; color: #64748b; margin-top: 2px; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <img src="/logo2.png" alt="IMPACTARCO" style="max-height: 44px; width: auto; object-contain;" />
            <div style="font-size: 10.5px; color: #64748b; font-weight: 700; margin-top: 3px;">CIRCUITOS DE PUBLICIDAD EN ASCENSORES • NIT 901042202-1</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: 900; color: #0c1e38; letter-spacing: -0.5px;">AUTORIZACIÓN DE PAUTA / SERVICIOS</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px; font-weight: 600;">Fecha de Elaboración: <strong>${autorizacion.fechaElaboracion}</strong></div>
          </div>
        </div>

        <div class="banner-subtitle">
          ORDEN OFICIAL DE PRODUCCIÓN, LOGÍSTICA Y MONTAJE
        </div>

        <div class="grid-meta">
          <div class="meta-pill">
            <div class="meta-pill-lbl">Cliente</div>
            <div class="meta-pill-val" style="color: #0284c7;">${clienteNombre || "(Pendiente)"}</div>
          </div>
          <div class="meta-pill">
            <div class="meta-pill-lbl">Comercial Encargado</div>
            <div class="meta-pill-val">${nombreComercial} (${celularComercial})</div>
          </div>
          <div class="meta-pill">
            <div class="meta-pill-lbl">Tipo de Servicio</div>
            <div class="meta-pill-val">${autorizacion.tipoServicio}</div>
          </div>
          <div class="meta-pill">
            <div class="meta-pill-lbl">Fecha de la Pauta</div>
            <div class="meta-pill-val" style="color: #d97706;">${fechaPauta || "(Sin especificar)"}</div>
          </div>
          <div class="meta-pill">
            <div class="meta-pill-lbl">Total Unidades Autorizadas</div>
            <div class="meta-pill-val" style="color: #0f172a;">${granTotalAscensores} Espacios</div>
          </div>
          <div class="meta-pill">
            <div class="meta-pill-lbl">Días de Pauta</div>
            <div class="meta-pill-val">${autorizacion.diasPauta}</div>
          </div>
        </div>

        <!-- DISTRIBUCIÓN POR CIUDAD -->
        <div class="section-bar">Distribución por ciudad según tipo de servicio</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35%;">Ciudad</th>
              <th style="width: 15%; text-align: center;">Cantidad (1Q)</th>
              <th style="width: 15%; text-align: center;">Cantidad (2Q)</th>
              <th style="width: 35%;">Observación (opcional)</th>
            </tr>
          </thead>
          <tbody>
            ${filasDistribucion}
            <tr style="background: #f8fafc; font-weight: 900; border-top: 2px solid #94a3b8;">
              <td style="padding: 10px 12px; text-align: right; color: #0f172a; font-size: 12px;">TOTAL ASCENSORES:</td>
              <td style="padding: 10px 12px; text-align: center; color: #0f172a; font-size: 13px;">${totalAscensoresQ1}</td>
              <td style="padding: 10px 12px; text-align: center; color: #0284c7; font-size: 14px;">${totalAscensoresQ2}</td>
              <td style="padding: 10px 12px;"></td>
            </tr>
          </tbody>
        </table>

        <!-- INSERTOS -->
        <div class="section-bar">INSERTOS / MATERIAL POP</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35%;">Servicio</th>
              <th style="width: 15%; text-align: center;">Cantidad</th>
              <th style="width: 50%;">Observación de Entrega</th>
            </tr>
          </thead>
          <tbody>
            ${filasInsertos}
          </tbody>
        </table>

        <!-- ARTES PARA PRODUCCIÓN (HEREDA CIUDADES EXACTAS Y FORMATO NORMAL) -->
        <div class="section-bar">Artes para producción / instalación</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Ciudad</th>
              <th>Arte / Referencia</th>
              <th style="text-align: center;">1Q</th>
              <th style="text-align: center;">2Q</th>
              <th>Formato</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${filasArtes}
            <tr style="background: #f8fafc; font-weight: 900; border-top: 2px solid #94a3b8;">
              <td colspan="2" style="padding: 9px 12px; text-align: right; color: #0f172a;">TOTAL ARTES:</td>
              <td style="padding: 9px 12px; text-align: center; color: #0f172a; font-size: 13px;">${totalArtesQ1}</td>
              <td style="padding: 9px 12px; text-align: center; color: #0284c7; font-size: 13px;">${totalArtesQ2}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>

        <!-- OBSERVACIONES -->
        <div class="section-bar">Observaciones (instalación / entregas / restricciones / accesos)</div>
        <div class="box-obs">
          ${autorizacion.observacionesGenerales}
        </div>

        <!-- FIRMAS INTERNAS EXCLUSIVAS DE IMPACTARCO -->
        <div class="signatures-grid">
          <div class="sig-card">
            <div class="sig-role">DIRECTOR COMERCIAL</div>
            <div class="sig-desc">Validación de Negociación y Fechas</div>
          </div>
          <div class="sig-card">
            <div class="sig-role">DIRECTOR LOGÍSTICO / OPS</div>
            <div class="sig-desc">Disponibilidad de Red y Montaje</div>
          </div>
          <div class="sig-card">
            <div class="sig-role">GERENCIA GENERAL</div>
            <div class="sig-desc">Autorización Final de Servicio</div>
          </div>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* HEADER PRINCIPAL */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 px-4 py-2.5 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="IMPACTARCO" 
              className="h-8 w-auto object-contain"
            />
            <div className="hidden sm:block border-l border-slate-700 pl-3">
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Publicidad en Ascensores</p>
              <p className="text-xs text-slate-400">NIT 901042202-1 • Cobertura Nacional</p>
            </div>
            
            {/* Campo Cliente en Blanco */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 ml-2">
              <span className="text-xs text-slate-400">Cliente:</span>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Escribir nombre del cliente..."
                className="bg-transparent text-amber-400 font-bold text-xs outline-none w-48 focus:border-b border-amber-400 placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Selector de Países */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => setPais("COP")}
                className={`px-2 py-0.5 rounded font-bold transition ${pais === "COP" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}
              >
                🇨🇴 COL
              </button>
              <button
                onClick={() => setPais("USD")}
                className={`px-2 py-0.5 rounded font-bold transition ${pais === "USD" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}
              >
                🇵🇦 PAN
              </button>
              <button
                onClick={() => setPais("MXN")}
                className={`px-2 py-0.5 rounded font-bold transition ${pais === "MXN" ? "bg-amber-500 text-slate-950" : "text-slate-400"}`}
              >
                🇲🇽 MEX
              </button>
            </div>

            <button
              onClick={() => setModoCliente(!modoCliente)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                modoCliente ? "bg-amber-500 text-slate-950 shadow font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {modoCliente ? <Eye className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
              {modoCliente ? "VISTA CLIENTE ACTIVA" : "Probar Vista Cliente"}
            </button>
          </div>
        </div>
      </header>

      {/* TABS DE NAVEGACIÓN */}
      <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <button
              onClick={() => setTab("subir")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                tab === "subir" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> 1. Subir Excel ({edificios.length})
            </button>
            <button
              onClick={() => setTab("mapa")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                tab === "mapa" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" /> 2. Mapeo ({edificios.length})
            </button>
            <button
              onClick={() => setTab("cotizacion")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                tab === "cotizacion" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> 3. Cotización Oficial
            </button>
            <button
              onClick={() => setTab("autorizacion")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                tab === "autorizacion" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> 4. Autorización Pauta (Oficial)
            </button>
          </div>

          {modoCliente && (
            <button
              onClick={descargarExcelCliente}
              className="bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Descargar Excel Edificios
            </button>
          )}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col gap-4">

        {/* TAB 1: SUBIR EXCEL */}
        {tab === "subir" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-400" /> Cargar Listado de Edificios o Disponibilidad
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Sube el archivo Excel (ej: <b>CLIENTE OXXO.xlsx</b>). Al cargarlo, creará las filas de cotización por ciudad automáticamente.
            </p>

            <div className="border-2 border-dashed border-slate-700 hover:border-amber-400 transition rounded-xl p-8 text-center bg-slate-950/50">
              <FileSpreadsheet className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <label className="cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition inline-block">
                Seleccionar Archivo Excel
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
              </label>
              <p className="text-xs text-slate-500 mt-2">o arrastra tu archivo aquí</p>
            </div>
          </div>
        )}

        {/* TAB 2: MAPA INTERACTIVO */}
        {tab === "mapa" && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
              <div className="lg:col-span-3 rounded-xl overflow-hidden border border-slate-800 shadow relative h-full">
                <div ref={mapContainerRef} className="w-full h-full min-h-[600px]" />
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-between overflow-y-auto h-full">
                {edificioSeleccionado ? (
                  <div className="space-y-3">
                    <img src={edificioSeleccionado.foto || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop"} className="w-full h-36 object-cover rounded-lg" />
                    <h3 className="font-bold text-white text-base">{edificioSeleccionado.edificio}</h3>
                    <p className="text-xs text-amber-400">{edificioSeleccionado.direccion}</p>
                    <p className="text-xs text-slate-400">{edificioSeleccionado.barrio} • {edificioSeleccionado.ciudad}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <span className="text-slate-400 block">Espacios</span>
                        <span className="font-bold text-white">{edificioSeleccionado.espacios}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <span className="text-slate-400 block">Estrato</span>
                        <span className="font-bold text-white">E{edificioSeleccionado.estrato}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center my-auto py-12 text-slate-500 text-xs">
                    Toca un punto en el mapa para ver la ficha del edificio.
                  </div>
                )}
                <button
                  onClick={descargarExcelCliente}
                  className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition mt-3"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar {edificios.length} Edificios (Excel)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COTIZACIÓN OFICIAL */}
        {tab === "cotizacion" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" /> Formato de Cotización Oficial
                </h2>
                <p className="text-xs text-slate-400">Impresión optimizada en tamaño carta horizontal (landscape).</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const lista = CIUDADES_PAISES[pais] || CIUDADES_PAISES.COP;
                    setItemsCotizacion([
                      ...itemsCotizacion,
                      { id: Date.now(), servicio: "PUBLICIDAD EN ASCENSORES", ciudad: lista[0], cantidad: 10, vrUnitario: 350000, descuento: 0 }
                    ]);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" /> Agregar Fila
                </button>

                <button
                  onClick={generarAutorizacionAutomatica}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow transition"
                >
                  ⚡ Generar Distribución y Artes en Autorización <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={imprimirCotizacionPDF}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Descargar Cotización en PDF (Carta Horizontal)
                </button>
              </div>
            </div>

            {/* Metadatos superiores de la cotización */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Cliente:</label>
                <input 
                  type="text" 
                  value={clienteNombre} 
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Escribir nombre del cliente..."
                  className="w-full bg-slate-900 border border-slate-700 text-amber-400 font-bold p-1.5 rounded outline-none placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Fecha de la Pauta:</label>
                <input 
                  type="text" 
                  value={fechaPauta} 
                  onChange={(e) => setFechaPauta(e.target.value)}
                  placeholder="Ej: 16 al 30 de Noviembre"
                  className="w-full bg-slate-900 border border-slate-700 text-white font-semibold p-1.5 rounded outline-none placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Asesor Comercial:</label>
                <input 
                  type="text" 
                  value={nombreComercial} 
                  onChange={(e) => setNombreComercial(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-1.5 rounded outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Celular Asesor:</label>
                <input 
                  type="text" 
                  value={celularComercial} 
                  onChange={(e) => setCelularComercial(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-1.5 rounded outline-none"
                />
              </div>
            </div>

            {/* Selector de Quincena a la que va destinada en la Autorización */}
            <div className="flex items-center gap-3 bg-indigo-950/40 p-3 rounded-lg border border-indigo-900/50 text-xs">
              <span className="text-indigo-300 font-bold">Columna a impactar en la Distribución de la Autorización:</span>
              <select
                value={autorizacion.quincenaAsignada}
                onChange={(e: any) => setAutorizacion({ ...autorizacion, quincenaAsignada: e.target.value })}
                className="bg-indigo-900 text-white px-2 py-1 rounded font-bold outline-none"
              >
                <option value="2Q">2Q (Segunda Quincena)</option>
                <option value="1Q">1Q (Primera Quincena)</option>
                <option value="AMBAS">Ambas Quincenas (1Q y 2Q)</option>
              </select>
            </div>

            {/* TABLA DE SERVICIOS */}
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c3461] text-white uppercase text-[11px]">
                  <tr>
                    <th className="p-2.5 text-center w-10">#</th>
                    <th className="p-2.5">Servicio</th>
                    <th className="p-2.5 text-center">Ciudad</th>
                    <th className="p-2.5 text-right">Cantidad</th>
                    <th className="p-2.5 text-right">Vr Unitario</th>
                    <th className="p-2.5 text-center">% Descuento</th>
                    <th className="p-2.5 text-right">Despues de %</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                    <th className="p-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {itemsCotizacion.map((it, idx) => {
                    const despuesDesc = it.vrUnitario * (1 - it.descuento / 100);
                    const subt = it.cantidad * despuesDesc;
                    const listaCiudades = CIUDADES_PAISES[pais] || CIUDADES_PAISES.COP;

                    return (
                      <tr key={it.id} className="hover:bg-slate-800/40">
                        <td className="p-2.5 text-center text-slate-400">{idx + 1}.</td>
                        <td className="p-2.5">
                          <input 
                            type="text" 
                            value={it.servicio} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemsCotizacion(itemsCotizacion.map(i => i.id === item.id ? { ...i, servicio: val } : i));
                            }}
                            className="bg-transparent text-white font-semibold focus:bg-slate-800 px-1 py-0.5 rounded w-full border-b border-transparent focus:border-amber-400 outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <select
                            value={it.ciudad}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemsCotizacion(itemsCotizacion.map(i => i.id === item.id ? { ...i, ciudad: val } : i));
                            }}
                            className="bg-slate-900 text-slate-200 border border-slate-700 px-2 py-1 rounded text-xs outline-none"
                          >
                            {listaCiudades.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5 text-right">
                          <input 
                            type="number" 
                            value={it.cantidad} 
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setItemsCotizacion(itemsCotizacion.map(i => i.id === item.id ? { ...i, cantidad: val } : i));
                            }}
                            className="bg-transparent text-right text-white font-bold focus:bg-slate-800 px-1 py-0.5 rounded w-20 border-b border-transparent focus:border-amber-400 outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input 
                            type="number" 
                            value={it.vrUnitario} 
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setItemsCotizacion(itemsCotizacion.map(i => i.id === item.id ? { ...i, vrUnitario: val } : i));
                            }}
                            className="bg-transparent text-right text-white focus:bg-slate-800 px-1 py-0.5 rounded w-24 border-b border-transparent focus:border-amber-400 outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input 
                            type="number" 
                            value={it.descuento} 
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setItemsCotizacion(itemsCotizacion.map(i => i.id === item.id ? { ...i, descuento: val } : i));
                            }}
                            className="bg-transparent text-center text-amber-400 font-bold focus:bg-slate-800 px-1 py-0.5 rounded w-14 border-b border-transparent focus:border-amber-400 outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-right text-slate-300 font-mono font-bold">
                          ${Math.round(despuesDesc).toLocaleString("es-CO")}
                        </td>
                        <td className="p-2.5 text-right text-white font-bold font-mono">
                          ${Math.round(subt).toLocaleString("es-CO")}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => setItemsCotizacion(itemsCotizacion.filter(i => i.id !== it.id))}
                            className="text-slate-500 hover:text-red-400 transition p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totalizador */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-400">Los valores de la cotización no incluyen IVA.</span>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Cotizado (Sin IVA):</span>
                <span className="text-xl font-bold text-amber-400 font-mono">
                  $ {itemsCotizacion.reduce((acc, it) => acc + (it.cantidad * it.vrUnitario * (1 - it.descuento/100)), 0).toLocaleString("es-CO")} {pais}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: AUTORIZACIÓN DE PAUTA OFICIAL */}
        {tab === "autorizacion" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" /> Autorización de Pauta / Servicios
                </h2>
                <p className="text-xs text-slate-400">Ciudades sincronizadas con tipografía limpia y cálculo independiente de artes.</p>
              </div>

              <button
                onClick={imprimirAutorizacionPDF}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow transition"
              >
                <Printer className="w-3.5 h-3.5" /> Descargar Autorización en PDF (Carta Horizontal)
              </button>
            </div>

            {/* Meta Table */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="text-slate-400 block mb-1">Comercial Encargado:</label>
                <input 
                  type="text" 
                  value={nombreComercial} 
                  onChange={(e) => setNombreComercial(e.target.value)}
                  className="bg-slate-900 text-white font-bold w-full p-1.5 rounded border border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Cliente:</label>
                <input 
                  type="text" 
                  value={clienteNombre} 
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Escribir nombre del cliente..."
                  className="bg-slate-900 text-amber-400 font-bold w-full p-1.5 rounded border border-slate-700 outline-none placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Tipo de Servicio:</label>
                <input 
                  type="text" 
                  value={autorizacion.tipoServicio} 
                  onChange={(e) => setAutorizacion({ ...autorizacion, tipoServicio: e.target.value })}
                  className="bg-slate-900 text-white w-full p-1.5 rounded border border-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Fecha de la Pauta:</label>
                <input 
                  type="text" 
                  value={fechaPauta} 
                  onChange={(e) => setFechaPauta(e.target.value)}
                  placeholder="Ej: 16 al 30 de Noviembre"
                  className="bg-slate-900 text-white font-bold w-full p-1.5 rounded border border-slate-700 outline-none placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Total Unidades Autorizadas (Espacios):</label>
                <div className="bg-slate-900 text-amber-400 font-black text-sm p-1.5 rounded border border-slate-700">
                  {granTotalAscensores} Espacios
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Días de Pauta (si aplica):</label>
                <input 
                  type="text" 
                  value={autorizacion.diasPauta} 
                  onChange={(e) => setAutorizacion({ ...autorizacion, diasPauta: e.target.value })}
                  className="bg-slate-900 text-white w-full p-1.5 rounded border border-slate-700 outline-none"
                />
              </div>
            </div>

            {/* TABLA DISTRIBUCIÓN POR CIUDAD */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <div className="bg-purple-900/40 text-purple-200 font-bold px-3 py-2 text-xs border-b border-purple-800/50">
                Distribución por ciudad según tipo de servicio
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 text-[11px]">
                  <tr>
                    <th className="p-2.5">Ciudad</th>
                    <th className="p-2.5 text-center w-28">Cantidad (1Q)</th>
                    <th className="p-2.5 text-center w-28">Cantidad (2Q)</th>
                    <th className="p-2.5">Observación (opcional)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {autorizacion.ciudadesDistribucion.map((c, i) => (
                    <tr key={c.nombre} className={c.q1 > 0 || c.q2 > 0 ? "bg-amber-500/5 font-semibold" : ""}>
                      <td className="p-2.5 text-slate-200">{c.nombre}</td>
                      <td className="p-2.5 text-center">
                        <input 
                          type="number" 
                          value={c.q1} 
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const n = [...autorizacion.ciudadesDistribucion];
                            n[i].q1 = val;
                            setAutorizacion({ ...autorizacion, ciudadesDistribucion: n });
                          }}
                          className="bg-transparent text-center text-white w-16 border-b border-slate-700 outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input 
                          type="number" 
                          value={c.q2} 
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const n = [...autorizacion.ciudadesDistribucion];
                            n[i].q2 = val;
                            setAutorizacion({ ...autorizacion, ciudadesDistribucion: n });
                          }}
                          className="bg-transparent text-center text-white w-16 border-b border-slate-700 outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input 
                          type="text" 
                          value={c.obs} 
                          onChange={(e) => {
                            const val = e.target.value;
                            const n = [...autorizacion.ciudadesDistribucion];
                            n[i].obs = val;
                            setAutorizacion({ ...autorizacion, ciudadesDistribucion: n });
                          }}
                          placeholder="Artes en drive..."
                          className="bg-transparent text-slate-400 text-xs w-full border-b border-transparent focus:border-slate-700 outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-950 font-black text-xs">
                    <td className="p-2.5 text-right text-slate-300">TOTAL:</td>
                    <td className="p-2.5 text-center text-amber-400">{totalAscensoresQ1}</td>
                    <td className="p-2.5 text-center text-amber-400">{totalAscensoresQ2}</td>
                    <td className="p-2.5"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TABLA INSERTOS (CANTIDAD INICIAL EN 0) */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <div className="bg-purple-900/40 text-purple-200 font-bold px-3 py-2 text-xs border-b border-purple-800/50 flex justify-between items-center">
                <span>INSERTOS / MATERIAL POP</span>
                <button
                  onClick={() => {
                    setAutorizacion({
                      ...autorizacion,
                      insertos: [...autorizacion.insertos, { servicio: "Dist Insertos", cantidad: 0, observacion: "" }]
                    });
                  }}
                  className="bg-purple-800 hover:bg-purple-700 text-white text-[10px] px-2 py-0.5 rounded"
                >
                  + Agregar Fila
                </button>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 text-[11px]">
                  <tr>
                    <th className="p-2.5">Servicio</th>
                    <th className="p-2.5 text-center w-28">Cantidad</th>
                    <th className="p-2.5">Observación</th>
                    <th className="p-2.5 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {autorizacion.insertos.map((ins, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <input 
                          type="text" 
                          value={ins.servicio} 
                          onChange={(e) => {
                            const val = e.target.value;
                            const n = [...autorizacion.insertos];
                            n[idx].servicio = val;
                            setAutorizacion({ ...autorizacion, insertos: n });
                          }}
                          className="bg-transparent text-white font-medium w-full border-b border-transparent focus:border-slate-700 outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input 
                          type="number" 
                          value={ins.cantidad} 
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const n = [...autorizacion.insertos];
                            n[idx].cantidad = val;
                            setAutorizacion({ ...autorizacion, insertos: n });
                          }}
                          className="bg-transparent text-center text-white font-bold w-20 border-b border-slate-700 outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input 
                          type="text" 
                          value={ins.observacion} 
                          onChange={(e) => {
                            const val = e.target.value;
                            const n = [...autorizacion.insertos];
                            n[idx].observacion = val;
                            setAutorizacion({ ...autorizacion, insertos: n });
                          }}
                          placeholder="Observación de entrega..."
                          className="bg-transparent text-slate-300 text-xs w-full border-b border-transparent focus:border-slate-700 outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => {
                            setAutorizacion({
                              ...autorizacion,
                              insertos: autorizacion.insertos.filter((_, i) => i !== idx)
                            });
                          }}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TABLA ARTES PARA PRODUCCIÓN: CIUDADES FIJAS DE ARRIBA Y SELECTOR SOLO SI ES NUEVA FILA */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <div className="bg-purple-900/40 text-purple-200 font-bold px-3 py-2 text-xs border-b border-purple-800/50 flex justify-between items-center">
                <span>ARTES PARA PRODUCCIÓN / INSTALACIÓN</span>
                <button
                  onClick={() => {
                    const lista = CIUDADES_PAISES[pais] || CIUDADES_PAISES.COP;
                    setAutorizacion({
                      ...autorizacion,
                      artes: [...autorizacion.artes, { ciudad: lista[0], arte: "", q1: 0, q2: 0, formato: "Marco Acrílico", obs: "Arte en el drive", esNueva: true }]
                    });
                  }}
                  className="bg-purple-800 hover:bg-purple-700 text-white text-[10px] px-2 py-0.5 rounded font-bold"
                >
                  + Agregar Arte / Fila
                </button>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 text-[11px]">
                  <tr>
                    <th className="p-2.5">Ciudad</th>
                    <th className="p-2.5">Arte / Referencia</th>
                    <th className="p-2.5 text-center w-20">1Q</th>
                    <th className="p-2.5 text-center w-20">2Q</th>
                    <th className="p-2.5">Formato</th>
                    <th className="p-2.5">Observaciones</th>
                    <th className="p-2.5 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {autorizacion.artes.map((art, idx) => {
                    const listaCiudades = CIUDADES_PAISES[pais] || CIUDADES_PAISES.COP;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-2 font-bold text-slate-200">
                          {art.esNueva ? (
                            <select
                              value={art.ciudad}
                              onChange={(e) => {
                                const val = e.target.value;
                                const n = [...autorizacion.artes];
                                n[idx].ciudad = val;
                                setAutorizacion({ ...autorizacion, artes: n });
                              }}
                              className="bg-slate-900 text-white border border-slate-700 px-1.5 py-1 rounded text-xs outline-none"
                            >
                              {listaCiudades.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="px-2 py-1 bg-slate-900/60 rounded text-amber-300 font-bold border border-slate-800 inline-block min-w-[100px]">
                              {art.ciudad}
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={art.arte} 
                            placeholder="Nombre del Arte (ej: Pieza Win)"
                            onChange={(e) => {
                              const val = e.target.value;
                              const n = [...autorizacion.artes];
                              n[idx].arte = val;
                              setAutorizacion({ ...autorizacion, artes: n });
                            }}
                            className="bg-transparent text-white font-medium w-full border-b border-transparent focus:border-slate-700 outline-none placeholder:text-slate-600"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input 
                            type="number" 
                            value={art.q1} 
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const n = [...autorizacion.artes];
                              n[idx].q1 = val;
                              setAutorizacion({ ...autorizacion, artes: n });
                            }}
                            className="bg-transparent text-center text-white font-bold w-16 border-b border-slate-700 outline-none"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input 
                            type="number" 
                            value={art.q2} 
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const n = [...autorizacion.artes];
                              n[idx].q2 = val;
                              setAutorizacion({ ...autorizacion, artes: n });
                            }}
                            className="bg-transparent text-center text-white font-bold w-16 border-b border-slate-700 outline-none"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={art.formato} 
                            onChange={(e) => {
                              const val = e.target.value;
                              const n = [...autorizacion.artes];
                              n[idx].formato = val;
                              setAutorizacion({ ...autorizacion, artes: n });
                            }}
                            className="bg-transparent text-slate-300 w-full border-b border-transparent focus:border-slate-700 outline-none"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={art.obs} 
                            onChange={(e) => {
                              const val = e.target.value;
                              const n = [...autorizacion.artes];
                              n[idx].obs = val;
                              setAutorizacion({ ...autorizacion, artes: n });
                            }}
                            className="bg-transparent text-slate-400 text-xs w-full border-b border-transparent focus:border-slate-700 outline-none"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => {
                              setAutorizacion({
                                ...autorizacion,
                                artes: autorizacion.artes.filter((_, i) => i !== idx)
                              });
                            }}
                            className="text-slate-500 hover:text-red-400"
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-950 font-black text-xs">
                    <td colSpan={2} className="p-2.5 text-right text-slate-300">TOTAL ARTES:</td>
                    <td className="p-2.5 text-center text-amber-400">{totalArtesQ1}</td>
                    <td className="p-2.5 text-center text-amber-400">{totalArtesQ2}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* OBSERVACIONES */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs space-y-2">
              <label className="text-slate-400 block font-semibold">Observaciones (instalación / entregas / restricciones / accesos):</label>
              <textarea 
                rows={2} 
                value={autorizacion.observacionesGenerales}
                onChange={(e) => setAutorizacion({ ...autorizacion, observacionesGenerales: e.target.value })}
                className="w-full bg-slate-900 text-slate-200 p-2 rounded border border-slate-700 outline-none"
              />
            </div>

          </div>
        )}

      </div>

    </div>
  );
}