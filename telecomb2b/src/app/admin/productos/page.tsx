"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, deleteDoc, doc, updateDoc,
  addDoc, query, orderBy, limit, getDoc, writeBatch
} from "firebase/firestore";
import * as XLSX from 'xlsx';

/* ─── INTERFACES ─── */
interface EscalaPrecio { cantidad: number; precio: number; }
interface PreciosVolumen { unidad: EscalaPrecio[]; caja: EscalaPrecio[]; }

interface Producto {
  id: string; sku: string; nombre_producto: string; descripcion_corta: string;
  categoria_id: string; marca: string; modelo: string; color: string;
  capacidad_almacenamiento: string; capacidad_ram: string; sistema_operativo: string;
  version_so: string; tamano_pantalla: string; resolucion_pantalla: string;
  procesador: string; camara_principal: string; camara_frontal: string;
  bateria_mah: string; conectividad: string; sim: string;
  especificaciones_tecnicas: string; precio_unitario: number; precio_caja: number;
  precios_volumen?: PreciosVolumen; unidades_por_caja: number; pedido_minimo: number;
  moneda: string; stock_cajas: number; stock_unidades: number;
  stock_minimo_cajas: number; stock_minimo_unidades?: number;
  peso_kg: number; dimensiones: string; dimensiones_unidad?: string;
  garantia_meses: number; imagen_principal: string; imagenes_adicionales?: string[];
  documento_ficha: string; estado: string; fecha_creacion?: any; fecha_modificacion?: any;
  slug?: string; meta_titulo?: string; meta_descripcion?: string;
  destacado?: boolean; en_oferta?: boolean; en_oferta_unidad?: boolean;
  precio_oferta_caja?: number; precio_oferta_unidad?: number; fecha_oferta_fin?: any;
  visitas?: number; ventas_totales_cajas?: number; rating_promedio?: number; total_resenas?: number;
}

interface Resena {
  id: string; producto_id: string; producto_nombre: string; producto_sku: string;
  usuario: string; usuarioEmail: string; usuarioId: string; usuarioFoto: string | null;
  comentario: string; rating: number; imagenes: string[]; fecha: any;
  verificado: boolean; util: number; estado: "pendiente" | "aprobado" | "rechazado";
  pedidoId?: string;
}

interface HistorialCambio {
  id: string; producto_id: string; producto_nombre: string; usuario: string;
  accion: string; campo: string; valor_anterior: string; valor_nuevo: string; fecha: any;
}

interface ImportPreview {
  fila: number; sku: string; nombre: string; marca: string;
  precio_caja: number; precio_unitario: number; stock: number;
  categoria: string; valido: boolean; errores: string[];
}

/* ─── CONSTANTES ─── */
// ⚠️ IMPORTANTE: debe coincidir con la colección que usa mis-pedidos.tsx
const RESENAS_COLLECTION = "reseñas";

const CATEGORIAS = ["Gama Alta", "Gama Media", "Gama Baja"];

const MARCAS: Record<string, string[]> = {
  "Gama Alta":  ["Apple","Samsung","Xiaomi","Huawei","Google","OnePlus","Oppo","Vivo","Asus","RedMagic","Honor"],
  "Gama Media": ["Samsung","Xiaomi","Motorola","Realme","Oppo","Vivo","Honor","Nokia","Huawei","Infinix","Tecno"],
  "Gama Baja":  ["Samsung","Xiaomi","Motorola","Realme","Infinix","Tecno","ZTE","Nokia","Oppo","Vivo"],
};

// Definido ANTES del componente para evitar referencias antes de declaración
const SO_OPCIONES_POR_MARCA: Record<string, string[]> = {
  "Apple":    ["iOS"],
  "Samsung":  ["Android (One UI)","Android (One UI Core)"],
  "Xiaomi":   ["Android (HyperOS)","Android (HyperOS / MIUI en algunos modelos)"],
  "Huawei":   ["HarmonyOS / HarmonyOS NEXT","HarmonyOS"],
  "Google":   ["Android (Android puro / Pixel UI)"],
  "OnePlus":  ["Android (OxygenOS)"],
  "Oppo":     ["Android (ColorOS)"],
  "Vivo":     ["Android (Funtouch OS / OriginOS)","Android (Funtouch OS)"],
  "Asus":     ["Android (ZenUI)"],
  "RedMagic": ["Android (RedMagic OS)"],
  "Honor":    ["Android (MagicOS)"],
  "Motorola": ["Android (My UX / Android casi puro)","Android"],
  "Realme":   ["Android (Realme UI)"],
  "Nokia":    ["Android (Android One / Android casi puro)","Android"],
  "Infinix":  ["Android (XOS)"],
  "Tecno":    ["Android (HiOS)"],
  "ZTE":      ["Android (MyOS)"],
};

const COLORES = ["Negro","Blanco","Azul","Rojo","Verde","Morado / Purpura","Dorado","Plateado","Rosa","Titanio","Grafito","Naranja","Coral","Multicolor (surtido)","Gris","Amarillo","Beige","Bronce","Lavanda","Menta"];
const ALMACENAMIENTO = ["16GB","32GB","64GB","128GB","256GB","512GB","1TB"];
const RAM_OPTIONS    = ["2GB","3GB","4GB","6GB","8GB","12GB","16GB"];
const SIM_OPTIONS    = ["SIM Única (1 ranura)","Doble SIM física (2 ranuras nano-SIM)","SIM + eSIM (1 física + 1 virtual)","Doble SIM + eSIM (2 físicas + 1 virtual)","Solo eSIM (sin ranura física)"];
const PEDIDO_MIN_OPT = [5,10,20,30,50,100];

/* ─── IMAGEN ─── */
const ProductImage = ({ src, alt }: { src?: string; alt?: string }) => {
  const [err, setErr] = useState(false);
  const initials = (t = "P") => t.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
  if (!src || err)
    return <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-sm shadow" style={{ background:"linear-gradient(135deg,#FF6600,#F6FA00)", color:"#000" }}>{initials(alt)}</div>;
  return <img src={src} alt={alt||"Producto"} className="w-14 h-14 rounded-xl object-contain bg-white shadow border-2 p-1" style={{ borderColor:"#F6FA00" }} onError={() => setErr(true)} />;
};

/* ─── STARS ─── */
const Stars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <span style={{ color:"#FF6600", fontSize:size }}>
    {[1,2,3,4,5].map(i => <span key={i}>{i <= rating ? "★" : "☆"}</span>)}
  </span>
);

const INP = "w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-semibold text-black focus:outline-none focus:border-orange-500 transition-colors text-sm";
const LBL = "text-xs font-bold text-gray-700 block mb-1.5 tracking-wide";

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════ */
export default function GestionProductos() {
  const [productos,      setProductos]      = useState<Producto[]>([]);
  const [filtrados,      setFiltrados]      = useState<Producto[]>([]);
  const [resenas,        setResenas]        = useState<Resena[]>([]);
  const [historial,      setHistorial]      = useState<HistorialCambio[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [loadingUpload,  setLoadingUpload]  = useState(false);

  const [editando,       setEditando]       = useState<Partial<Producto> | null>(null);
  const [nuevaImg,       setNuevaImg]       = useState<File | null>(null);
  const [imgsAdd,        setImgsAdd]        = useState<File[]>([]);
  const [nuevoDoc,       setNuevoDoc]       = useState<File | null>(null);
  const [marcasDisp,     setMarcasDisp]     = useState<string[]>([]);

  const [escalasUnidad,  setEscalasUnidad]  = useState<EscalaPrecio[]>([{cantidad:5,precio:0},{cantidad:10,precio:0},{cantidad:20,precio:0},{cantidad:50,precio:0}]);
  const [escalasCaja,    setEscalasCaja]    = useState<EscalaPrecio[]>([{cantidad:1,precio:0},{cantidad:3,precio:0},{cantidad:5,precio:0},{cantidad:10,precio:0}]);
  const [preciosVolumenActivo, setPreciosVolumenActivo] = useState(false);

  const [mImportar,      setMImportar]      = useState(false);
  const [archivoExcel,   setArchivoExcel]   = useState<File | null>(null);
  const [previewData,    setPreviewData]    = useState<ImportPreview[]>([]);
  const [importando,     setImportando]     = useState(false);
  const [progresoImport, setProgresoImport] = useState(0);

  const [busqueda, setBusqueda] = useState("");
  const [fCateg,   setFCateg]   = useState("");
  const [fMarca,   setFMarca]   = useState("");
  const [fEstado,  setFEstado]  = useState("");
  const [fStock,   setFStock]   = useState("");

  const [pagina,    setPagina]    = useState(1);
  const [porPag,    setPorPag]    = useState(10);
  const [totalPags, setTotalPags] = useState(0);

  const [mResenas,     setMResenas]     = useState(false);
  const [mHistorial,   setMHistorial]   = useState(false);
  const [mStats,       setMStats]       = useState(false);
  const [mPrevia,      setMPrevia]      = useState(false);
  const [prodSel,      setProdSel]      = useState<Producto | null>(null);
  const [resenasAct,   setResenasAct]   = useState<Resena[]>([]);
  const [prodRSel,     setProdRSel]     = useState<Producto | null>(null);
  const [mResenaProd,  setMResenaProd]  = useState(false);
  // Tab de reseña: "pendiente" | "aprobado" | "rechazado" | "todas"
  const [tabResena,    setTabResena]    = useState<string>("todas");

  const [stats, setStats] = useState({
    totalProductos:0, totalValorStock:0, cajasStockCritico:0, cajasSinStock:0,
    productosActivos:0, destacados:0, enOferta:0, enOfertaUnidad:0,
    totalResenas:0, resenasPendientes:0,
  });
  const [alertas, setAlertas] = useState<{tipo:string; mensaje:string; productos:Producto[]}[]>([]);

  const pDate = (v: any): Date => {
    if (!v) return new Date();
    if (typeof v.toDate === "function") return v.toDate();
    if (v instanceof Date) return v;
    return new Date(v);
  };
  const fFecha = (f: any) => { try { return pDate(f).toLocaleDateString("es-PE"); } catch { return "—"; } };
  const slugify = (s = "") => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)+/g,"");

  /* ══════ CARGA ══════ */
  const cargarProductos = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db,"productos"));
      const docs = snap.docs.map(d => ({
        id: d.id, ...d.data(),
        estado:             d.data().estado             || "Activo",
        moneda:             "PEN",
        stock_minimo_cajas: d.data().stock_minimo_cajas || 2,
        stock_minimo_unidades: d.data().stock_minimo_unidades || 10,
        garantia_meses:     d.data().garantia_meses     || 12,
        pedido_minimo:      d.data().pedido_minimo      || 5,
        unidades_por_caja:  d.data().unidades_por_caja  || 10,
        stock_cajas:        d.data().stock_cajas        || 0,
        stock_unidades:     d.data().stock_unidades     || 0,
        destacado:          d.data().destacado          || false,
        en_oferta:          d.data().en_oferta          || false,
        en_oferta_unidad:   d.data().en_oferta_unidad   || false,
        precio_oferta_caja: d.data().precio_oferta_caja || null,
        precio_oferta_unidad: d.data().precio_oferta_unidad || null,
        precios_volumen:    d.data().precios_volumen    || null,
        rating_promedio:    d.data().rating_promedio    || 0,
        total_resenas:      d.data().total_resenas      || 0,
        ventas_totales_cajas: d.data().ventas_totales_cajas || 0,
        fecha_creacion:     pDate(d.data().fecha_creacion),
        fecha_modificacion: pDate(d.data().fecha_modificacion),
      })) as Producto[];
      setProductos(docs); setFiltrados(docs);
      setTotalPags(Math.ceil(docs.length / porPag));
      calcularStats(docs); generarAlertas(docs);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ✅ FIX: usa RESENAS_COLLECTION ("reseñas") para coincidir con mis-pedidos.tsx
  const cargarResenas = async () => {
    try {
      const todas: Resena[] = [];
      const ps = await getDocs(collection(db,"productos"));
      for (const pd of ps.docs) {
        const pdata = pd.data();
        // Intentar ambas colecciones para compatibilidad con datos existentes
        for (const col of [RESENAS_COLLECTION, "resenas"]) {
          try {
            const rs = await getDocs(query(collection(db,"productos",pd.id,col), orderBy("fecha","desc"), limit(50)));
            rs.docs.forEach(rd => {
              const r = rd.data();
              // Evitar duplicados
              if (todas.some(x => x.id === rd.id)) return;
              todas.push({
                id: rd.id, producto_id: pd.id,
                producto_nombre: pdata.nombre_producto || "Producto",
                producto_sku: pdata.sku || "",
                usuario: r.usuario || "Usuario",
                usuarioEmail: r.usuarioEmail || "",
                usuarioId: r.usuarioId || "",
                usuarioFoto: r.usuarioFoto || null,
                comentario: r.comentario || "",
                rating: r.rating || 5,
                imagenes: Array.isArray(r.imagenes) ? r.imagenes : [],
                fecha: pDate(r.fecha),
                verificado: r.verificado || false,
                util: r.util || 0,
                estado: r.estado || "pendiente",
                pedidoId: r.pedidoId || "",
              });
            });
          } catch { /* colección puede no existir, silencioso */ }
        }
      }
      // Ordenar por fecha descendente
      todas.sort((a,b) => pDate(b.fecha).getTime() - pDate(a.fecha).getTime());
      setResenas(todas);
      setStats(p => ({...p, totalResenas: todas.length, resenasPendientes: todas.filter(r => r.estado==="pendiente").length}));
    } catch(e) { console.error(e); }
  };

  const cargarResenasPorProducto = async (pid: string, pnombre: string, psku: string) => {
    try {
      const data: Resena[] = [];
      for (const col of [RESENAS_COLLECTION, "resenas"]) {
        try {
          const snap = await getDocs(query(collection(db,"productos",pid,col), orderBy("fecha","desc")));
          snap.docs.forEach(d => {
            if (data.some(x => x.id === d.id)) return;
            const r = d.data();
            data.push({
              id: d.id, producto_id: pid,
              producto_nombre: pnombre, producto_sku: psku,
              usuario: r.usuario||"Usuario", usuarioEmail: r.usuarioEmail||"",
              usuarioId: r.usuarioId||"", usuarioFoto: r.usuarioFoto||null,
              comentario: r.comentario||"", rating: r.rating||5,
              imagenes: Array.isArray(r.imagenes)?r.imagenes:[],
              fecha: pDate(r.fecha), verificado: r.verificado||false,
              util: r.util||0, estado: r.estado||"pendiente",
              pedidoId: r.pedidoId||"",
            });
          });
        } catch { /* silencioso */ }
      }
      data.sort((a,b) => pDate(b.fecha).getTime() - pDate(a.fecha).getTime());
      setResenasAct(data);
      setProdRSel(productos.find(p => p.id===pid)||null);
      setMResenaProd(true);
    } catch(e) { console.error(e); }
  };

  const cargarHistorial = async () => {
    try {
      const snap = await getDocs(query(collection(db,"historial"), orderBy("fecha","desc"), limit(50)));
      setHistorial(snap.docs.map(d => ({id:d.id,...d.data(),fecha:pDate(d.data().fecha)})) as HistorialCambio[]);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { cargarProductos(); cargarResenas(); cargarHistorial(); }, []);

  useEffect(() => {
    if (!editando) return;
    setMarcasDisp(editando.categoria_id ? (MARCAS[editando.categoria_id]||[]) : []);
    if (editando.marca && SO_OPCIONES_POR_MARCA[editando.marca]?.length === 1) {
      setEditando(prev => prev ? {...prev, sistema_operativo: SO_OPCIONES_POR_MARCA[editando.marca!][0]} : prev);
    }
    if (editando.precios_volumen) {
      setPreciosVolumenActivo(true);
      if (editando.precios_volumen.unidad) setEscalasUnidad(editando.precios_volumen.unidad);
      if (editando.precios_volumen.caja) setEscalasCaja(editando.precios_volumen.caja);
    }
  }, [editando?.categoria_id, editando?.marca]); // eslint-disable-line

  useEffect(() => {
    if (!preciosVolumenActivo) return;
    if (editando?.precio_unitario && editando.precio_unitario > 0)
      setEscalasUnidad(prev => prev.map(e => ({...e, precio: calcularPrecioEscala(e.cantidad, editando.precio_unitario!)})));
    if (editando?.precio_caja && editando.precio_caja > 0)
      setEscalasCaja(prev => prev.map(e => ({...e, precio: calcularPrecioEscalaCaja(e.cantidad, editando.precio_caja!)})));
  }, [editando?.precio_unitario, editando?.precio_caja, preciosVolumenActivo]); // eslint-disable-line

  /* ══════ PRECIOS VOLUMEN ══════ */
  const calcularPrecioEscala = (cant: number, base: number) => {
    if (cant >= 50) return Math.round(base * 0.85);
    if (cant >= 20) return Math.round(base * 0.90);
    if (cant >= 10) return Math.round(base * 0.95);
    return base;
  };
  const calcularPrecioEscalaCaja = (cant: number, base: number) => {
    if (cant >= 10) return Math.round(base * 0.82);
    if (cant >= 5)  return Math.round(base * 0.88);
    if (cant >= 3)  return Math.round(base * 0.94);
    return base;
  };
  const actualizarEscalaUnidad = (idx: number, campo: keyof EscalaPrecio, val: number) => {
    const n = [...escalasUnidad]; n[idx][campo] = val; setEscalasUnidad(n);
  };
  const actualizarEscalaCaja = (idx: number, campo: keyof EscalaPrecio, val: number) => {
    const n = [...escalasCaja]; n[idx][campo] = val; setEscalasCaja(n);
  };
  const agregarEscalaUnidad = () => {
    const u = escalasUnidad[escalasUnidad.length-1];
    const c = u ? u.cantidad+30 : 80;
    setEscalasUnidad([...escalasUnidad,{cantidad:c,precio:calcularPrecioEscala(c,editando?.precio_unitario||0)}]);
  };
  const agregarEscalaCaja = () => {
    const u = escalasCaja[escalasCaja.length-1];
    const c = u ? u.cantidad+5 : 15;
    setEscalasCaja([...escalasCaja,{cantidad:c,precio:calcularPrecioEscalaCaja(c,editando?.precio_caja||0)}]);
  };
  const eliminarEscalaUnidad = (idx: number) => { if (escalasUnidad.length>1) setEscalasUnidad(escalasUnidad.filter((_,i)=>i!==idx)); };
  const eliminarEscalaCaja   = (idx: number) => { if (escalasCaja.length>1)   setEscalasCaja(escalasCaja.filter((_,i)=>i!==idx)); };

  /* ══════ IMPORTACIÓN ══════ */
  const descargarPlantilla = () => {
    const p = [{SKU:"SAM-A55-256",NOMBRE:"Samsung Galaxy A55 256GB Negro",MARCA:"Samsung",CATEGORIA:"Gama Media",PRECIO_CAJA:8500,PRECIO_UNITARIO:95,STOCK_CAJAS:50,UNIDADES_POR_CAJA:10,PEDIDO_MINIMO:5,COLOR:"Negro",ALMACENAMIENTO:"256GB",RAM:"8GB",DESCRIPCION:"Celular nuevo sellado, garantía 12 meses"}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(p), "Plantilla");
    XLSX.writeFile(wb,"plantilla_importacion_b2b.xlsx");
  };

  const procesarArchivo = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const wb   = XLSX.read(data);
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);
      const prev: ImportPreview[] = json.map((row:any, i) => {
        const err: string[] = [];
        if (!row.SKU) err.push("SKU requerido");
        if (!row.NOMBRE) err.push("Nombre requerido");
        if (!row.MARCA) err.push("Marca requerida");
        if (!row.CATEGORIA||!CATEGORIAS.includes(row.CATEGORIA)) err.push("Categoría inválida");
        if (!row.PRECIO_CAJA||row.PRECIO_CAJA<=0) err.push("Precio caja inválido");
        if (row.STOCK_CAJAS<0) err.push("Stock inválido");
        return {fila:i+2,sku:row.SKU||"",nombre:row.NOMBRE||"",marca:row.MARCA||"",precio_caja:Number(row.PRECIO_CAJA)||0,precio_unitario:Number(row.PRECIO_UNITARIO)||0,stock:Number(row.STOCK_CAJAS)||0,categoria:row.CATEGORIA||"",valido:err.length===0,errores:err};
      });
      setPreviewData(prev);
    } catch(e) { console.error(e); alert("Error al procesar el archivo."); }
  };

  const importarProductos = async () => {
    if (!archivoExcel||!previewData.length) return;
    setImportando(true); setProgresoImport(0);
    try {
      const data = await archivoExcel.arrayBuffer();
      const wb   = XLSX.read(data);
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const batch = writeBatch(db);
      let ok=0, err=0;
      for (let i=0; i<json.length; i++) {
        const row:any = json[i];
        setProgresoImport(Math.round(((i+1)/json.length)*100));
        try {
          const upc = Number(row.UNIDADES_POR_CAJA)||10;
          const sc  = Number(row.STOCK_CAJAS)||0;
          const pu  = Number(row.PRECIO_UNITARIO)||0;
          const pc  = Number(row.PRECIO_CAJA)||0;
          const ref = doc(collection(db,"productos"));
          batch.set(ref,{
            sku:row.SKU, nombre_producto:row.NOMBRE, marca:row.MARCA, categoria_id:row.CATEGORIA,
            precio_caja:pc, precio_unitario:pu,
            precios_volumen:{
              unidad:[{cantidad:5,precio:pu},{cantidad:10,precio:Math.round(pu*0.95)},{cantidad:20,precio:Math.round(pu*0.90)},{cantidad:50,precio:Math.round(pu*0.85)}],
              caja:  [{cantidad:1,precio:pc},{cantidad:3,precio:Math.round(pc*0.94)},{cantidad:5,precio:Math.round(pc*0.88)},{cantidad:10,precio:Math.round(pc*0.82)}],
            },
            unidades_por_caja:upc, pedido_minimo:Number(row.PEDIDO_MINIMO)||5,
            stock_cajas:sc, stock_unidades:sc*upc,
            stock_minimo_cajas:Number(row.STOCK_MINIMO)||2,
            stock_minimo_unidades:(Number(row.STOCK_MINIMO)||2)*upc,
            color:row.COLOR||"", capacidad_almacenamiento:row.ALMACENAMIENTO||"",
            capacidad_ram:row.RAM||"", descripcion_corta:row.DESCRIPCION||"",
            modelo:row.MODELO||"", sistema_operativo:row.SO||"",
            garantia_meses:Number(row.GARANTIA)||12, estado:"Activo", moneda:"PEN",
            imagen_principal:"", destacado:false, en_oferta:false, en_oferta_unidad:false,
            fecha_creacion:new Date(), fecha_modificacion:new Date(),
            slug:slugify(row.NOMBRE), visitas:0, ventas_totales_cajas:0, rating_promedio:0, total_resenas:0,
          });
          ok++;
        } catch(er) { console.error(`Fila ${i+2}:`,er); err++; }
      }
      await batch.commit();
      alert(`✅ Importación completada:\n- ${ok} productos exitosos\n- ${err} con errores`);
      setMImportar(false); setArchivoExcel(null); setPreviewData([]);
      cargarProductos();
    } catch(e) { console.error(e); alert("Error durante la importación"); }
    finally { setImportando(false); setProgresoImport(0); }
  };

  /* ══════ FILTROS ══════ */
  useEffect(() => {
    let f = [...productos];
    if (busqueda) { const b=busqueda.toLowerCase(); f=f.filter(p=>[p.nombre_producto,p.sku,p.marca,p.modelo].some(v=>v?.toLowerCase().includes(b))); }
    if (fCateg)  f=f.filter(p=>p.categoria_id===fCateg);
    if (fMarca)  f=f.filter(p=>p.marca===fMarca);
    if (fEstado) f=f.filter(p=>p.estado===fEstado);
    if (fStock==="critico")    f=f.filter(p=>p.stock_cajas<=p.stock_minimo_cajas&&p.stock_cajas>0);
    if (fStock==="agotado")    f=f.filter(p=>p.stock_cajas<=0);
    if (fStock==="disponible") f=f.filter(p=>p.stock_cajas>p.stock_minimo_cajas);
    setFiltrados(f); setTotalPags(Math.ceil(f.length/porPag)); setPagina(1);
  }, [busqueda,fCateg,fMarca,fEstado,fStock,productos]); // eslint-disable-line

  const pagActual = () => filtrados.slice((pagina-1)*porPag, pagina*porPag);
  const cambiarPorPag = (n: number) => { setPorPag(n); setTotalPags(Math.ceil(filtrados.length/n)); setPagina(1); };

  /* ══════ EXPORT ══════ */
  const exportarCSV = () => {
    const h = ["SKU","Producto","Marca","Modelo","Almacen","RAM","Color","SO","Precio Caja PEN","Precio Unit PEN","Uds/Caja","Ped Min","Stock Cajas","Stock Uds","Estado"];
    const rows = filtrados.map(p => [p.sku,p.nombre_producto,p.marca,p.modelo,p.capacidad_almacenamiento,p.capacidad_ram,p.color,p.sistema_operativo,p.precio_caja||0,p.precio_unitario||0,p.unidades_por_caja||0,p.pedido_minimo||5,p.stock_cajas||0,(p.stock_cajas||0)*(p.unidades_por_caja||0),p.estado]);
    const csv = [h.join(","),...rows.map(r=>r.map(c=>`"${c}"`).join(","))].join("\n");
    const a = Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"})),download:`catalogo_b2b_${new Date().toISOString().split("T")[0]}.csv`,style:{visibility:"hidden"}});
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const imprimirCatalogo = () => {
    const w = window.open("","_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Catalogo B2B</title><style>body{font-family:Arial;padding:20px}h1{color:#FF6600}table{width:100%;border-collapse:collapse}th{background:#000;color:#fff;padding:10px;text-align:left}td{padding:8px;border-bottom:1px solid #eee}.precio{font-weight:900;color:#FF6600}</style></head><body><h1>CATALOGO MAYORISTA B2B</h1><p>${new Date().toLocaleDateString("es-PE")}</p><table><thead><tr><th>SKU</th><th>Producto</th><th>Specs</th><th>Precio/Caja</th><th>Uds/Caja</th><th>Ped. Min.</th><th>Stock</th></tr></thead><tbody>${filtrados.map(p=>`<tr><td>${p.sku||""}</td><td><b>${p.nombre_producto||""}</b><br><small>${p.marca||""} ${p.modelo||""} — ${p.color||""}</small></td><td>${p.capacidad_almacenamiento||""} / ${p.capacidad_ram||""}</td><td class="precio">S/ ${(p.precio_caja||0).toFixed(2)}</td><td>${p.unidades_por_caja||0}</td><td>${p.pedido_minimo||5}</td><td>${p.stock_cajas||0}</td></tr>`).join("")}</tbody></table></body></html>`);
    w.document.close(); w.print();
  };

  /* ══════ CLOUDINARY ══════ */
  const subirCloudinary = async (file: File, tipo: "image"|"raw") => {
    const fd = new FormData();
    fd.append("file",file); fd.append("upload_preset","config_b2b");
    if (tipo==="raw") fd.append("resource_type","raw");
    const res = await fetch(`https://api.cloudinary.com/v1_1/dzazr0jiu/${tipo==="image"?"image":"raw"}/upload`,{method:"POST",body:fd});
    const d = await res.json();
    if (!d.secure_url) throw new Error("Error subiendo a Cloudinary");
    return d.secure_url as string;
  };

  /* ══════ GUARDAR ══════ */
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    setLoadingUpload(true);
    try {
      let imgUrl  = editando.imagen_principal || "";
      let imgsAd: string[] = editando.imagenes_adicionales || [];
      if (nuevaImg) imgUrl = await subirCloudinary(nuevaImg,"image");
      if (imgsAdd.length>0) { const u = await Promise.all(imgsAdd.map(f=>subirCloudinary(f,"image"))); imgsAd=[...imgsAd,...u]; }
      let docUrl = editando.documento_ficha || "";
      if (nuevoDoc) docUrl = await subirCloudinary(nuevoDoc,"raw");

      const ahora = new Date();
      const stockUnidades = (editando.stock_cajas||0)*(editando.unidades_por_caja||1);
      const preciosVolumenData = preciosVolumenActivo
        ? { unidad:escalasUnidad.filter(e=>e.cantidad>0&&e.precio>0), caja:escalasCaja.filter(e=>e.cantidad>0&&e.precio>0) }
        : null;

      const pData: any = {
        sku: editando.sku, nombre_producto: editando.nombre_producto,
        descripcion_corta: editando.descripcion_corta||"",
        categoria_id: editando.categoria_id, marca: editando.marca||"",
        modelo: editando.modelo||"", color: editando.color||"",
        capacidad_almacenamiento: editando.capacidad_almacenamiento||"",
        capacidad_ram: editando.capacidad_ram||"",
        sistema_operativo: editando.sistema_operativo||"",
        version_so: editando.version_so||"",
        tamano_pantalla: editando.tamano_pantalla||"",
        resolucion_pantalla: editando.resolucion_pantalla||"",
        procesador: editando.procesador||"",
        camara_principal: editando.camara_principal||"",
        camara_frontal: editando.camara_frontal||"",
        bateria_mah: editando.bateria_mah||"",
        conectividad: editando.conectividad||"",
        sim: editando.sim||"Doble SIM física (2 ranuras nano-SIM)",
        especificaciones_tecnicas: editando.especificaciones_tecnicas||"",
        precio_unitario: Number(editando.precio_unitario)||0,
        precio_caja: Number(editando.precio_caja)||0,
        precios_volumen: preciosVolumenData,
        unidades_por_caja: Number(editando.unidades_por_caja)||10,
        pedido_minimo: Number(editando.pedido_minimo)||5,
        moneda: "PEN",
        stock_cajas: Number(editando.stock_cajas)||0,
        stock_unidades: stockUnidades,
        stock_minimo_cajas: Number(editando.stock_minimo_cajas)||2,
        stock_minimo_unidades: Number(editando.stock_minimo_unidades)||10,
        peso_kg: Number(editando.peso_kg)||0,
        dimensiones: editando.dimensiones||"",
        dimensiones_unidad: editando.dimensiones_unidad||"",
        garantia_meses: Number(editando.garantia_meses)||12,
        imagen_principal: imgUrl,
        imagenes_adicionales: imgsAd,
        documento_ficha: docUrl,
        estado: editando.estado||"Activo",
        slug: editando.slug||slugify(editando.nombre_producto||""),
        meta_titulo: editando.meta_titulo||editando.nombre_producto||"",
        meta_descripcion: editando.meta_descripcion||editando.descripcion_corta||"",
        destacado: editando.destacado||false,
        en_oferta: editando.en_oferta||false,
        en_oferta_unidad: editando.en_oferta_unidad||false,
        precio_oferta_caja: editando.precio_oferta_caja||null,
        precio_oferta_unidad: editando.precio_oferta_unidad||null,
        fecha_oferta_fin: editando.fecha_oferta_fin||null,
        fecha_modificacion: ahora,
      };

      if (editando.id) {
        const prev = productos.find(p=>p.id===editando.id);
        await updateDoc(doc(db,"productos",editando.id),pData);
        if (prev) {
          for (const k in pData) {
            if (JSON.stringify(prev[k as keyof Producto])!==JSON.stringify(pData[k]))
              await addDoc(collection(db,"historial"),{producto_id:editando.id,producto_nombre:editando.nombre_producto,usuario:"Admin",accion:"actualizacion",campo:k,valor_anterior:String(prev[k as keyof Producto]??""),valor_nuevo:String(pData[k]??""),fecha:ahora}).catch(()=>{});
          }
        }
      } else {
        const ref = await addDoc(collection(db,"productos"),{...pData,fecha_creacion:ahora,visitas:0,ventas_totales_cajas:0,rating_promedio:0,total_resenas:0});
        await addDoc(collection(db,"historial"),{producto_id:ref.id,producto_nombre:editando.nombre_producto,usuario:"Admin",accion:"creacion",campo:"producto",valor_anterior:"",valor_nuevo:"Producto creado",fecha:ahora}).catch(()=>{});
      }

      setEditando(null); setNuevaImg(null); setImgsAdd([]); setNuevoDoc(null);
      setPreciosVolumenActivo(false);
      setEscalasUnidad([{cantidad:5,precio:0},{cantidad:10,precio:0},{cantidad:20,precio:0},{cantidad:50,precio:0}]);
      setEscalasCaja([{cantidad:1,precio:0},{cantidad:3,precio:0},{cantidad:5,precio:0},{cantidad:10,precio:0}]);
      await cargarProductos(); await cargarResenas(); await cargarHistorial();
      alert("✅ Celular guardado correctamente.");
    } catch(err) { console.error(err); alert("Error al guardar el producto: "+(err instanceof Error ? err.message : String(err))); }
    finally { setLoadingUpload(false); }
  };

  /* ══════ ACCIONES ══════ */
  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este celular permanentemente?")) return;
    const p = productos.find(x=>x.id===id);
    await deleteDoc(doc(db,"productos",id));
    if (p) await addDoc(collection(db,"historial"),{producto_id:id,producto_nombre:p.nombre_producto,usuario:"Admin",accion:"eliminacion",campo:"producto",valor_anterior:"Activo",valor_nuevo:"Eliminado",fecha:new Date()}).catch(()=>{});
    cargarProductos(); cargarHistorial();
  };

  const toggleEstado = async (id: string, est="Activo") => {
    const nuevo = est==="Activo"?"Inactivo":"Activo";
    await updateDoc(doc(db,"productos",id),{estado:nuevo,fecha_modificacion:new Date()});
    const p = productos.find(x=>x.id===id);
    if (p) await addDoc(collection(db,"historial"),{producto_id:id,producto_nombre:p.nombre_producto,usuario:"Admin",accion:"actualizacion",campo:"estado",valor_anterior:est,valor_nuevo:nuevo,fecha:new Date()}).catch(()=>{});
    cargarProductos(); cargarHistorial();
  };

  const duplicar = async (p: Producto) => {
    const {id,...sin} = p;
    await addDoc(collection(db,"productos"),{...sin,sku:`${p.sku}-COPY-${Date.now()}`,nombre_producto:`${p.nombre_producto} (Copia)`,slug:slugify(`${p.nombre_producto} copia`),stock_cajas:0,stock_unidades:0,estado:"Inactivo",fecha_creacion:new Date(),fecha_modificacion:new Date(),ventas_totales_cajas:0,rating_promedio:0,total_resenas:0});
    cargarProductos(); alert("Celular duplicado.");
  };

  // ✅ FIX: usa RESENAS_COLLECTION para coincidir con donde se escriben
  const aprobarResena  = async (r: Resena) => {
    // Intentar la colección correcta primero
    for (const col of [RESENAS_COLLECTION,"resenas"]) {
      try { await updateDoc(doc(db,"productos",r.producto_id,col,r.id),{estado:"aprobado"}); break; } catch {}
    }
    cargarResenas();
    if (mResenaProd && prodRSel) cargarResenasPorProducto(prodRSel.id,prodRSel.nombre_producto||"",prodRSel.sku||"");
  };

  const rechazarResena = async (r: Resena) => {
    for (const col of [RESENAS_COLLECTION,"resenas"]) {
      try { await updateDoc(doc(db,"productos",r.producto_id,col,r.id),{estado:"rechazado"}); break; } catch {}
    }
    cargarResenas();
    if (mResenaProd && prodRSel) cargarResenasPorProducto(prodRSel.id,prodRSel.nombre_producto||"",prodRSel.sku||"");
  };

  const eliminarResena = async (r: Resena) => {
    if (!confirm("¿Eliminar esta reseña?")) return;
    for (const col of [RESENAS_COLLECTION,"resenas"]) {
      try { await deleteDoc(doc(db,"productos",r.producto_id,col,r.id)); break; } catch {}
    }
    const snap = await getDoc(doc(db,"productos",r.producto_id));
    if (snap.exists()) await updateDoc(doc(db,"productos",r.producto_id),{total_resenas:Math.max((snap.data().total_resenas||1)-1,0)}).catch(()=>{});
    cargarResenas();
    if (mResenaProd && prodRSel) cargarResenasPorProducto(prodRSel.id,prodRSel.nombre_producto||"",prodRSel.sku||"");
  };

  /* ══════ STATS ══════ */
  const calcularStats = (list: Producto[]) => {
    const val = list.reduce((s,p)=>s+((p.en_oferta&&p.precio_oferta_caja?p.precio_oferta_caja:p.precio_caja||0)*(p.stock_cajas||0)),0);
    setStats(prev=>({...prev,totalProductos:list.length,totalValorStock:val,cajasStockCritico:list.filter(p=>p.stock_cajas<=p.stock_minimo_cajas&&p.stock_cajas>0).length,cajasSinStock:list.filter(p=>p.stock_cajas<=0).length,productosActivos:list.filter(p=>p.estado==="Activo").length,destacados:list.filter(p=>p.destacado).length,enOferta:list.filter(p=>p.en_oferta).length,enOfertaUnidad:list.filter(p=>p.en_oferta_unidad).length}));
  };

  const generarAlertas = (list: Producto[]) => {
    const al: {tipo:string;mensaje:string;productos:Producto[]}[] = [];
    const crit = list.filter(p=>p.stock_cajas<=p.stock_minimo_cajas&&p.stock_cajas>0);
    if (crit.length)   al.push({tipo:"warning",mensaje:`${crit.length} productos con stock crítico`,productos:crit});
    const sin = list.filter(p=>p.stock_cajas<=0);
    if (sin.length)    al.push({tipo:"error",mensaje:`${sin.length} productos sin stock`,productos:sin});
    const sinImg = list.filter(p=>!p.imagen_principal);
    if (sinImg.length) al.push({tipo:"info",mensaje:`${sinImg.length} productos sin imagen`,productos:sinImg});
    const sinPrecio = list.filter(p=>!p.precio_caja||p.precio_caja<=0);
    if (sinPrecio.length) al.push({tipo:"error",mensaje:`${sinPrecio.length} productos sin precio`,productos:sinPrecio});
    setAlertas(al);
  };

  const stockBadge = (cajas: number, min: number) => {
    if (cajas<=0)   return {cls:"bg-red-100 text-red-800 border border-red-300",txt:"Agotado"};
    if (cajas<=min) return {cls:"bg-yellow-100 text-yellow-800 border border-yellow-400",txt:"Crítico"};
    return              {cls:"bg-green-100 text-green-800 border border-green-300",txt:"OK"};
  };

  /* ══════ RESEÑAS FILTRADAS ══════ */
  const resenasFiltradas = tabResena==="todas" ? resenas : resenas.filter(r=>r.estado===tabResena);
  const resenasActFiltradas = tabResena==="todas" ? resenasAct : resenasAct.filter(r=>r.estado===tabResena);

  /* ══════ CARD RESEÑA REUTILIZABLE ══════ */
  const ResenaCard = ({r, onAprobar, onRechazar, onEliminar}: {r:Resena; onAprobar:()=>void; onRechazar:()=>void; onEliminar:()=>void}) => (
    <div className="bg-gray-50 p-5 rounded-2xl border-2 border-gray-200 hover:border-orange-300 transition-colors mb-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          {r.usuarioFoto
            ? <img src={r.usuarioFoto} className="w-10 h-10 rounded-xl object-cover border-2 border-gray-200" alt="" />
            : <div className="w-10 h-10 rounded-xl text-black flex items-center justify-center font-black" style={{background:"#F6FA00"}}>{r.usuario?.charAt(0).toUpperCase()}</div>}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-black">{r.usuario}</p>
              {r.verificado && <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full font-bold">VER.</span>}
            </div>
            <p className="text-xs font-medium text-gray-400">{r.usuarioEmail}</p>
            <div className="flex items-center gap-2 mt-1">
              <Stars rating={r.rating} />
              <span className="text-xs font-bold">{r.rating}.0</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-1 rounded-full font-bold border ${r.estado==="aprobado"?"bg-green-100 text-green-800 border-green-300":r.estado==="rechazado"?"bg-red-100 text-red-800 border-red-300":"text-yellow-900 border-yellow-400"}`} style={r.estado==="pendiente"?{background:"#fffde7"}:{}}>{r.estado==="aprobado"?"APROBADA":r.estado==="rechazado"?"RECHAZADA":"PENDIENTE"}</span>
          <span className="text-xs font-medium text-gray-400">{fFecha(r.fecha)}</span>
        </div>
      </div>
      <div className="bg-white p-3 rounded-xl border-2 border-gray-100 mb-3">
        <p className="text-sm text-black font-medium">"{r.comentario}"</p>
      </div>
      <div className="flex gap-2 flex-wrap mb-3">
        <span className="text-xs px-2 py-1 rounded-lg font-bold text-white" style={{background:"#FF6600"}}>📱 {r.producto_nombre}</span>
        <span className="text-xs bg-black text-white px-2 py-1 rounded-lg font-bold">SKU: {r.producto_sku}</span>
        {r.pedidoId && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-medium border border-gray-200">Pedido: #{r.pedidoId.slice(-8).toUpperCase()}</span>}
      </div>
      {r.imagenes.length>0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {r.imagenes.map((img,i) => (
            <a key={i} href={img} target="_blank" rel="noopener noreferrer">
              <img src={img} className="w-16 h-16 object-cover rounded-xl border-2 border-gray-200 hover:border-orange-400 transition cursor-pointer" alt="" />
            </a>
          ))}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {r.estado!=="aprobado"  && <button onClick={onAprobar}  className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition">APROBAR</button>}
        {r.estado!=="rechazado" && <button onClick={onRechazar} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition">RECHAZAR</button>}
        <button onClick={onEliminar} className="px-4 py-2 bg-gray-200 text-black rounded-xl text-sm font-bold hover:bg-gray-300 transition">ELIMINAR</button>
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 bg-white">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-orange-500 animate-spin mx-auto mb-4" style={{borderTopColor:"#FF6600"}} />
          <p className="font-bold text-black text-base tracking-widest">CARGANDO CATÁLOGO B2B...</p>
        </div>
      </div>
    );

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div className="p-6 bg-white min-h-screen">

      {/* ─── HEADER ─── */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{background:"linear-gradient(135deg,#FF6600,#F6FA00)"}}>📱</div>
            <div>
              <h1 className="text-3xl font-black text-black uppercase tracking-tight leading-none">GESTIÓN DE CATÁLOGO</h1>
              <p className="text-sm font-bold mt-0.5" style={{color:"#FF6600"}}>Venta Mayorista B2B — Celulares Nuevos Sellados</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-16">
            <span className="text-xs font-semibold text-gray-500">{filtrados.length} mostrados / {productos.length} total</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full text-black" style={{background:"#F6FA00"}}>NUEVOS SELLADOS</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{background:"#000"}}>MÍN. 5 UNIDADES</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={()=>setMStats(true)} className="px-4 py-2.5 rounded-xl font-bold text-sm border-2 border-black text-black hover:bg-black hover:text-white transition-all">ESTADÍSTICAS</button>
          <button onClick={()=>{setMResenas(true);cargarResenas();}} className="relative px-4 py-2.5 rounded-xl font-bold text-sm border-2 border-black text-black hover:bg-black hover:text-white transition-all">
            RESEÑAS {stats.resenasPendientes>0&&<span className="absolute -top-2 -right-2 text-white text-xs font-black px-1.5 py-0.5 rounded-full" style={{background:"#FF6600"}}>{stats.resenasPendientes}</span>}
          </button>
          <button onClick={()=>setMImportar(true)} className="px-4 py-2.5 rounded-xl font-bold text-sm text-black hover:opacity-90 transition-all border-2" style={{background:"#28FB4B",borderColor:"#28FB4B"}}>📤 IMPORTAR EXCEL</button>
          <button onClick={exportarCSV} className="px-4 py-2.5 rounded-xl font-bold text-sm border-2 border-black text-black hover:bg-black hover:text-white transition-all">EXPORTAR CSV</button>
          <button onClick={()=>setEditando({sku:"",nombre_producto:"",precio_unitario:0,precio_caja:0,unidades_por_caja:10,pedido_minimo:5,stock_cajas:0,stock_minimo_cajas:2,stock_minimo_unidades:10,moneda:"PEN",estado:"Activo",garantia_meses:12,peso_kg:0,destacado:false,en_oferta:false,en_oferta_unidad:false,sim:"Doble SIM física (2 ranuras nano-SIM)"})}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-black shadow-lg transition-all hover:opacity-90"
            style={{background:"linear-gradient(135deg,#FF6600,#F6FA00)",boxShadow:"0 4px 20px rgba(255,102,0,0.3)"}}>
            + AGREGAR CELULAR
          </button>
        </div>
      </div>

      {/* ─── STATS ─── */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          {l:"TOTAL SKUs",v:stats.totalProductos,s:`${stats.productosActivos} activos`,c:"#FF6600",bg:"#fff8f5"},
          {l:"VALOR STOCK",v:`S/ ${stats.totalValorStock.toLocaleString("es-PE",{maximumFractionDigits:0})}`,s:"en cajas",c:"#000",bg:"#f5fff7"},
          {l:"STOCK CRÍTICO",v:stats.cajasStockCritico,s:`${stats.cajasSinStock} sin stock`,c:"#9851F9",bg:"#faf5ff"},
          {l:"OFERTAS",v:stats.enOferta,s:`${stats.enOfertaUnidad} unidad`,c:"#FF6600",bg:"#fffbf0"},
          {l:"RESEÑAS",v:stats.totalResenas,s:`${stats.resenasPendientes} pendientes`,c:"#000",bg:"#f5f5f5"},
        ].map((s,i)=>(
          <div key={i} className="rounded-2xl border-2 border-gray-100 p-4 hover:shadow-md transition-shadow" style={{background:s.bg}}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{color:s.c}}>{s.l}</p>
            <p className="text-2xl font-black text-black">{s.v}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">{s.s}</p>
          </div>
        ))}
      </div>

      {/* ─── ALERTAS ─── */}
      {alertas.length>0&&(
        <div className="mb-6 space-y-2">
          {alertas.map((a,i)=>(
            <div key={i} className={`p-4 rounded-xl flex items-center justify-between border-2 ${a.tipo==="error"?"bg-red-50 border-red-300":a.tipo==="warning"?"border-yellow-400":"bg-blue-50 border-blue-200"}`} style={a.tipo==="warning"?{background:"#fffde7",borderColor:"#F6FA00"}:{}}>
              <div className="flex items-center gap-3">
                <span>{a.tipo==="error"?"🔴":a.tipo==="warning"?"⚠️":"🔵"}</span>
                <span className={`font-bold text-sm ${a.tipo==="error"?"text-red-700":a.tipo==="warning"?"text-yellow-900":"text-blue-700"}`}>{a.mensaje}</span>
              </div>
              <button onClick={()=>{setFiltrados(a.productos);setTotalPags(Math.ceil(a.productos.length/porPag));}} className="text-xs text-white px-3 py-1.5 rounded-lg font-bold hover:opacity-80 transition" style={{background:"#000"}}>VER</button>
            </div>
          ))}
        </div>
      )}

      {/* ─── FILTROS ─── */}
      <div className="bg-white p-5 rounded-2xl border-2 border-gray-100 mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">FILTROS</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]"><label className={LBL}>Buscar</label><input className={INP} placeholder="Nombre, SKU, marca..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} /></div>
          <div className="w-52"><label className={LBL}>Categoría</label><select className={INP} value={fCateg} onChange={e=>setFCateg(e.target.value)}><option value="">Todas</option>{CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div className="w-40"><label className={LBL}>Marca</label><select className={INP} value={fMarca} onChange={e=>setFMarca(e.target.value)}><option value="">Todas</option>{Array.from(new Set([...Object.values(MARCAS).flat(),...productos.map(p=>p.marca).filter(Boolean)])).sort().map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          <div className="w-36"><label className={LBL}>Estado</label><select className={INP} value={fEstado} onChange={e=>setFEstado(e.target.value)}><option value="">Todos</option><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
          <div className="w-36"><label className={LBL}>Stock</label><select className={INP} value={fStock} onChange={e=>setFStock(e.target.value)}><option value="">Todos</option><option value="critico">Crítico</option><option value="agotado">Agotado</option><option value="disponible">Disponible</option></select></div>
          <button onClick={()=>{setBusqueda("");setFCateg("");setFMarca("");setFEstado("");setFStock("");}} className="px-4 py-3 rounded-xl font-bold text-sm border-2 border-gray-200 text-gray-600 hover:border-black hover:text-black transition-all h-[46px]">LIMPIAR</button>
        </div>
      </div>

      {/* ─── TABLA ─── */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{background:"#000"}}>
                {["CELULAR / SKU","ESPECIFICACIONES","PRECIOS B2B","STOCK","PED. MÍN.","ESTADO","RESEÑAS","ACCIONES"].map(h=>(
                  <th key={h} className="p-4 text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagActual().map(p => {
                const sb = stockBadge(p.stock_cajas,p.stock_minimo_cajas);
                const pCaja = p.en_oferta&&p.precio_oferta_caja ? p.precio_oferta_caja : p.precio_caja;
                const pUnit = p.en_oferta_unidad&&p.precio_oferta_unidad ? p.precio_oferta_unidad : p.precio_unitario;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <ProductImage src={p.imagen_principal} alt={p.nombre_producto||"Celular"} />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-black text-sm leading-tight">{p.nombre_producto||"Sin nombre"}</span>
                            {p.destacado&&<span className="text-xs px-2 py-0.5 rounded-full font-bold text-black" style={{background:"#F6FA00"}}>DEST.</span>}
                            {p.en_oferta&&<span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{background:"#FF6600"}}>OFERTA</span>}
                          </div>
                          <p className="text-xs font-mono text-gray-400 mt-0.5">SKU: {p.sku||"—"}</p>
                          <p className="text-xs font-bold mt-0.5" style={{color:"#FF6600"}}>{p.marca} {p.modelo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex gap-1 flex-wrap">
                          {p.capacidad_almacenamiento&&<span className="text-xs bg-black text-white px-2 py-0.5 rounded font-bold">{p.capacidad_almacenamiento}</span>}
                          {p.capacidad_ram&&<span className="text-xs px-2 py-0.5 rounded font-bold text-black border" style={{background:"#F6FA00",borderColor:"#e8ec00"}}>RAM {p.capacidad_ram}</span>}
                        </div>
                        {p.color&&<p className="text-xs font-medium text-gray-600">{p.color}</p>}
                        {p.sistema_operativo&&<p className="text-xs font-medium text-gray-500">{p.sistema_operativo}</p>}
                        {p.sim&&<p className="text-xs font-medium" style={{color:"#9851F9"}}>SIM: {p.sim}</p>}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-sm" style={{color:"#FF7300"}}>S/ {(pCaja||0).toFixed(2)}</p>
                      <p className="text-xs font-medium text-gray-500">caja / {p.unidades_por_caja||0} uds</p>
                      {pUnit>0&&<p className="text-xs font-bold mt-1" style={{color:"#FF7300"}}>S/ {pUnit.toFixed(2)} / ud</p>}
                    </td>
                    <td className="p-4">
                      <span className={`text-sm px-3 py-1.5 rounded-xl font-bold ${sb.cls}`}>{p.stock_cajas||0} cajas</span>
                      <p className="text-xs font-medium text-gray-500 mt-1">{(p.stock_cajas||0)*(p.unidades_por_caja||0)} uds</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xl font-black text-black">{p.pedido_minimo||5}</span>
                      <p className="text-xs font-medium text-gray-400">uds mín</p>
                    </td>
                    <td className="p-4">
                      <button onClick={()=>toggleEstado(p.id,p.estado)} className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${p.estado==="Activo"?"bg-green-100 text-green-800 border-green-300 hover:bg-green-200":"bg-red-100 text-red-800 border-red-300 hover:bg-red-200"}`}>
                        {p.estado==="Activo"?"ACTIVO":"INACTIVO"}
                      </button>
                    </td>
                    <td className="p-4">
                      <button onClick={()=>cargarResenasPorProducto(p.id,p.nombre_producto||"",p.sku||"")} className="flex flex-col items-center p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <div className="flex items-center gap-0.5">
                          <span className="text-sm font-black text-black">{p.rating_promedio?.toFixed(1)||"0.0"}</span>
                          <span style={{color:"#F6FA00",WebkitTextStroke:"1px #ccc"}} className="text-sm">★</span>
                        </div>
                        <span className="text-xs font-medium text-gray-400">{p.total_resenas||0} reseñas</span>
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <button onClick={()=>{setProdSel(p);setMPrevia(true);}} title="Vista previa" className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition">👁</button>
                        <button onClick={()=>duplicar(p)} title="Duplicar" className="w-8 h-8 flex items-center justify-center bg-black hover:bg-gray-800 rounded-lg text-white text-sm transition">⧉</button>
                        <button onClick={()=>cargarResenasPorProducto(p.id,p.nombre_producto||"",p.sku||"")} title="Reseñas" className="w-8 h-8 flex items-center justify-center rounded-lg text-black text-sm transition" style={{background:"#F6FA00"}}>★</button>
                        <button onClick={()=>{ setPreciosVolumenActivo(false); setEscalasUnidad([{cantidad:5,precio:0},{cantidad:10,precio:0},{cantidad:20,precio:0},{cantidad:50,precio:0}]); setEscalasCaja([{cantidad:1,precio:0},{cantidad:3,precio:0},{cantidad:5,precio:0},{cantidad:10,precio:0}]); setEditando(p); }} title="Editar" className="w-8 h-8 flex items-center justify-center rounded-lg text-white text-sm transition hover:opacity-80" style={{background:"#FF6600"}}>✏</button>
                        <button onClick={()=>eliminar(p.id)} title="Eliminar" className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm transition">✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtrados.length===0&&(
            <div className="text-center py-20">
              <div className="text-7xl mb-4">📱</div>
              <p className="font-black text-black text-xl uppercase">Sin resultados</p>
            </div>
          )}
        </div>
        {/* PAGINACIÓN */}
        <div className="bg-gray-50 px-5 py-4 border-t-2 border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select className="bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-black focus:outline-none" value={porPag} onChange={e=>cambiarPorPag(Number(e.target.value))}>
              {[10,25,50,100].map(n=><option key={n} value={n}>{n} por página</option>)}
            </select>
            <span className="text-sm font-medium text-gray-500">{(pagina-1)*porPag+1}–{Math.min(pagina*porPag,filtrados.length)} de {filtrados.length}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setPagina(p=>Math.max(p-1,1))} disabled={pagina===1} className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:border-black transition">ANT.</button>
            {Array.from({length:Math.min(5,totalPags)},(_,i)=>{
              const pg = totalPags<=5?i+1:pagina<=3?i+1:pagina>=totalPags-2?totalPags-4+i:pagina-2+i;
              return <button key={i} onClick={()=>setPagina(pg)} className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${pagina===pg?"text-black":"bg-white border-2 border-gray-200 hover:border-black text-black"}`} style={pagina===pg?{background:"#F6FA00",border:"2px solid #e8ec00"}:{}}>{pg}</button>;
            })}
            <button onClick={()=>setPagina(p=>Math.min(p+1,totalPags))} disabled={pagina===totalPags||totalPags===0} className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm font-bold disabled:opacity-40 hover:border-black transition">SIG.</button>
          </div>
        </div>
      </div>

      {/* ════════ MODAL IMPORTACIÓN ════════ */}
      {mImportar&&(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto border-2 border-gray-100">
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-100">
              <div><h2 className="text-2xl font-black text-black uppercase">IMPORTACIÓN MASIVA B2B</h2><p className="text-sm font-medium text-gray-400 mt-1">Sube 50, 100 o 1000 productos en segundos</p></div>
              <button onClick={()=>{setMImportar(false);setArchivoExcel(null);setPreviewData([]);}} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl font-black text-black flex items-center justify-center">✕</button>
            </div>
            <div className="mb-6 p-6 rounded-2xl border-2" style={{background:"#fffde7",borderColor:"#F6FA00"}}>
              <h3 className="font-bold text-black text-sm mb-3">📋 INSTRUCCIONES</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Descarga la plantilla Excel</li><li>Completa los datos de tus productos</li>
                <li>Guarda el archivo como Excel o CSV</li><li>Súbelo y previsualiza</li>
                <li>Los precios por volumen se calculan automáticamente</li>
              </ol>
              <button onClick={descargarPlantilla} className="mt-4 px-6 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition" style={{background:"#000"}}>📥 DESCARGAR PLANTILLA</button>
            </div>
            <div className="mb-6">
              <label className={LBL}>SELECCIONAR ARCHIVO</label>
              <input type="file" accept=".xlsx,.xls,.csv" className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm" onChange={async e=>{const f=e.target.files?.[0];if(f){setArchivoExcel(f);await procesarArchivo(f);}}} />
            </div>
            {previewData.length>0&&(
              <div className="mb-6">
                <h3 className="font-bold text-black text-lg mb-3">VISTA PREVIA ({previewData.length} productos)</h3>
                <div className="max-h-60 overflow-y-auto border-2 border-gray-200 rounded-xl">
                  <table className="w-full text-left"><thead className="bg-gray-100 sticky top-0"><tr>{["FILA","SKU","NOMBRE","MARCA","PRECIO","STOCK","ESTADO"].map(h=><th key={h} className="p-2 text-xs font-bold">{h}</th>)}</tr></thead>
                    <tbody>{previewData.map((item,i)=><tr key={i} className={item.valido?"bg-white":"bg-red-50"}><td className="p-2 text-xs font-bold">{item.fila}</td><td className="p-2 text-xs">{item.sku}</td><td className="p-2 text-xs">{item.nombre}</td><td className="p-2 text-xs">{item.marca}</td><td className="p-2 text-xs font-bold">S/ {item.precio_caja}</td><td className="p-2 text-xs">{item.stock}</td><td className="p-2">{item.valido?<span className="text-green-700 text-xs font-bold">✅ VÁLIDO</span>:<span className="text-red-600 text-xs font-bold" title={item.errores.join(", ")}>❌ ERROR</span>}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}
            {importando&&<div className="mb-6 p-4 rounded-xl border-2" style={{background:"#e8f5e9",borderColor:"#28FB4B"}}><p className="font-bold text-green-900 mb-2">IMPORTANDO... {progresoImport}%</p><div className="w-full bg-gray-200 rounded-full h-4"><div className="h-4 rounded-full transition-all" style={{width:`${progresoImport}%`,background:"#28FB4B"}} /></div></div>}
            <div className="flex gap-3">
              <button onClick={importarProductos} disabled={!archivoExcel||previewData.filter(p=>p.valido).length===0||importando} className="flex-1 py-4 rounded-2xl font-bold text-base disabled:opacity-50 text-black" style={{background:"#28FB4B"}}>{importando?"IMPORTANDO...":"🚀 IMPORTAR PRODUCTOS"}</button>
              <button onClick={()=>{setMImportar(false);setArchivoExcel(null);setPreviewData([]);}} className="flex-1 py-4 bg-gray-100 text-black rounded-2xl font-bold border-2 border-gray-200">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL RESEÑAS GLOBAL ════════ */}
      {mResenas&&(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col border-2 border-gray-100" style={{maxHeight:"90vh"}}>
            {/* Header fijo */}
            <div className="flex justify-between items-center p-8 pb-4 border-b-2 border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-black text-black uppercase">GESTIÓN DE RESEÑAS</h2>
                <p className="text-sm font-medium text-gray-400 mt-1">{resenas.length} reseñas — {stats.resenasPendientes} pendientes</p>
              </div>
              <button onClick={()=>{setMResenas(false);setTabResena("todas");}} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl font-black text-black flex items-center justify-center">✕</button>
            </div>
            {/* Tabs */}
            <div className="flex gap-2 px-8 py-3 border-b border-gray-100 flex-shrink-0">
              {[
                {id:"todas",label:`Todas (${resenas.length})`},
                {id:"pendiente",label:`Pendientes (${resenas.filter(r=>r.estado==="pendiente").length})`},
                {id:"aprobado",label:`Aprobadas (${resenas.filter(r=>r.estado==="aprobado").length})`},
                {id:"rechazado",label:`Rechazadas (${resenas.filter(r=>r.estado==="rechazado").length})`},
              ].map(t=>(
                <button key={t.id} onClick={()=>setTabResena(t.id)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all"
                  style={tabResena===t.id?{background:"#FF6600",borderColor:"#FF6600",color:"#fff"}:{background:"#fff",borderColor:"#e5e7eb",color:"#374151"}}>
                  {t.label}
                </button>
              ))}
            </div>
            {/* Contenido scrolleable */}
            <div className="overflow-y-auto flex-1 p-8 pt-4">
              {resenasFiltradas.length===0
                ? <div className="text-center py-16"><p className="font-black text-xl text-black uppercase">Sin reseñas en esta categoría</p></div>
                : resenasFiltradas.map(r=>(
                  <ResenaCard key={r.id} r={r}
                    onAprobar={()=>aprobarResena(r)}
                    onRechazar={()=>rechazarResena(r)}
                    onEliminar={()=>eliminarResena(r)}
                  />
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL RESEÑAS POR PRODUCTO ════════ */}
      {mResenaProd&&prodRSel&&(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col border-2 border-gray-100" style={{maxHeight:"90vh"}}>
            <div className="flex justify-between items-center p-8 pb-4 border-b-2 border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-lg font-black text-black uppercase">RESEÑAS: {prodRSel.nombre_producto}</h2>
                <p className="text-sm font-medium text-gray-400">SKU: {prodRSel.sku} — {resenasAct.length} reseñas</p>
                {resenasAct.length>0&&(
                  <div className="flex items-center gap-2 mt-1">
                    <Stars rating={Math.round(resenasAct.reduce((s,r)=>s+r.rating,0)/resenasAct.length)} />
                    <span className="text-xs font-bold">{(resenasAct.reduce((s,r)=>s+r.rating,0)/resenasAct.length).toFixed(1)} promedio</span>
                  </div>
                )}
              </div>
              <button onClick={()=>{setMResenaProd(false);setProdRSel(null);setResenasAct([]);setTabResena("todas");}} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl font-black text-black flex items-center justify-center">✕</button>
            </div>
            {/* Tabs */}
            <div className="flex gap-2 px-8 py-3 border-b border-gray-100 flex-shrink-0">
              {[
                {id:"todas",label:`Todas (${resenasAct.length})`},
                {id:"pendiente",label:`Pendientes (${resenasAct.filter(r=>r.estado==="pendiente").length})`},
                {id:"aprobado",label:`Aprobadas (${resenasAct.filter(r=>r.estado==="aprobado").length})`},
              ].map(t=>(
                <button key={t.id} onClick={()=>setTabResena(t.id)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all"
                  style={tabResena===t.id?{background:"#FF6600",borderColor:"#FF6600",color:"#fff"}:{background:"#fff",borderColor:"#e5e7eb",color:"#374151"}}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto flex-1 p-8 pt-4">
              {resenasActFiltradas.length===0
                ? <div className="text-center py-12"><p className="font-black text-black text-xl">Sin reseñas</p></div>
                : resenasActFiltradas.map(r=>(
                  <ResenaCard key={r.id} r={r}
                    onAprobar={()=>aprobarResena(r)}
                    onRechazar={()=>rechazarResena(r)}
                    onEliminar={()=>eliminarResena(r)}
                  />
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ════════ VISTA PREVIA — FIX: scrolleable completa ════════ */}
      {mPrevia&&prodSel&&(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* ✅ FIX: flex+flex-col+max-h+overflow-y-auto en el contenedor del contenido */}
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border-2 border-gray-100 flex flex-col" style={{maxHeight:"90vh"}}>
            {/* Header fijo */}
            <div className="p-6 flex justify-between items-center flex-shrink-0 rounded-t-3xl" style={{background:"linear-gradient(135deg,#FF6600,#F6FA00)"}}>
              <div>
                <h2 className="text-xl font-black text-black uppercase">VISTA PREVIA B2B</h2>
                <p className="text-sm font-bold text-black/70">Nuevo Sellado — Solo PEN — Venta Mayorista</p>
              </div>
              <button onClick={()=>setMPrevia(false)} className="w-10 h-10 bg-black/20 hover:bg-black/30 rounded-xl font-black text-black flex items-center justify-center">✕</button>
            </div>
            {/* Contenido SCROLLEABLE */}
            <div className="overflow-y-auto flex-1 p-6">
              <div className="flex gap-6 mb-6">
                <div className="flex-shrink-0">
                  <ProductImage src={prodSel.imagen_principal} alt={prodSel.nombre_producto} />
                  {/* Galería adicional */}
                  {prodSel.imagenes_adicionales && prodSel.imagenes_adicionales.length>0&&(
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {prodSel.imagenes_adicionales.slice(0,4).map((img,i)=>(
                        <img key={i} src={img} alt="" className="w-12 h-12 rounded-lg object-contain border-2 border-gray-200 p-0.5 bg-white" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-black">{prodSel.nombre_producto||"Sin nombre"}</h3>
                  <p className="text-xs font-mono font-medium text-gray-400">SKU: {prodSel.sku}</p>
                  {prodSel.marca&&<p className="text-sm font-bold mt-1" style={{color:"#FF6600"}}>{prodSel.marca} {prodSel.modelo}</p>}
                  {prodSel.color&&<p className="text-xs font-medium text-gray-500 mt-0.5">Color: {prodSel.color}</p>}
                </div>
              </div>

              {prodSel.descripcion_corta&&<p className="text-sm text-gray-600 font-medium mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">{prodSel.descripcion_corta}</p>}

              {/* Precios */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-100">
                  <p className="text-xs font-bold uppercase text-gray-500 mb-1">PRECIO POR CAJA</p>
                  <p className="text-2xl font-black text-black">S/ {(prodSel.en_oferta&&prodSel.precio_oferta_caja?prodSel.precio_oferta_caja:prodSel.precio_caja)?.toFixed(2)||"0.00"}</p>
                  {prodSel.en_oferta&&prodSel.precio_oferta_caja&&<p className="text-xs text-gray-400 line-through">S/ {prodSel.precio_caja?.toFixed(2)}</p>}
                  <p className="text-xs font-medium text-gray-500">{prodSel.unidades_por_caja||0} unidades/caja</p>
                </div>
                <div className="p-4 rounded-xl border-2" style={{background:"#fffde7",borderColor:"#F6FA00"}}>
                  <p className="text-xs font-bold uppercase mb-1" style={{color:"#a89000"}}>PEDIDO MÍNIMO</p>
                  <p className="text-2xl font-black text-black">{prodSel.pedido_minimo||5}</p>
                  <p className="text-xs font-medium" style={{color:"#a89000"}}>unidades requeridas</p>
                </div>
              </div>

              {prodSel.precio_unitario>0&&(
                <div className="mb-4 p-3 rounded-xl border-2" style={{background:"#f5f0ff",borderColor:"#9851F9"}}>
                  <p className="text-xs font-bold uppercase mb-1" style={{color:"#9851F9"}}>PRECIO POR UNIDAD</p>
                  <p className="text-xl font-black text-black">S/ {(prodSel.en_oferta_unidad&&prodSel.precio_oferta_unidad?prodSel.precio_oferta_unidad:prodSel.precio_unitario).toFixed(2)}</p>
                </div>
              )}

              {/* Precios por volumen */}
              {prodSel.precios_volumen&&(
                <div className="mb-4 p-4 rounded-xl border-2" style={{background:"#f5f0ff",borderColor:"#9851F9"}}>
                  <p className="text-xs font-bold uppercase mb-3" style={{color:"#9851F9"}}>PRECIOS POR VOLUMEN</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">UNIDADES (precio c/u)</p>
                      {prodSel.precios_volumen.unidad?.map((e,i)=>(
                        <div key={i} className="flex justify-between text-sm py-0.5"><span className="text-gray-600">{e.cantidad}+ uds:</span><span className="font-bold">S/ {e.precio}</span></div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">CAJAS (precio por caja)</p>
                      {prodSel.precios_volumen.caja?.map((e,i)=>(
                        <div key={i} className="flex justify-between text-sm py-0.5"><span className="text-gray-600">{e.cantidad}+ cajas:</span><span className="font-bold">S/ {e.precio}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Specs */}
              <div className="flex gap-2 flex-wrap mb-4">
                {prodSel.capacidad_almacenamiento&&<span className="bg-black text-white px-2 py-1 rounded-lg font-bold text-sm">{prodSel.capacidad_almacenamiento}</span>}
                {prodSel.capacidad_ram&&<span className="px-2 py-1 rounded-lg font-bold text-black border text-sm" style={{background:"#F6FA00",borderColor:"#e8ec00"}}>RAM {prodSel.capacidad_ram}</span>}
                {prodSel.sistema_operativo&&<span className="bg-gray-100 text-black px-2 py-1 rounded-lg font-medium border border-gray-200 text-sm">{prodSel.sistema_operativo}</span>}
                {prodSel.procesador&&<span className="bg-gray-100 text-black px-2 py-1 rounded-lg font-medium border border-gray-200 text-sm">{prodSel.procesador}</span>}
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-lg font-medium border border-green-200 text-sm">Garantía: {prodSel.garantia_meses||0}m</span>
                <span className="px-2 py-1 rounded-lg font-medium border text-black text-sm" style={{background:"#F6FA00",borderColor:"#e8ec00"}}>Stock: {prodSel.stock_cajas||0} cajas</span>
              </div>

              {/* Specs detalle */}
              {(prodSel.tamano_pantalla||prodSel.bateria_mah||prodSel.camara_principal||prodSel.conectividad||prodSel.sim)&&(
                <div className="grid grid-cols-2 gap-2 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="col-span-2 text-xs font-bold uppercase text-gray-500 mb-1">ESPECIFICACIONES</p>
                  {prodSel.tamano_pantalla&&<div><span className="text-xs text-gray-500">Pantalla:</span><span className="text-xs font-bold ml-1">{prodSel.tamano_pantalla}</span></div>}
                  {prodSel.bateria_mah&&<div><span className="text-xs text-gray-500">Batería:</span><span className="text-xs font-bold ml-1">{prodSel.bateria_mah}</span></div>}
                  {prodSel.camara_principal&&<div><span className="text-xs text-gray-500">Cámara:</span><span className="text-xs font-bold ml-1">{prodSel.camara_principal}</span></div>}
                  {prodSel.conectividad&&<div><span className="text-xs text-gray-500">Conectividad:</span><span className="text-xs font-bold ml-1">{prodSel.conectividad}</span></div>}
                  {prodSel.sim&&<div className="col-span-2"><span className="text-xs text-gray-500">SIM:</span><span className="text-xs font-bold ml-1" style={{color:"#9851F9"}}>{prodSel.sim}</span></div>}
                </div>
              )}

              {/* Rating */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <Stars rating={Math.round(prodSel.rating_promedio||0)} size={16} />
                <span className="text-sm font-bold">{prodSel.rating_promedio?.toFixed(1)||"0.0"}</span>
                <span className="text-sm font-medium text-gray-400">({prodSel.total_resenas||0} reseñas)</span>
                <button onClick={()=>{setMPrevia(false);cargarResenasPorProducto(prodSel.id,prodSel.nombre_producto||"",prodSel.sku||"");}} className="ml-auto text-xs font-bold px-3 py-1.5 rounded-lg" style={{background:"#F6FA00",color:"#000"}}>Ver reseñas →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ ESTADÍSTICAS ════════ */}
      {mStats&&(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl p-8 border-2 border-gray-100 overflow-y-auto" style={{maxHeight:"90vh"}}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-100">
              <div><h2 className="text-2xl font-black text-black uppercase">ESTADÍSTICAS B2B</h2><p className="text-sm font-bold mt-1" style={{color:"#FF6600"}}>Celulares Nuevos Sellados</p></div>
              <button onClick={()=>setMStats(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl font-black text-black flex items-center justify-center">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                {l:"TOTAL SKUs",v:stats.totalProductos,s:`${stats.productosActivos} activos`,c:"#FF6600",bg:"#fff8f5"},
                {l:"VALOR STOCK",v:`S/ ${stats.totalValorStock.toLocaleString("es-PE",{maximumFractionDigits:0})}`,s:"en cajas",c:"#000",bg:"#f5fff7"},
                {l:"STOCK CRÍTICO",v:stats.cajasStockCritico,s:`${stats.cajasSinStock} sin stock`,c:"#9851F9",bg:"#f5f0ff"},
                {l:"RESEÑAS",v:stats.totalResenas,s:`${stats.resenasPendientes} pendientes`,c:"#FF6600",bg:"#fffde7"},
              ].map((s,i)=>(
                <div key={i} className="p-5 rounded-2xl border-2 border-gray-100" style={{background:s.bg}}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{color:s.c}}>{s.l}</p>
                  <p className="text-2xl font-black text-black">{s.v}</p>
                  <p className="text-xs font-medium text-gray-400 mt-1">{s.s}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-5 rounded-2xl border-2 border-gray-100">
                <h3 className="font-bold text-black text-sm uppercase tracking-wider mb-4">POR CATEGORÍA</h3>
                {CATEGORIAS.map(cat=>{
                  const n=productos.filter(p=>p.categoria_id===cat).length;
                  const pct=stats.totalProductos>0?(n/stats.totalProductos*100).toFixed(1):"0";
                  return n>0&&<div key={cat} className="mb-3"><div className="flex justify-between text-sm mb-1"><span className="font-medium text-black">{cat}</span><span className="font-bold">{n} ({pct}%)</span></div><div className="w-full bg-gray-200 rounded-full h-2.5"><div className="h-2.5 rounded-full" style={{width:`${pct}%`,background:"linear-gradient(90deg,#FF6600,#F6FA00)"}} /></div></div>;
                })}
              </div>
              <div className="bg-gray-50 p-5 rounded-2xl border-2 border-gray-100">
                <h3 className="font-bold text-black text-sm uppercase tracking-wider mb-4">ACCIONES RÁPIDAS</h3>
                <div className="space-y-2">
                  {[
                    {icon:"📥",label:"EXPORTAR CATÁLOGO CSV",action:()=>{setMStats(false);exportarCSV();}},
                    {icon:"🖨",label:"IMPRIMIR LISTA DE PRECIOS",action:()=>{setMStats(false);imprimirCatalogo();}},
                    {icon:"📤",label:"IMPORTACIÓN MASIVA EXCEL",action:()=>{setMStats(false);setMImportar(true);}},
                    {icon:"★",label:`RESEÑAS (${stats.resenasPendientes} pendientes)`,action:()=>{setMStats(false);setMResenas(true);cargarResenas();}},
                    {icon:"📋",label:"HISTORIAL DE CAMBIOS",action:()=>{setMStats(false);setMHistorial(true);}},
                  ].map((item,i)=>(
                    <button key={i} onClick={item.action} className="w-full p-3 bg-white rounded-xl border-2 border-gray-200 text-left font-bold text-sm hover:border-black hover:bg-gray-50 flex items-center gap-3 transition-all text-black">
                      <span className="text-lg">{item.icon}</span>{item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ HISTORIAL ════════ */}
      {mHistorial&&(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl p-8 border-2 border-gray-100 overflow-y-auto" style={{maxHeight:"90vh"}}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-100">
              <h2 className="text-2xl font-black text-black uppercase">HISTORIAL DE CAMBIOS</h2>
              <button onClick={()=>setMHistorial(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl font-black text-black flex items-center justify-center">✕</button>
            </div>
            {historial.length===0
              ? <p className="text-center font-black text-black py-8 uppercase">Sin historial</p>
              : historial.map((h,i)=>(
                <div key={h.id||i} className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200 mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div><p className="font-bold text-black">{h.producto_nombre||"Producto"}</p><p className="text-xs font-medium text-gray-400">{fFecha(h.fecha)}</p></div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold border ${h.accion==="creacion"?"bg-green-100 text-green-800 border-green-300":h.accion==="actualizacion"?"text-yellow-900 border-yellow-400":"bg-red-100 text-red-800 border-red-300"}`} style={h.accion==="actualizacion"?{background:"#fffde7"}:{}}>{(h.accion||"cambio").toUpperCase()}</span>
                  </div>
                  <div className="text-sm text-black bg-white p-3 rounded-xl border-2 border-gray-100 space-y-1">
                    <p><span className="font-bold">Campo:</span> {h.campo||"—"}</p>
                    <p><span className="font-bold">Anterior:</span> <span className="text-gray-400">{h.valor_anterior||"vacío"}</span></p>
                    <p><span className="font-bold">Nuevo:</span> <span className="font-bold" style={{color:"#FF6600"}}>{h.valor_nuevo||"vacío"}</span></p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL AGREGAR / EDITAR CELULAR
      ════════════════════════════════════════ */}
      {editando&&(
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col border-2 border-gray-100" style={{maxHeight:"90vh"}}>
            {/* Header fijo */}
            <div className="flex justify-between items-center p-8 pb-4 border-b-2 border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-xl font-black text-black uppercase tracking-tight">{editando.id?"EDITAR CELULAR":"REGISTRAR NUEVO CELULAR"}</h2>
                <div className="flex gap-2 mt-1.5">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-black" style={{background:"#F6FA00"}}>NUEVO SELLADO</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{background:"#000"}}>VENTA B2B</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-black bg-gray-100 border border-gray-300">S/ PEN</span>
                </div>
              </div>
              <button onClick={()=>{setEditando(null);setNuevaImg(null);setImgsAdd([]);setNuevoDoc(null);setPreciosVolumenActivo(false);}} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl font-black text-black flex items-center justify-center">✕</button>
            </div>

            {/* Form scrolleable */}
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleGuardar} className="p-8 pt-4 space-y-4">

                {/* 1. IMÁGENES */}
                <div className="p-6 rounded-2xl border-2" style={{borderColor:"#FF6600",background:"#fff8f5"}}>
                  <h3 className="text-sm font-bold uppercase text-black mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-black flex items-center justify-center text-xs font-black" style={{background:"#F6FA00"}}>1</span>
                    IMÁGENES
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className={LBL}>Imagen Principal</label>
                      <input type="file" accept="image/*" className="text-sm text-black w-full" onChange={e=>setNuevaImg(e.target.files?.[0]||null)} />
                      {editando.imagen_principal&&!nuevaImg&&<div className="mt-3 flex items-center gap-3"><ProductImage src={editando.imagen_principal} alt={editando.nombre_producto||""} /><span className="text-xs font-medium text-gray-400">IMAGEN ACTUAL</span></div>}
                    </div>
                    <div>
                      <label className={LBL}>Imágenes Adicionales</label>
                      <input type="file" accept="image/*" multiple className="text-sm text-black w-full" onChange={e=>setImgsAdd(e.target.files?Array.from(e.target.files):[])} />
                      {imgsAdd.length>0&&<p className="mt-2 text-xs font-bold text-green-700">{imgsAdd.length} IMÁGENES LISTAS</p>}
                    </div>
                  </div>
                  <div className="mt-4"><label className={LBL}>Ficha Técnica PDF (opcional)</label><input type="file" accept=".pdf" className="text-sm text-black" onChange={e=>setNuevoDoc(e.target.files?.[0]||null)} /></div>
                </div>

                {/* 2. IDENTIFICACIÓN */}
                <div className="p-6 rounded-2xl border-2" style={{borderColor:"#000",background:"#fafafa"}}>
                  <h3 className="text-sm font-bold uppercase text-black mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-black flex items-center justify-center text-xs font-black" style={{background:"#F6FA00"}}>2</span>
                    IDENTIFICACIÓN
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="col-span-2"><label className={LBL}>Nombre del Producto <span style={{color:"#FF6600"}}>*</span></label><input className={INP} value={editando.nombre_producto||""} placeholder="Samsung Galaxy A55 5G 256GB Negro" onChange={e=>setEditando({...editando,nombre_producto:e.target.value,slug:slugify(e.target.value)})} required /></div>
                    <div><label className={LBL}>SKU <span style={{color:"#FF6600"}}>*</span></label><input className={INP+" uppercase"} value={editando.sku||""} placeholder="SAM-A55-256-NEG" onChange={e=>setEditando({...editando,sku:e.target.value.toUpperCase()})} required /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div><label className={LBL}>Categoría <span style={{color:"#FF6600"}}>*</span></label><select className={INP} value={editando.categoria_id||""} required onChange={e=>setEditando({...editando,categoria_id:e.target.value,marca:""})}><option value="">Seleccionar...</option>{CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label className={LBL}>Marca <span style={{color:"#FF6600"}}>*</span></label><select className={INP} value={editando.marca||""} required disabled={!editando.categoria_id} onChange={e=>setEditando({...editando,marca:e.target.value})}><option value="">Seleccionar...</option>{marcasDisp.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
                    <div><label className={LBL}>Modelo</label><input className={INP} value={editando.modelo||""} placeholder="Galaxy A55 5G" onChange={e=>setEditando({...editando,modelo:e.target.value})} /></div>
                  </div>
                  <div><label className={LBL}>Descripción Mayorista</label><textarea rows={2} className={INP} value={editando.descripcion_corta||""} placeholder="Lote con caja sellada, garantía de fábrica..." onChange={e=>setEditando({...editando,descripcion_corta:e.target.value})} /></div>
                </div>

                {/* 3. SPECS */}
                <div className="p-6 rounded-2xl border-2 border-gray-200" style={{background:"#fafafa"}}>
                  <h3 className="text-sm font-bold uppercase text-black mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-black flex items-center justify-center text-xs font-black" style={{background:"#F6FA00"}}>3</span>
                    ESPECIFICACIONES TÉCNICAS
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {[{lbl:"Almacenamiento",key:"capacidad_almacenamiento",opts:ALMACENAMIENTO},{lbl:"RAM",key:"capacidad_ram",opts:RAM_OPTIONS},{lbl:"Color",key:"color",opts:COLORES}].map(f=>(
                      <div key={f.key}><label className={LBL}>{f.lbl}</label><select className={INP} value={(editando as any)[f.key]||""} onChange={e=>setEditando({...editando,[f.key]:e.target.value})}><option value="">Seleccionar...</option>{f.opts.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div><label className={LBL}>Sistema Operativo</label><select className={INP} value={editando.sistema_operativo||""} onChange={e=>setEditando({...editando,sistema_operativo:e.target.value})}><option value="">Seleccionar...</option>{editando.marca&&SO_OPCIONES_POR_MARCA[editando.marca]?SO_OPCIONES_POR_MARCA[editando.marca].map(so=><option key={so} value={so}>{so}</option>):["Android","iOS","HarmonyOS"].map(so=><option key={so} value={so}>{so}</option>)}</select></div>
                    <div><label className={LBL}>Versión SO</label><input className={INP} value={editando.version_so||""} placeholder="Android 14 / iOS 17" onChange={e=>setEditando({...editando,version_so:e.target.value})} /></div>
                    <div><label className={LBL}>Procesador</label><input className={INP} value={editando.procesador||""} placeholder="Snapdragon 695" onChange={e=>setEditando({...editando,procesador:e.target.value})} /></div>
                    <div><label className={LBL}>Pantalla</label><input className={INP} value={editando.tamano_pantalla||""} placeholder='6.6" AMOLED 120Hz' onChange={e=>setEditando({...editando,tamano_pantalla:e.target.value})} /></div>
                    <div><label className={LBL}>Resolución</label><input className={INP} value={editando.resolucion_pantalla||""} placeholder="2340 x 1080 px" onChange={e=>setEditando({...editando,resolucion_pantalla:e.target.value})} /></div>
                    <div><label className={LBL}>Batería</label><input className={INP} value={editando.bateria_mah||""} placeholder="5000 mAh + 25W" onChange={e=>setEditando({...editando,bateria_mah:e.target.value})} /></div>
                    <div><label className={LBL}>Cámara Trasera</label><input className={INP} value={editando.camara_principal||""} placeholder="50MP + 12MP + 5MP" onChange={e=>setEditando({...editando,camara_principal:e.target.value})} /></div>
                    <div><label className={LBL}>Cámara Frontal</label><input className={INP} value={editando.camara_frontal||""} placeholder="32 MP" onChange={e=>setEditando({...editando,camara_frontal:e.target.value})} /></div>
                    <div><label className={LBL}>Conectividad</label><input className={INP} value={editando.conectividad||""} placeholder="5G, WiFi 6, BT 5.3, NFC" onChange={e=>setEditando({...editando,conectividad:e.target.value})} /></div>
                    <div className="col-span-3"><label className={LBL}>Tipo de SIM</label><select className={INP} value={editando.sim||"Doble SIM física (2 ranuras nano-SIM)"} onChange={e=>setEditando({...editando,sim:e.target.value})}>{SIM_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                  </div>
                  <div><label className={LBL}>Notas técnicas</label><textarea rows={3} className={INP+" font-mono"} value={editando.especificaciones_tecnicas||""} placeholder={"- Resistencia: IP67\n- Carga rápida: 45W"} onChange={e=>setEditando({...editando,especificaciones_tecnicas:e.target.value})} /></div>
                </div>

                {/* 4. PRECIOS */}
                <div className="p-6 rounded-2xl border-2" style={{borderColor:"#FF6600",background:"#fff8f5"}}>
                  <h3 className="text-sm font-bold uppercase text-black mb-1 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-black flex items-center justify-center text-xs font-black" style={{background:"#F6FA00"}}>4</span>
                    PRECIOS MAYORISTAS — S/ PEN
                  </h3>
                  <p className="text-sm font-medium mb-4" style={{color:"#FF6600"}}>Todos los precios en Soles Peruanos.</p>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-4 rounded-xl border-2" style={{borderColor:"#FF6600"}}>
                      <p className="text-sm font-bold uppercase tracking-wide mb-3" style={{color:"#FF6600"}}>PRECIO POR CAJA</p>
                      <div className="space-y-3">
                        <div><label className={LBL}>Precio de Caja (S/) <span style={{color:"#FF6600"}}>*</span></label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-black text-sm">S/</span><input type="number" step="0.01" min="0" className={INP+" pl-9"} value={editando.precio_caja||""} placeholder="0.00" required onChange={e=>setEditando({...editando,precio_caja:Number(e.target.value)})} /></div></div>
                        <div><label className={LBL}>Unidades por Caja <span style={{color:"#FF6600"}}>*</span></label><input type="number" min="1" className={INP} value={editando.unidades_por_caja||""} placeholder="10" required onChange={e=>setEditando({...editando,unidades_por_caja:Number(e.target.value)})} /></div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                      <p className="text-sm font-bold uppercase tracking-wide text-gray-600 mb-3">PRECIO UNITARIO Y PEDIDO MÍNIMO</p>
                      <div className="space-y-3">
                        <div><label className={LBL}>Precio por Unidad (S/)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-black text-sm">S/</span><input type="number" step="0.01" min="0" className={INP+" pl-9"} value={editando.precio_unitario||""} placeholder="0.00" onChange={e=>setEditando({...editando,precio_unitario:Number(e.target.value)})} /></div></div>
                        <div><label className={LBL}>Pedido Mínimo B2B <span style={{color:"#FF6600"}}>*</span></label><select className={INP} value={editando.pedido_minimo||5} onChange={e=>setEditando({...editando,pedido_minimo:Number(e.target.value)})}>{PEDIDO_MIN_OPT.map(n=><option key={n} value={n}>{n} unidades mínimo</option>)}</select></div>
                      </div>
                    </div>
                  </div>
                  {/* Precios por volumen */}
                  <div className="p-4 rounded-xl border-2" style={{background:"#f5f0ff",borderColor:"#9851F9"}}>
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5" checked={preciosVolumenActivo} onChange={e=>setPreciosVolumenActivo(e.target.checked)} style={{accentColor:"#9851F9"}} />
                      <div><span className="font-bold text-black text-sm block">ACTIVAR PRECIOS POR VOLUMEN</span><span className="text-xs font-medium text-gray-600">Se calculan automáticamente al cambiar precios base</span></div>
                    </label>
                    {preciosVolumenActivo&&(
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-bold mb-3" style={{color:"#9851F9"}}>PRECIOS POR UNIDAD</p>
                          <div className="space-y-2">
                            {escalasUnidad.map((escala,i)=>(
                              <div key={i} className="flex gap-2 items-center">
                                <input type="number" className="w-20 p-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold" value={escala.cantidad} onChange={e=>actualizarEscalaUnidad(i,"cantidad",Number(e.target.value))} />
                                <span className="text-sm font-bold">uds → S/</span>
                                <input type="number" className="w-24 p-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold" value={escala.precio} onChange={e=>actualizarEscalaUnidad(i,"precio",Number(e.target.value))} />
                                {i>0&&<button type="button" onClick={()=>eliminarEscalaUnidad(i)} className="text-red-500 text-sm font-bold">✕</button>}
                              </div>
                            ))}
                            <button type="button" onClick={agregarEscalaUnidad} className="text-sm font-bold mt-2" style={{color:"#9851F9"}}>+ Agregar escala</button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold mb-3" style={{color:"#9851F9"}}>PRECIOS POR CAJA</p>
                          <div className="space-y-2">
                            {escalasCaja.map((escala,i)=>(
                              <div key={i} className="flex gap-2 items-center">
                                <input type="number" className="w-20 p-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold" value={escala.cantidad} onChange={e=>actualizarEscalaCaja(i,"cantidad",Number(e.target.value))} />
                                <span className="text-sm font-bold">cajas → S/</span>
                                <input type="number" className="w-24 p-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold" value={escala.precio} onChange={e=>actualizarEscalaCaja(i,"precio",Number(e.target.value))} />
                                {i>0&&<button type="button" onClick={()=>eliminarEscalaCaja(i)} className="text-red-500 text-sm font-bold">✕</button>}
                              </div>
                            ))}
                            <button type="button" onClick={agregarEscalaCaja} className="text-sm font-bold mt-2" style={{color:"#9851F9"}}>+ Agregar escala</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. INVENTARIO CAJAS */}
                <div className="p-6 rounded-2xl border-2" style={{borderColor:"#000",background:"#fafafa"}}>
                  <h3 className="text-sm font-bold uppercase text-black mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-black flex items-center justify-center text-xs font-black" style={{background:"#F6FA00"}}>5</span>
                    INVENTARIO EN CAJAS
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className={LBL}>Stock Actual (cajas) <span style={{color:"#FF6600"}}>*</span></label><input type="number" min="0" className={INP} value={editando.stock_cajas??""} placeholder="0" required onChange={e=>setEditando({...editando,stock_cajas:Number(e.target.value)})} />{editando.stock_cajas!==undefined&&editando.unidades_por_caja&&<p className="text-xs font-bold mt-1" style={{color:"#FF6600"}}>= {editando.stock_cajas*editando.unidades_por_caja} unidades</p>}</div>
                    <div><label className={LBL}>Stock Mínimo (cajas)</label><input type="number" min="0" className={INP} value={editando.stock_minimo_cajas??2} onChange={e=>setEditando({...editando,stock_minimo_cajas:Number(e.target.value)})} /></div>
                    <div><label className={LBL}>Garantía (meses)</label><input type="number" min="0" className={INP} value={editando.garantia_meses??12} onChange={e=>setEditando({...editando,garantia_meses:Number(e.target.value)})} /></div>
                    <div><label className={LBL}>Peso por Caja (kg)</label><input type="number" step="0.01" min="0" className={INP} value={editando.peso_kg??""} placeholder="2.5" onChange={e=>setEditando({...editando,peso_kg:Number(e.target.value)})} /></div>
                    <div><label className={LBL}>Dimensiones de la Caja</label><input className={INP} value={editando.dimensiones||""} placeholder="35 x 25 x 20 cm" onChange={e=>setEditando({...editando,dimensiones:e.target.value})} /></div>
                  </div>
                </div>

                {/* 6. INVENTARIO UNIDADES */}
                <div className="p-6 rounded-2xl border-2" style={{borderColor:"#28FB4B",background:"#f0fff4"}}>
                  <h3 className="text-sm font-bold uppercase text-black mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-black flex items-center justify-center text-xs font-black" style={{background:"#28FB4B"}}>6</span>
                    INVENTARIO EN UNIDADES
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={LBL}>Stock Actual (unidades)</label>
                      <input type="number" min="0" className={INP} value={editando.stock_unidades!==undefined?editando.stock_unidades:(editando.stock_cajas||0)*(editando.unidades_por_caja||1)} placeholder="0" onChange={e=>setEditando({...editando,stock_unidades:Number(e.target.value)})} />
                      {editando.unidades_por_caja&&editando.stock_cajas?<p className="text-xs font-bold mt-1" style={{color:"#1a9930"}}>De cajas: {editando.stock_cajas}×{editando.unidades_por_caja}={editando.stock_cajas*editando.unidades_por_caja} uds</p>:null}
                    </div>
                    <div><label className={LBL}>Stock Mínimo (unidades)</label><input type="number" min="0" className={INP} value={editando.stock_minimo_unidades??10} onChange={e=>setEditando({...editando,stock_minimo_unidades:Number(e.target.value)})} /></div>
                    <div className="p-4 rounded-xl border-2" style={{borderColor:"#28FB4B",background:"#e8fff0"}}>
                      <p className="text-xs font-bold uppercase mb-2" style={{color:"#1a9930"}}>RESUMEN</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Cajas:</span><span className="font-black">{editando.stock_cajas||0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Uds/caja:</span><span className="font-black">{editando.unidades_por_caja||0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Sueltas:</span><span className="font-black">{editando.stock_unidades||0}</span></div>
                        <div className="h-px bg-green-200 my-1" />
                        <div className="flex justify-between"><span className="font-bold">Total:</span><span className="font-black" style={{color:"#1a9930"}}>{(editando.stock_cajas||0)*(editando.unidades_por_caja||0)+(editando.stock_unidades||0)} uds</span></div>
                      </div>
                    </div>
                    <div><label className={LBL}>Dimensiones Unidad</label><input className={INP} value={editando.dimensiones_unidad||""} placeholder="16 x 8 x 1.5 cm" onChange={e=>setEditando({...editando,dimensiones_unidad:e.target.value} as any)} /></div>
                  </div>
                </div>

                {/* 7. PROMOCIONES */}
                <div className="p-6 rounded-2xl border-2 border-gray-200" style={{background:"#fafafa"}}>
                  <h3 className="text-sm font-bold uppercase text-black mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-black flex items-center justify-center text-xs font-black" style={{background:"#F6FA00"}}>7</span>
                    PROMOCIONES MAYORISTAS
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <label className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-200 cursor-pointer hover:border-yellow-400 transition-colors">
                      <input type="checkbox" className="w-5 h-5" style={{accentColor:"#F6FA00"}} checked={editando.destacado||false} onChange={e=>setEditando({...editando,destacado:e.target.checked})} />
                      <div><span className="font-bold text-black text-sm block">PRODUCTO DESTACADO</span><span className="text-xs font-medium text-gray-400">Aparece primero en el catálogo</span></div>
                    </label>
                    <label className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-200 cursor-pointer hover:border-orange-400 transition-colors">
                      <input type="checkbox" className="w-5 h-5" style={{accentColor:"#FF6600"}} checked={editando.en_oferta||false} onChange={e=>setEditando({...editando,en_oferta:e.target.checked})} />
                      <div><span className="font-bold text-black text-sm block">PRECIO ESPECIAL EN CAJA</span><span className="text-xs font-medium text-gray-400">Activa precio mayorista por caja</span></div>
                    </label>
                    <label className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-200 cursor-pointer hover:border-green-400 transition-colors">
                      <input type="checkbox" className="w-5 h-5" style={{accentColor:"#28FB4B"}} checked={editando.en_oferta_unidad||false} onChange={e=>setEditando({...editando,en_oferta_unidad:e.target.checked})} />
                      <div><span className="font-bold text-black text-sm block">PRECIO ESPECIAL POR UNIDAD</span><span className="text-xs font-medium text-gray-400">Activa precio mayorista por unidad</span></div>
                    </label>
                  </div>
                  {editando.en_oferta&&(
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border-2 mb-4" style={{background:"#fff8f5",borderColor:"#FF6600"}}>
                      <div><label className={LBL}>Precio Oferta por Caja (S/)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-black text-sm">S/</span><input type="number" step="0.01" min="0" className={INP+" pl-9"} value={editando.precio_oferta_caja||""} placeholder="0.00" onChange={e=>setEditando({...editando,precio_oferta_caja:Number(e.target.value)})} /></div></div>
                      <div><label className={LBL}>Fecha Fin de Oferta</label><input type="date" className={INP} value={editando.fecha_oferta_fin?(typeof editando.fecha_oferta_fin==="object"&&typeof(editando.fecha_oferta_fin as any)?.toDate==="function"?(editando.fecha_oferta_fin as any).toDate().toISOString().split("T")[0]:new Date(editando.fecha_oferta_fin as any).toISOString().split("T")[0]):"" } onChange={e=>setEditando({...editando,fecha_oferta_fin:new Date(e.target.value)})} /></div>
                    </div>
                  )}
                  {editando.en_oferta_unidad&&(
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border-2" style={{background:"#f0fff4",borderColor:"#28FB4B"}}>
                      <div><label className={LBL}>Precio Oferta por Unidad (S/)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-black text-sm">S/</span><input type="number" step="0.01" min="0" className={INP+" pl-9"} value={editando.precio_oferta_unidad||""} placeholder="0.00" onChange={e=>setEditando({...editando,precio_oferta_unidad:Number(e.target.value)})} /></div></div>
                      <div><label className={LBL}>Fecha Fin de Oferta</label><input type="date" className={INP} value={editando.fecha_oferta_fin?(typeof editando.fecha_oferta_fin==="object"&&typeof(editando.fecha_oferta_fin as any)?.toDate==="function"?(editando.fecha_oferta_fin as any).toDate().toISOString().split("T")[0]:new Date(editando.fecha_oferta_fin as any).toISOString().split("T")[0]):"" } onChange={e=>setEditando({...editando,fecha_oferta_fin:new Date(e.target.value)})} /></div>
                    </div>
                  )}
                </div>

                {/* 8. SEO */}
                <div className="p-6 rounded-2xl border-2 border-gray-200" style={{background:"#fafafa"}}>
                  <h3 className="text-sm font-bold uppercase text-black mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-black flex items-center justify-center text-xs font-black" style={{background:"#F6FA00"}}>8</span>
                    SEO Y URL
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div><label className={LBL}>Slug (URL)</label><input className={INP+" font-mono"} value={editando.slug||slugify(editando.nombre_producto||"")} placeholder="samsung-galaxy-a55..." onChange={e=>setEditando({...editando,slug:e.target.value})} /></div>
                    <div><label className={LBL}>Meta Título</label><input className={INP} value={editando.meta_titulo||editando.nombre_producto||""} placeholder="Título para buscadores" onChange={e=>setEditando({...editando,meta_titulo:e.target.value})} /></div>
                    <div><label className={LBL}>Meta Descripción</label><textarea rows={2} className={INP} value={editando.meta_descripcion||editando.descripcion_corta||""} placeholder="Descripción para buscadores" onChange={e=>setEditando({...editando,meta_descripcion:e.target.value})} /></div>
                  </div>
                </div>

                {/* ESTADO + BOTONES */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border-2 border-gray-200">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-bold text-black">Estado:</label>
                    <select className="p-2.5 bg-white border-2 border-gray-200 rounded-xl font-semibold text-sm text-black focus:outline-none" value={editando.estado||"Activo"} onChange={e=>setEditando({...editando,estado:e.target.value})}>
                      <option value="Activo">ACTIVO — Visible en catálogo</option>
                      <option value="Inactivo">INACTIVO — Oculto</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loadingUpload}
                    className="flex-1 py-4 rounded-2xl font-black text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{background:loadingUpload?"#ccc":"linear-gradient(135deg,#FF6600,#F6FA00)",color:"#000",boxShadow:loadingUpload?"none":"0 4px 20px rgba(255,102,0,0.3)"}}>
                    {loadingUpload?"GUARDANDO...":(editando.id?"✅ ACTUALIZAR CELULAR":"✅ REGISTRAR CELULAR")}
                  </button>
                  <button type="button" onClick={()=>{setEditando(null);setNuevaImg(null);setImgsAdd([]);setNuevoDoc(null);setPreciosVolumenActivo(false);}} className="flex-1 bg-gray-100 text-black py-4 rounded-2xl font-bold text-base hover:bg-gray-200 transition-all border-2 border-gray-200">CANCELAR</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}