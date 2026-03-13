"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import {
  doc, getDoc, collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, updateDoc, arrayUnion,
  increment, setDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  Star, Truck, ShoppingCart, ArrowLeft, Share2, Send, Check,
  Facebook, MessageSquare, Lock, Shield, Package, Award, X,
  ChevronLeft, ChevronRight, User, AlertCircle, Camera, Sparkles,
  TrendingUp, Users, Heart, BadgeCheck, FileText, Tag, Scale,
  Box, Calendar, Layers, ZoomIn, RotateCw, Plus, Minus,
  Heart as HeartIcon, Bot, ChevronDown, ChevronUp, Loader2,
  ThumbsUp, ThumbsDown, Grid, List, Download, ExternalLink
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

/* ─── TIPOS ─── */
interface EscalaPrecio   { cantidad: number; precio: number; }
interface PreciosVolumen { unidad: EscalaPrecio[]; caja: EscalaPrecio[]; }

interface Producto {
  id: string; sku: string; nombre_producto: string;
  descripcion_corta: string; categoria_id: string;
  marca: string; modelo: string; color: string;
  capacidad_almacenamiento: string; capacidad_ram: string;
  sistema_operativo: string; procesador: string;
  especificaciones_tecnicas: string | Record<string, string>;
  unidad_venta: string;
  precio_caja: number; precio_unitario: number;
  precio_oferta_caja: number | null; precio_oferta_unidad: number | null;
  en_oferta: boolean; en_oferta_unidad: boolean;
  precios_volumen?: PreciosVolumen;
  stock_cajas: number; stock_unidades: number;
  unidades_por_caja: number; pedido_minimo: number; stock_minimo_cajas: number;
  moneda: string; peso_kg: number; dimensiones: string;
  garantia_meses: number; imagen_principal: string;
  documento_ficha: string; estado: string;
  imagenes?: string[];
  rating_promedio?: number; total_resenas?: number; destacado?: boolean;
}

interface Resena {
  id: string; usuario: string; usuarioEmail: string;
  usuarioId: string; usuarioFoto: string | null;
  comentario: string; rating: number; imagenes: string[];
  fecha: any; verificado: boolean; util: number;
}

interface ChatMessage {
  id: string; text: string; sender: 'user' | 'ai';
  timestamp: Date; helpful?: boolean;
}

/* ─── HELPER TIEMPO RELATIVO ─── */
const getRelativeTime = (date: Date): string => {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return "ahora mismo";
  if (diff < 3600) return `${Math.floor(diff/60)} min`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h`;
  const d = Math.floor(diff/86400);
  if (d < 7) return `${d} día${d>1?'s':''}`;
  return date.toLocaleDateString('es-PE');
};

/* ─── ZOOM DE IMAGEN ─── */
const ImageZoom = ({ src, alt }: { src: string; alt: string }) => {
  const [isZoomed, setIsZoomed]       = useState(false);
  const [position, setPosition]       = useState({ x: 0, y: 0 });
  const containerRef                  = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    setPosition({ x: ((e.clientX - left) / width) * 100, y: ((e.clientY - top) / height) * 100 });
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl group">
      <div ref={containerRef} className="relative overflow-hidden cursor-zoom-in"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}>
        <img src={src} alt={alt}
          className={`w-full h-full object-contain transition-transform duration-300 ${isZoomed ? 'scale-150' : 'scale-100'}`}
          style={{ transformOrigin: `${position.x}% ${position.y}%` }} />
        {isZoomed && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
            <ZoomIn size={14} /><span>Zoom 2x</span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/50 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
            <ZoomIn size={14} /><span>Zoom</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── 360° ─── */
const ProductView360 = ({ images }: { images: string[] }) => {
  const [idx, setIdx]               = useState(0);
  const [autoRot, setAutoRot]       = useState(false);
  const intervalRef                 = useRef<NodeJS.Timeout | null>(null);

  const startAuto = () => {
    if (images.length <= 1) return;
    setAutoRot(true);
    intervalRef.current = setInterval(() => setIdx(p => (p + 1) % images.length), 100);
  };
  const stopAuto = () => {
    setAutoRot(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };
  const manual = (dir: 'prev'|'next') => {
    if (images.length <= 1) return;
    setIdx(p => dir === 'prev' ? (p === 0 ? images.length-1 : p-1) : (p === images.length-1 ? 0 : p+1));
  };
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  if (images.length <= 1) return <ImageZoom src={images[0]} alt="Producto" />;

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="relative aspect-square">
        <img src={images[idx]} alt={`Vista ${idx+1}`}
          className="w-full h-full object-contain transition-opacity duration-300" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <button onClick={() => manual('prev')}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2 transition-all">
            <ChevronLeft size={20} />
          </button>
          <button onClick={autoRot ? stopAuto : startAuto}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-white text-sm font-medium`}
            style={{ background: autoRot ? "#ef4444" : "#9851F9" }}>
            <RotateCw size={16} className={autoRot ? 'animate-spin' : ''} />
            {autoRot ? 'Detener' : 'Ver 360°'}
          </button>
          <button onClick={() => manual('next')}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2 transition-all">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs">
          {idx+1}/{images.length}
        </div>
      </div>
    </div>
  );
};

/* ─── SELECTOR TIPO COMPRA ─── */
const TipoCompraSelector = ({ tipo, setTipo, disabled = false }: {
  tipo: 'caja'|'unidad'; setTipo: (t: 'caja'|'unidad') => void; disabled?: boolean;
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-medium text-slate-300">Comprar por:</label>
    <div className="grid grid-cols-2 gap-2">
      {(['caja','unidad'] as const).map(t => (
        <button key={t} onClick={() => setTipo(t)} disabled={disabled}
          className={`py-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 border`}
          style={{
            background: tipo === t
              ? t === 'caja' ? "linear-gradient(135deg,#9851F9,#7c3aed)" : "linear-gradient(135deg,#7c3aed,#6d28d9)"
              : "rgba(255,255,255,0.05)",
            borderColor: tipo === t ? (t === 'caja' ? "#9851F9" : "#7c3aed") : "rgba(255,255,255,0.1)",
            color: tipo === t ? "#fff" : "#94a3b8",
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}>
          {t === 'caja' ? <Package size={16} /> : <Box size={16} />}
          {t === 'caja' ? 'Por Caja' : 'Por Unidad'}
        </button>
      ))}
    </div>
  </div>
);

/* ─── SELECTOR CANTIDAD ─── */
const QuantitySelector = ({ quantity, setQuantity, max, tipo, pedidoMinimo, disabled = false }: {
  quantity: number; setQuantity: (q: number) => void; max: number;
  tipo: 'caja'|'unidad'; unidadesPorCaja: number; pedidoMinimo: number; disabled?: boolean;
}) => {
  const maxReal  = Math.min(max, 100000);
  const minVal   = tipo === 'caja' ? 1 : pedidoMinimo;
  const step     = tipo === 'caja' ? 1 : 10;

  const inc = () => { if (quantity < maxReal) setQuantity(quantity + step); };
  const dec = () => { if (quantity > minVal) setQuantity(Math.max(minVal, quantity - step)); };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value);
    if (!isNaN(v) && v >= minVal && v <= maxReal) setQuantity(v);
    else if (e.target.value === '') setQuantity(minVal);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-300">
        Cantidad ({tipo === 'caja' ? 'cajas' : 'unidades'})
      </label>
      <div className="flex items-center border border-white/20 rounded-lg overflow-hidden">
        <button onClick={dec} disabled={disabled || quantity <= minVal}
          className="px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <Minus size={16} />
        </button>
        <input type="number" min={minVal} max={maxReal} value={quantity} onChange={onChange}
          disabled={disabled}
          className="w-24 text-center bg-transparent border-x border-white/20 py-2 text-sm font-medium focus:outline-none disabled:opacity-50" />
        <button onClick={inc} disabled={disabled || quantity >= maxReal}
          className="px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <Plus size={16} />
        </button>
      </div>
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>Mín: {minVal} {tipo === 'caja' ? 'cajas' : 'uds'}</span>
        <span>Máx: {maxReal}</span>
      </div>
      {tipo === 'unidad' && (
        <p className="text-[9px] mt-1" style={{ color: "#a78bfa" }}>
          * Múltiplos de 10 (mín {pedidoMinimo})
        </p>
      )}
    </div>
  );
};

/* ─── STARS ─── */
const StarRating = ({ rating, setRating, readonly = false, size = 20 }: {
  rating: number; setRating?: (r: number) => void; readonly?: boolean; size?: number;
}) => (
  <div className="flex gap-1">
    {[1,2,3,4,5].map(s => (
      <button key={s} type="button" onClick={() => !readonly && setRating && setRating(s)}
        className={`transition-transform ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
        disabled={readonly}>
        <Star size={size} className={rating >= s ? "text-amber-400 fill-amber-400" : "text-slate-700"} />
      </button>
    ))}
  </div>
);

/* ─── SUBIR FOTOS ─── */
const ImageUploader = ({ previewImages, imagenesReseña, handleImagenesReseña, eliminarImagenPreview }: {
  previewImages: string[]; imagenesReseña: File[];
  handleImagenesReseña: (e: React.ChangeEvent<HTMLInputElement>) => void;
  eliminarImagenPreview: (i: number) => void;
}) => {
  const totalSize = imagenesReseña.reduce((a, f) => a + f.size, 0);
  const maxSize   = 10 * 1024 * 1024;
  return (
    <div>
      <label className="block text-xs font-semibold mb-1 text-slate-300">Fotos (opcional)</label>
      {imagenesReseña.length > 0 && (
        <div className="mb-1.5">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Total: {(totalSize/1048576).toFixed(2)} MB</span>
            <span>Máx: 10MB</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.min((totalSize/maxSize)*100,100)}%`, background: "linear-gradient(90deg,#9851F9,#c084fc)" }} />
          </div>
        </div>
      )}
      {previewImages.length > 0 && (
        <div className="grid grid-cols-2 gap-1 mb-1.5">
          {previewImages.map((img, i) => (
            <div key={i} className="relative aspect-square rounded overflow-hidden bg-slate-800 group">
              <img src={img} className="w-full h-full object-cover" alt="" />
              <button type="button" onClick={() => eliminarImagenPreview(i)}
                className="absolute top-0.5 right-0.5 bg-red-500 hover:bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      {previewImages.length < 4 && (
        <label className="flex flex-col items-center justify-center gap-1 border border-dashed rounded p-3 cursor-pointer transition-all group"
          style={{ borderColor: "rgba(152,81,249,0.3)" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#9851F9")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(152,81,249,0.3)")}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(152,81,249,0.1)" }}>
            <Camera size={16} style={{ color: "#9851F9" }} />
          </div>
          <div className="text-center">
            <span className="text-xs font-medium text-slate-300 block">Subir fotos</span>
            <span className="text-[10px] text-slate-500">{previewImages.length}/4 • Máx 3MB c/u</span>
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImagenesReseña} className="hidden" />
        </label>
      )}
    </div>
  );
};

/* ─── CHATBOT IA ─── */
const ProductAIChatbot = ({ producto, language }: { producto: Producto; language: string }) => {
  const [isOpen,       setIsOpen]       = useState(false);
  const [isMinimized,  setIsMinimized]  = useState(false);
  const [messages,     setMessages]     = useState<ChatMessage[]>([{
    id: '1', sender: 'ai', timestamp: new Date(),
    text: `¡Hola! Soy tu asistente para ${producto.nombre_producto}. ¿En qué te ayudo?`
  }]);
  const [inputText,    setInputText]    = useState('');
  const [isLoading,    setIsLoading]    = useState(false);
  const [showFeedback, setShowFeedback] = useState<string|null>(null);
  const messagesEndRef                  = useRef<HTMLDivElement>(null);
  const textareaRef                     = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  const quickQs = [
    { text: "Especificaciones", q: "¿Cuáles son las especificaciones técnicas?" },
    { text: "Garantía",         q: "¿Cuántos meses de garantía tiene?" },
    { text: "Envío",            q: "¿Cuál es el tiempo de envío?" },
    { text: "Stock",            q: "¿Hay stock disponible?" },
  ];

  const getResponse = async (msg: string): Promise<string> => {
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    const m = msg.toLowerCase();
    const p = producto;
    if (m.includes('especificac') || m.includes('caracterí'))
      return `**Especificaciones de ${p.nombre_producto}:**\n\n• Almacenamiento: ${p.capacidad_almacenamiento||'N/A'}\n• RAM: ${p.capacidad_ram||'N/A'}\n• SO: ${p.sistema_operativo||'N/A'}\n• Procesador: ${p.procesador||'N/A'}\n• Color: ${p.color||'N/A'}`;
    if (m.includes('garantí'))
      return `**Garantía:** ${p.garantia_meses} meses de garantía de fábrica incluida.`;
    if (m.includes('envío') || m.includes('entrega'))
      return `**Envío B2B:** 24-48 horas hábiles para Lima y principales ciudades.`;
    if (m.includes('stock') || m.includes('disponib'))
      return `**Stock actual:** ${p.stock_cajas} cajas disponibles (${p.stock_cajas * p.unidades_por_caja} unidades).`;
    if (m.includes('precio'))
      return `**Precios B2B:**\n• Por caja: S/ ${p.precio_caja.toLocaleString('es-PE')}\n• Por unidad: S/ ${p.precio_unitario.toLocaleString('es-PE')}\n• Pedido mínimo: ${p.pedido_minimo} unidades`;
    return `Soy tu asistente para ${p.nombre_producto}. Pregúntame sobre especificaciones, garantía, envío, stock o precios.`;
  };

  const send = async () => {
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    setInputText('');
    setMessages(p => [...p, { id: Date.now().toString(), text, sender: 'user', timestamp: new Date() }]);
    setIsLoading(true);
    try {
      const res = await getResponse(text);
      setMessages(p => [...p, { id: (Date.now()+1).toString(), text: res, sender: 'ai', timestamp: new Date() }]);
    } catch {
      setMessages(p => [...p, { id: (Date.now()+1).toString(), text: 'Error al procesar. Intenta de nuevo.', sender: 'ai', timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  if (isMinimized) return (
    <button onClick={() => setIsMinimized(false)}
      className="fixed bottom-4 right-4 z-40 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 transition-all"
      style={{ background: "linear-gradient(135deg,#9851F9,#7c3aed)", boxShadow: "0 4px 20px rgba(152,81,249,0.4)" }}>
      <Bot size={20} />
      <span className="font-semibold text-sm">Asistente IA</span>
    </button>
  );

  return (
    <div className={`fixed right-4 bottom-4 z-50 transition-all duration-300 ${isOpen ? 'w-96' : 'w-72'}`}>
      <div className="rounded-xl shadow-2xl overflow-hidden border"
        style={{ background: "rgba(13,10,26,0.98)", borderColor: "rgba(152,81,249,0.3)" }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg,#9851F9,#7c3aed)" }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={20} className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2"
                style={{ borderColor: "#0d0a1a" }} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Asistente IA</h3>
              <p className="text-white/70 text-xs truncate max-w-[160px]">{producto.nombre_producto}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(true)} className="text-white/70 hover:text-white p-1 transition-colors" title="Minimizar">
              <ChevronDown size={18} />
            </button>
            <button onClick={() => setIsOpen(!isOpen)} className="text-white/70 hover:text-white p-1 transition-colors">
              {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <>
            {/* Mensajes */}
            <div className="h-72 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-wrap`}
                    style={{
                      background: msg.sender === 'user'
                        ? "linear-gradient(135deg,#9851F9,#7c3aed)"
                        : "rgba(255,255,255,0.06)",
                      border: msg.sender === 'ai' ? "1px solid rgba(152,81,249,0.2)" : "none",
                      color: "#e2e8f0",
                      borderRadius: msg.sender === 'user' ? "12px 12px 2px 12px" : "12px 12px 12px 2px"
                    }}>
                    {msg.text}
                    {msg.sender === 'ai' && msg.id !== '1' && showFeedback !== msg.id && (
                      <div className="mt-2 pt-2 flex gap-2" style={{ borderTop: "1px solid rgba(152,81,249,0.15)" }}>
                        <button onClick={() => setShowFeedback(msg.id)}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors"
                          style={{ background: "rgba(152,81,249,0.1)", color: "#a78bfa" }}>
                          <ThumbsUp size={10} /> Útil
                        </button>
                        <button onClick={() => setShowFeedback(msg.id)}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors"
                          style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}>
                          <ThumbsDown size={10} /> No
                        </button>
                      </div>
                    )}
                    {showFeedback === msg.id && (
                      <p className="text-[10px] mt-2" style={{ color: "#a78bfa" }}>¡Gracias por tu feedback!</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg p-3 flex items-center gap-2"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(152,81,249,0.2)" }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: "#9851F9" }} />
                    <span className="text-sm text-slate-300">Pensando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Preguntas rápidas */}
            <div className="px-4 pb-2">
              <p className="text-[10px] text-slate-500 mb-1.5">Preguntas rápidas:</p>
              <div className="flex flex-wrap gap-1">
                {quickQs.map((q, i) => (
                  <button key={i} onClick={() => setInputText(q.q)}
                    className="text-[10px] px-2 py-1 rounded-lg transition-colors text-slate-300 hover:text-white"
                    style={{ background: "rgba(152,81,249,0.08)", border: "1px solid rgba(152,81,249,0.2)" }}>
                    {q.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4" style={{ borderTop: "1px solid rgba(152,81,249,0.15)" }}>
              <div className="flex gap-2">
                <textarea ref={textareaRef} value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Escribe tu pregunta..."
                  className="flex-1 text-white placeholder-slate-400 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none max-h-24"
                  style={{ background: "rgba(152,81,249,0.06)", border: "1px solid rgba(152,81,249,0.2)" }}
                  rows={1} />
                <button onClick={send} disabled={!inputText.trim() || isLoading}
                  className="px-4 py-2 rounded-lg font-medium text-sm text-white disabled:opacity-40"
                  style={{ background: inputText.trim() && !isLoading ? "linear-gradient(135deg,#9851F9,#7c3aed)" : "rgba(255,255,255,0.05)" }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}

        {!isOpen && (
          <button onClick={() => setIsOpen(true)}
            className="w-full p-3 text-center hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
            <Bot size={16} style={{ color: "#9851F9" }} />
            <span className="text-sm font-medium text-slate-300">Chat con Asistente IA</span>
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── PRECIOS POR VOLUMEN (EXPANDIBLE + SELECCIONABLE) ─── */
const PreciosVolumenDisplay = ({
  preciosVolumen, tipo, precioCajaBase, precioUnidadBase,
  onSelectPrecio, precioSeleccionado
}: {
  preciosVolumen?: PreciosVolumen;
  tipo: 'caja'|'unidad';
  precioCajaBase: number;
  precioUnidadBase: number;
  onSelectPrecio: (precio: number, cantidad: number) => void;
  precioSeleccionado: number;
}) => {
  const [expanded, setExpanded] = useState(false);

  const escalas = tipo === 'caja'
    ? (preciosVolumen?.caja  || [])
    : (preciosVolumen?.unidad|| []);

  const precioBase = tipo === 'caja' ? precioCajaBase : precioUnidadBase;
  const unidad     = tipo === 'caja' ? 'caja' : 'ud';

  // Si no hay escalas definidas, generar estimadas
  const escalasEfectivas: EscalaPrecio[] = escalas.length > 0 ? escalas : (
    tipo === 'caja'
      ? [
          { cantidad: 1,  precio: precioCajaBase },
          { cantidad: 3,  precio: Math.round(precioCajaBase * 0.94) },
          { cantidad: 5,  precio: Math.round(precioCajaBase * 0.88) },
          { cantidad: 10, precio: Math.round(precioCajaBase * 0.82) },
        ]
      : [
          { cantidad: 5,  precio: precioUnidadBase },
          { cantidad: 10, precio: Math.round(precioUnidadBase * 0.95) },
          { cantidad: 20, precio: Math.round(precioUnidadBase * 0.90) },
          { cantidad: 50, precio: Math.round(precioUnidadBase * 0.85) },
        ]
  );

  return (
    <div className="rounded-xl overflow-hidden border"
      style={{ background: "rgba(152,81,249,0.06)", borderColor: "rgba(152,81,249,0.2)" }}>
      {/* Botón toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ color: "#c084fc" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(152,81,249,0.08)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
        <div className="flex items-center gap-2">
          <TrendingUp size={15} style={{ color: "#9851F9" }} />
          <span className="text-sm font-bold">Ver precios por volumen</span>
          {precioSeleccionado !== precioBase && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
              style={{ background: "#9851F9" }}>
              Precio aplicado
            </span>
          )}
        </div>
        <ChevronDown size={16}
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          style={{ color: "#9851F9" }} />
      </button>

      {/* Tabla expandible */}
      {expanded && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-400 mb-3">
            Haz clic en una fila para aplicar ese precio a tu pedido
          </p>
          <div className="space-y-2">
            {escalasEfectivas.map((escala, i) => {
              const isSelected  = precioSeleccionado === escala.precio;
              const descuento   = precioBase > 0
                ? Math.round((1 - escala.precio / precioBase) * 100)
                : 0;

              return (
                <button key={i} type="button"
                  onClick={() => onSelectPrecio(escala.precio, escala.cantidad)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all border text-left"
                  style={{
                    background: isSelected ? "rgba(152,81,249,0.18)" : "rgba(255,255,255,0.03)",
                    borderColor: isSelected ? "#9851F9" : "rgba(152,81,249,0.12)",
                    boxShadow: isSelected ? "0 0 0 1px rgba(152,81,249,0.4)" : "none"
                  }}>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: "#9851F9" }}>
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                    {!isSelected && (
                      <div className="w-4 h-4 rounded-full border"
                        style={{ borderColor: "rgba(152,81,249,0.3)" }} />
                    )}
                    <span className="text-sm text-gray-300">
                      {i < escalasEfectivas.length - 1
                        ? `${escala.cantidad} – ${escalasEfectivas[i+1].cantidad - 1} ${unidad}${escala.cantidad > 1 ? 's' : ''}`
                        : `${escala.cantidad}+ ${unidad}s`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {descuento > 0 && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(152,81,249,0.2)", color: "#a78bfa" }}>
                        -{descuento}%
                      </span>
                    )}
                    <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                      S/ {escala.precio.toLocaleString('es-PE')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-500 mt-3">
            * Precios sin IGV. Mínimo de compra: {tipo === 'caja' ? '1 caja' : `${escalasEfectivas[0]?.cantidad || 5} unidades`}
          </p>
        </div>
      )}
    </div>
  );
};

/* ─── FORMATEAR SPECS ─── */
const formatearEspecificaciones = (esp: string | Record<string, string>): string[] => {
  if (typeof esp === 'string') return esp.split('\n').map(l => l.trim()).filter(Boolean);
  if (typeof esp === 'object' && esp !== null)
    return Object.entries(esp).map(([k, v]) => `${k}: ${v}`);
  return [];
};

/* ═══════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════ */
export default function DetalleProducto() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const { agregarAlCarrito, carrito } = useCart();
  const { language }                  = useLanguage();

  const [producto,         setProducto]         = useState<Producto | null>(null);
  const [imgSeleccionada,  setImgSeleccionada]  = useState("");
  const [activeTab,        setActiveTab]         = useState("descripcion");
  const [agregado,         setAgregado]          = useState(false);
  const [showShareMenu,    setShowShareMenu]     = useState(false);
  const [loading,          setLoading]           = useState(true);
  const [currentUser,      setCurrentUser]       = useState<any>(null);

  const [reseñas,          setReseñas]           = useState<Resena[]>([]);
  const [nuevaReseña,      setNuevaReseña]       = useState("");
  const [puntuacion,       setPuntuacion]        = useState(5);
  const [enviando,         setEnviando]          = useState(false);
  const [imagenesReseña,   setImagenesReseña]    = useState<File[]>([]);
  const [previewImages,    setPreviewImages]     = useState<string[]>([]);
  const [uploadProgress,   setUploadProgress]   = useState(0);
  const [uploadStatus,     setUploadStatus]     = useState("");

  const [galleriaAbierta,       setGalleriaAbierta]       = useState(false);
  const [imagenGaleriaActual,   setImagenGaleriaActual]   = useState(0);
  const [todasImagenesReseñas,  setTodasImagenesReseñas]  = useState<string[]>([]);

  const [estadisticas, setEstadisticas] = useState({
    totalReseñas: 0, promedioRating: 5.0,
    distribucionRating: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  const [tipoCompra,         setTipoCompra]        = useState<'caja'|'unidad'>('caja');
  const [cantidad,           setCantidad]          = useState(1);
  const [precioSeleccionado, setPrecioSeleccionado]= useState(0);

  const [enWishlist,      setEnWishlist]      = useState(false);
  const [isView360,       setIsView360]       = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  /* ─── PRECIO ACTUAL BASE ─── */
  const getPrecioBase = useCallback(() => {
    if (!producto) return 0;
    if (tipoCompra === 'caja')
      return producto.en_oferta && producto.precio_oferta_caja
        ? producto.precio_oferta_caja : producto.precio_caja;
    return producto.en_oferta_unidad && producto.precio_oferta_unidad
      ? producto.precio_oferta_unidad : producto.precio_unitario;
  }, [producto, tipoCompra]);

  /* ─── SYNC precio seleccionado al cambiar tipo ─── */
  useEffect(() => { setPrecioSeleccionado(getPrecioBase()); }, [tipoCompra, producto]);

  const getStockActual = useCallback(() => {
    if (!producto) return 0;
    return tipoCompra === 'caja' ? producto.stock_cajas : producto.stock_unidades;
  }, [producto, tipoCompra]);

  const getPedidoMinimo = useCallback(() => {
    if (!producto) return 1;
    return tipoCompra === 'caja' ? 1 : producto.pedido_minimo;
  }, [producto, tipoCompra]);

  /* ─── AUTH ─── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      if (user && producto) checkWishlist(user.uid, producto.id);
    });
    return () => unsub();
  }, [producto]);

  const checkWishlist = async (uid: string, pid: string) => {
    try {
      const snap = await getDoc(doc(db, "usuarios", uid, "wishlist", pid));
      setEnWishlist(snap.exists() && snap.data()?.estado === "activo");
    } catch {}
  };

  const toggleWishlist = async () => {
    if (!currentUser) { alert("Inicia sesión para agregar a favoritos"); return; }
    if (!producto) return;
    setWishlistLoading(true);
    try {
      const ref = doc(db, "usuarios", currentUser.uid, "wishlist", producto.id);
      if (enWishlist) {
        await updateDoc(ref, { estado: "removido", fecha_actualizacion: serverTimestamp() });
        setEnWishlist(false);
      } else {
        await setDoc(ref, {
          producto_id: producto.id, sku: producto.sku, nombre: producto.nombre_producto,
          precio_caja: producto.precio_caja, precio_unitario: producto.precio_unitario,
          imagen: producto.imagen_principal, fecha_agregado: serverTimestamp(), estado: "activo"
        });
        setEnWishlist(true);
      }
    } catch { alert("Error al actualizar favoritos"); }
    finally { setWishlistLoading(false); }
  };

  /* ─── CARGAR PRODUCTO ─── */
  useEffect(() => {
    if (!id) { router.push("/catalogo"); return; }

    const load = async () => {
      try {
        const pid  = decodeURIComponent(id as string);
        const snap = await getDoc(doc(db, "productos", pid));
        if (snap.exists()) {
          const d = snap.data();
          const p: Producto = {
            id: snap.id,
            sku: d.sku || "", nombre_producto: d.nombre_producto || "",
            descripcion_corta: d.descripcion_corta || "", categoria_id: d.categoria_id || "",
            marca: d.marca || "", modelo: d.modelo || "", color: d.color || "",
            capacidad_almacenamiento: d.capacidad_almacenamiento || "",
            capacidad_ram: d.capacidad_ram || "", sistema_operativo: d.sistema_operativo || "",
            procesador: d.procesador || "", especificaciones_tecnicas: d.especificaciones_tecnicas || "",
            precio_caja:         Number(d.precio_caja)         || 0,
            precio_unitario:     Number(d.precio_unitario)     || 0,
            precio_oferta_caja:  d.precio_oferta_caja          || null,
            precio_oferta_unidad:d.precio_oferta_unidad        || null,
            en_oferta:           d.en_oferta                   || false,
            en_oferta_unidad:    d.en_oferta_unidad            || false,
            precios_volumen:     d.precios_volumen             || undefined,
            stock_cajas:         Number(d.stock_cajas)         || 0,
            stock_unidades:      Number(d.stock_unidades)      || 0,
            unidades_por_caja:   Number(d.unidades_por_caja)   || 10,
            pedido_minimo:       Number(d.pedido_minimo)       || 5,
            stock_minimo_cajas:  Number(d.stock_minimo_cajas)  || 2,
            moneda: d.moneda || "PEN", peso_kg: Number(d.peso_kg) || 0,
            dimensiones: d.dimensiones || "", garantia_meses: Number(d.garantia_meses) || 0,
            imagen_principal: d.imagen_principal || "", documento_ficha: d.documento_ficha || "",
            estado: d.estado || "Inactivo",
            imagenes: Array.isArray(d.imagenes_adicionales) ? d.imagenes_adicionales : [],
            rating_promedio: d.rating_promedio || 5.0, total_resenas: d.total_resenas || 0,
            destacado: d.destacado || false, unidad_venta: d.unidad_venta || ""
          };
          setProducto(p);
          setImgSeleccionada(p.imagen_principal);
          setPrecioSeleccionado(p.en_oferta && p.precio_oferta_caja ? p.precio_oferta_caja : p.precio_caja);
          if (currentUser) checkWishlist(currentUser.uid, p.id);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };

    const pid = decodeURIComponent(id as string);
    const q   = query(collection(db, "productos", pid, "reseñas"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, snap => {
      const data: Resena[] = snap.docs.map(d => ({
        id: d.id, usuario: d.data().usuario || "Usuario",
        usuarioEmail: d.data().usuarioEmail || "", usuarioId: d.data().usuarioId || "",
        usuarioFoto: d.data().usuarioFoto || null, comentario: d.data().comentario || "",
        rating: d.data().rating || 5, imagenes: Array.isArray(d.data().imagenes) ? d.data().imagenes : [],
        fecha: d.data().fecha, verificado: d.data().verificado || false, util: d.data().util || 0
      }));
      setReseñas(data);
      setTodasImagenesReseñas(data.flatMap(r => r.imagenes || []));
      calcularEstadisticas(data);
    });

    load();
    return () => unsub();
  }, [id, currentUser]);

  const calcularEstadisticas = (rs: Resena[]) => {
    if (rs.length === 0) {
      setEstadisticas({ totalReseñas: 0, promedioRating: 5.0, distribucionRating: { 5:0,4:0,3:0,2:0,1:0 } });
      return;
    }
    const suma = rs.reduce((a, r) => a + r.rating, 0);
    const dist = { 5:0, 4:0, 3:0, 2:0, 1:0 };
    rs.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating as keyof typeof dist]++; });
    setEstadisticas({ totalReseñas: rs.length, promedioRating: parseFloat((suma/rs.length).toFixed(1)), distribucionRating: dist });
  };

  /* ─── COMPRIMIR IMAGEN ─── */
  const comprimirImagen = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (file.size < 500 * 1024) { resolve(file); return; }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = evt => {
        const img = new Image();
        img.src = evt.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 1200;
          let { width, height } = img;
          if (width > height) { if (width > MAX) { height *= MAX/width; width = MAX; } }
          else                { if (height > MAX) { width *= MAX/height; height = MAX; } }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(blob => {
            if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            else reject(new Error('Error comprimiendo'));
          }, 'image/jpeg', 0.7);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const subirACloudinary = async (file: File): Promise<string> => {
    const cloudName   = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset= process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error('Cloudinary no configurado');
    const fd = new FormData();
    fd.append('file', file); fd.append('upload_preset', uploadPreset); fd.append('folder', 'product_reviews');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error((await res.json()).error?.message || 'Error subiendo');
    return (await res.json()).secure_url;
  };

  const subirImagenes = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    setUploadStatus("Subiendo imágenes...");
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        setUploadStatus(`Subiendo ${i+1}/${files.length}...`);
        const comp = await comprimirImagen(files[i]);
        urls.push(await subirACloudinary(comp));
        setUploadProgress(((i+1)/files.length)*100);
      } catch (e) { console.error(e); }
    }
    setUploadStatus("¡Listo!");
    return urls;
  };

  const handleImagenesReseña = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imagenesReseña.length > 4) { alert("Máximo 4 fotos"); e.target.value = ''; return; }
    const nuevoTotal = [...imagenesReseña, ...files].reduce((a, f) => a + f.size, 0);
    if (nuevoTotal > 10 * 1024 * 1024) { alert("Tamaño total máximo 10MB"); e.target.value = ''; return; }
    const nuevas: File[] = [];
    for (const f of files) {
      if (f.size > 3 * 1024 * 1024) { alert(`"${f.name}" supera 3MB`); continue; }
      if (!f.type.startsWith('image/')) { alert(`"${f.name}" no es imagen`); continue; }
      const comp = await comprimirImagen(f);
      nuevas.push(comp);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImages(p => [...p, reader.result as string]);
      reader.readAsDataURL(comp);
    }
    setImagenesReseña(p => [...p, ...nuevas]);
    e.target.value = '';
  };

  const eliminarImagenPreview = (i: number) => {
    setImagenesReseña(p => p.filter((_, j) => j !== i));
    setPreviewImages(p => p.filter((_, j) => j !== i));
  };

  const handleEnviarReseña = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaReseña.trim() || enviando) return;
    if (!currentUser) { alert("Inicia sesión para dejar una reseña"); return; }
    if (nuevaReseña.length < 10) { alert("Mínimo 10 caracteres"); return; }
    setEnviando(true); setUploadProgress(0); setUploadStatus("Preparando...");
    try {
      let imagenesUrls: string[] = [];
      if (imagenesReseña.length > 0) {
        try { imagenesUrls = await subirImagenes(imagenesReseña); }
        catch { if (!confirm("Error subiendo imágenes. ¿Continuar sin fotos?")) { setEnviando(false); setUploadStatus(""); return; } }
      }
      const pid = decodeURIComponent(id as string);
      await addDoc(collection(db, "productos", pid, "reseñas"), {
        usuario: currentUser.displayName || currentUser.email?.split('@')[0] || "Usuario",
        usuarioEmail: currentUser.email, usuarioId: currentUser.uid,
        usuarioFoto: currentUser.photoURL || null, comentario: nuevaReseña.trim(),
        rating: puntuacion, imagenes: imagenesUrls, fecha: serverTimestamp(),
        verificado: currentUser.emailVerified || false, util: 0, reportes: 0
      });
      await updateDoc(doc(db, "productos", pid), { total_resenas: increment(1), rating_promedio: increment(puntuacion) });
      setNuevaReseña(""); setPuntuacion(5); setImagenesReseña([]); setPreviewImages([]);
      setUploadProgress(0); setUploadStatus("");
      alert("✅ ¡Reseña publicada!");
    } catch { alert("❌ Error al enviar. Intenta de nuevo."); setUploadStatus(""); }
    finally { setEnviando(false); }
  };

  const marcarUtil = async (rid: string) => {
    if (!currentUser) { alert("Inicia sesión para marcar como útil"); return; }
    try {
      const pid = decodeURIComponent(id as string);
      await updateDoc(doc(db, "productos", pid, "reseñas", rid), {
        util: increment(1), usuariosUtil: arrayUnion(currentUser.uid)
      });
    } catch {}
  };

  /* ─── GALERÍA ─── */
  const abrirGaleria   = (i: number) => { setImagenGaleriaActual(i); setGalleriaAbierta(true); document.body.style.overflow = 'hidden'; };
  const cerrarGaleria  = ()          => { setGalleriaAbierta(false); document.body.style.overflow = 'auto'; };
  const navegarGaleria = (dir: 'prev'|'next') =>
    setImagenGaleriaActual(p =>
      dir === 'prev'
        ? (p === 0 ? todasImagenesReseñas.length-1 : p-1)
        : (p === todasImagenesReseñas.length-1 ? 0 : p+1)
    );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!galleriaAbierta) return;
      if (e.key === 'ArrowLeft')  navegarGaleria('prev');
      if (e.key === 'ArrowRight') navegarGaleria('next');
      if (e.key === 'Escape')     cerrarGaleria();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [galleriaAbierta, imagenGaleriaActual]);

  /* ─── CARRITO ─── */
  const handleAgregarAlCarrito = () => {
    if (!producto || getStockActual() <= 0) { alert("Sin stock"); return; }
    agregarAlCarrito({
      id: producto.id, nombre: producto.nombre_producto, sku: producto.sku,
      precioBase: precioSeleccionado, precio_caja: producto.precio_caja,
      precio_unitario: producto.precio_unitario, stock: getStockActual(),
      stock_cajas: producto.stock_cajas, stock_unidades: producto.stock_unidades,
      imagenUrl: producto.imagen_principal, imagen_principal: producto.imagen_principal,
      unidad_venta: producto.unidad_venta, tipoCompra, unidadesPorCaja: producto.unidades_por_caja
    }, cantidad, tipoCompra);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2500);
  };

  /* ─── DESCARGAR FICHA TÉCNICA ─── */
  const handleDescargarFicha = useCallback(async () => {
    if (!producto?.documento_ficha) return;
    try {
      const url      = producto.documento_ficha;
      const filename = `ficha-tecnica-${producto.sku || producto.id}.pdf`;

      // Intentar descarga directa primero
      const link     = document.createElement('a');
      link.href      = url;
      link.download  = filename;
      link.target    = '_blank';
      link.rel       = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      // Fallback: abrir en nueva pestaña
      window.open(producto.documento_ficha, '_blank', 'noopener,noreferrer');
    }
  }, [producto]);

  /* ══════ LOADING / NOT FOUND ══════ */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0a0514 0%, #0d0a1a 40%, #080510 100%)" }}>
      <div className="text-center space-y-4">
        <div className="relative w-14 h-14 mx-auto">
          <div className="absolute inset-0 border-4 rounded-full" style={{ borderColor: "rgba(152,81,249,0.2)" }} />
          <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#9851F9", borderTopColor: "transparent" }} />
        </div>
        <p className="text-white font-semibold text-sm">Cargando producto...</p>
        <p className="text-gray-500 text-xs">Un momento por favor</p>
      </div>
    </div>
  );

  if (!producto) return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #0a0514 0%, #0d0a1a 40%, #080510 100%)" }}>
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "rgba(239,68,68,0.1)" }}>
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-white">Producto no encontrado</h2>
        <p className="text-gray-400 text-xs">El producto que buscas no existe o fue eliminado.</p>
        <button onClick={() => router.push("/catalogo")}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-white font-semibold text-xs rounded-lg transition-all"
          style={{ background: "linear-gradient(135deg,#9851F9,#7c3aed)" }}>
          <ArrowLeft size={14} /> Volver al catálogo
        </button>
      </div>
    </div>
  );

  /* ══════ VARS DERIVADAS ══════ */
  const specsArray   = formatearEspecificaciones(producto.especificaciones_tecnicas);
  const productImages= [producto.imagen_principal, ...(producto.imagenes || [])].filter(Boolean);
  const stockActual  = getStockActual();
  const pedidoMin    = getPedidoMinimo();
  const maximo       = stockActual;
  const precioBase   = getPrecioBase();

  const porcentajes = { 5:0, 4:0, 3:0, 2:0, 1:0 };
  if (estadisticas.totalReseñas > 0)
    [5,4,3,2,1].forEach(s => {
      porcentajes[s as keyof typeof porcentajes] =
        (estadisticas.distribucionRating[s as keyof typeof estadisticas.distribucionRating] / estadisticas.totalReseñas) * 100;
    });

  /* ══════ RENDER PRINCIPAL ══════ */
  return (
    <div className="min-h-screen text-white antialiased relative"
      style={{ background: "linear-gradient(135deg, #0a0514 0%, #0d0a1a 50%, #060310 100%)", fontFamily: "'Inter', sans-serif" }}>

      {/* ── FONDO PURPLE SUAVE ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full blur-[170px]"
          style={{ background: "radial-gradient(circle, rgba(152,81,249,0.09) 0%, transparent 65%)" }} />
        <div className="absolute top-1/2 -left-48 w-[450px] h-[450px] rounded-full blur-[160px]"
          style={{ background: "radial-gradient(circle, rgba(152,81,249,0.07) 0%, transparent 65%)" }} />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(152,81,249,0.06) 0%, transparent 65%)" }} />
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(152,81,249,0.25), transparent)" }} />
      </div>

      {/* Chatbot IA */}
      <ProductAIChatbot producto={producto} language={language} />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl"
        style={{ background: "rgba(10,5,20,0.85)", borderBottom: "1px solid rgba(152,81,249,0.12)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3">
          <div className="flex items-center justify-between">
            <Link href="/catalogo"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors group">
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform"
                style={{ color: "#9851F9" }} />
              <span className="hidden sm:inline">Volver al catálogo</span>
              <span className="sm:hidden">Catálogo</span>
            </Link>

            {/* Compartir */}
            <div className="relative">
              <button onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs font-medium text-white"
                style={{ background: "rgba(152,81,249,0.08)", borderColor: "rgba(152,81,249,0.25)" }}>
                <Share2 size={13} style={{ color: "#9851F9" }} />
                <span className="hidden sm:inline">Compartir</span>
              </button>
              {showShareMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                  <div className="absolute right-0 mt-1.5 w-44 rounded-lg p-1 shadow-2xl z-50 border"
                    style={{ background: "rgba(13,10,26,0.97)", borderColor: "rgba(152,81,249,0.25)" }}>
                    <button onClick={() => { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${producto.nombre_producto}\n${window.location.href}`)}`, '_blank'); setShowShareMenu(false); }}
                      className="w-full flex items-center gap-1.5 p-1.5 hover:bg-white/5 rounded text-xs font-medium text-emerald-400 transition-colors">
                      <MessageSquare size={14} /> WhatsApp
                    </button>
                    <button onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank'); setShowShareMenu(false); }}
                      className="w-full flex items-center gap-1.5 p-1.5 hover:bg-white/5 rounded text-xs font-medium text-blue-400 transition-colors">
                      <Facebook size={14} /> Facebook
                    </button>
                    <div className="border-t border-white/10 my-1" />
                    <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Enlace copiado"); setShowShareMenu(false); }}
                      className="w-full flex items-center gap-1.5 p-1.5 hover:bg-white/5 rounded text-xs font-medium text-gray-300 transition-colors">
                      <Share2 size={14} /> Copiar enlace
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ══════ MAIN ══════ */}
      <main className="max-w-5xl mx-auto px-4 sm:px-5 py-6 lg:py-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

          {/* ─── GALERÍA IMÁGENES ─── */}
          <div className="lg:col-span-6 space-y-3">
            <div className="relative aspect-square rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(152,81,249,0.2)" }}>
              {isView360 && productImages.length > 1
                ? <ProductView360 images={productImages} />
                : <ImageZoom src={imgSeleccionada || productImages[0]} alt={producto.nombre_producto} />
              }

              {productImages.length > 1 && (
                <button onClick={() => setIsView360(!isView360)}
                  className="absolute top-3 left-3 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                  style={{ background: "rgba(152,81,249,0.6)", border: "1px solid rgba(152,81,249,0.5)" }}>
                  <RotateCw size={14} />
                  {isView360 ? "Vista Normal" : "360°"}
                </button>
              )}

              {/* Wishlist */}
              <button onClick={toggleWishlist} disabled={wishlistLoading}
                className="absolute top-3 right-3 p-2 rounded-lg backdrop-blur-sm transition-all disabled:opacity-50"
                style={{ background: "rgba(13,10,26,0.7)", border: "1px solid rgba(152,81,249,0.2)" }}>
                {wishlistLoading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : enWishlist
                    ? <HeartIcon size={20} className="fill-red-500 text-red-500" />
                    : <HeartIcon size={20} className="text-white" />
                }
              </button>

              {/* Badges estado */}
              <div className="absolute top-14 right-3 flex flex-col gap-1">
                <div className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${stockActual > 0 ? '' : ''}`}
                  style={{
                    background: stockActual > 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                    border: `1px solid ${stockActual > 0 ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                    color: stockActual > 0 ? "#4ade80" : "#f87171"
                  }}>
                  <Package size={11} />
                  {tipoCompra === 'caja' ? `${producto.stock_cajas} cajas` : `${producto.stock_unidades} uds`}
                </div>
                {producto.destacado && (
                  <div className="px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                    style={{ background: "rgba(152,81,249,0.2)", border: "1px solid rgba(152,81,249,0.4)", color: "#c084fc" }}>
                    <Award size={11} />
                    Destacado
                  </div>
                )}
              </div>
            </div>

            {/* Miniaturas */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {productImages.map((img, i) => (
                <button key={i} onClick={() => setImgSeleccionada(img)}
                  className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-white overflow-hidden transition-all"
                  style={{
                    border: imgSeleccionada === img ? "2px solid #9851F9" : "2px solid transparent",
                    opacity: imgSeleccionada === img ? 1 : 0.5,
                    boxShadow: imgSeleccionada === img ? "0 0 8px rgba(152,81,249,0.4)" : "none"
                  }}>
                  <img src={img} className="w-full h-full object-contain p-1" alt={`Vista ${i+1}`} />
                </button>
              ))}
            </div>
          </div>

          {/* ─── INFO + COMPRA ─── */}
          <div className="lg:col-span-6 space-y-4">
            {/* Encabezado */}
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: "rgba(152,81,249,0.1)", border: "1px solid rgba(152,81,249,0.25)" }}>
                <BadgeCheck size={12} style={{ color: "#9851F9" }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#a78bfa" }}>
                  Premium B2B
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
                {producto.nombre_producto}
              </h1>

              <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-400">
                {[
                  { icon: Tag,     label: "SKU",       val: producto.sku },
                  { icon: Layers,  label: "Categoría", val: producto.categoria_id },
                  { icon: Award,   label: "Marca",     val: producto.marca },
                  { icon: Box,     label: "Modelo",    val: producto.modelo || 'N/A' },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="flex items-center gap-1">
                    <Icon size={12} style={{ color: "#9851F9" }} />
                    <span className="font-medium">{label}:</span>
                    <span className="text-white font-bold truncate">{val}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1 col-span-2">
                  <Grid size={12} style={{ color: "#9851F9" }} />
                  <span className="font-medium">Color:</span>
                  <span className="text-white">{producto.color || 'N/A'}</span>
                </div>
              </div>

              {/* Rating */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_,i) => (
                      <Star key={i} size={14}
                        className={i < Math.floor(estadisticas.promedioRating) ? "text-amber-400 fill-amber-400" : "text-slate-700"} />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-slate-200">{estadisticas.promedioRating}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Users size={12} />
                  <span>{estadisticas.totalReseñas} {estadisticas.totalReseñas === 1 ? 'opinión' : 'opiniones'}</span>
                </div>
              </div>
            </div>

            {/* Tipo de compra */}
            <TipoCompraSelector tipo={tipoCompra} setTipo={tipo => {
              setTipoCompra(tipo);
              setCantidad(tipo === 'caja' ? 1 : producto.pedido_minimo);
            }} disabled={producto.estado !== "Activo"} />

            {/* Specs rápidas */}
            {(producto.capacidad_almacenamiento || producto.capacidad_ram || producto.sistema_operativo || producto.procesador) && (
              <div className="rounded-lg p-3"
                style={{ background: "rgba(152,81,249,0.05)", border: "1px solid rgba(152,81,249,0.15)" }}>
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1">
                  <Sparkles size={12} style={{ color: "#9851F9" }} />
                  Especificaciones rápidas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: producto.capacidad_almacenamiento, color: "rgba(152,81,249,0.2)", text: "#c084fc" },
                    { val: producto.capacidad_ram            && `RAM ${producto.capacidad_ram}`, color: "rgba(109,40,217,0.2)", text: "#a78bfa" },
                    { val: producto.sistema_operativo,        color: "rgba(34,197,94,0.15)",    text: "#4ade80" },
                    { val: producto.procesador,               color: "rgba(245,158,11,0.15)",   text: "#fbbf24" },
                  ].map(({ val, color, text }) => val && (
                    <span key={val} className="text-[10px] px-2 py-1 rounded-full"
                      style={{ background: color, color: text }}>
                      {val}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* PRECIO */}
            <div className="relative overflow-hidden p-4 rounded-lg"
              style={{
                background: "linear-gradient(135deg, rgba(152,81,249,0.08) 0%, rgba(109,40,217,0.08) 100%)",
                border: "1px solid rgba(152,81,249,0.22)"
              }}>
              <div className="space-y-2">
                {/* Precio principal */}
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-bold">
                    {producto.moneda} {precioSeleccionado.toLocaleString('es-PE')}
                  </span>
                  {precioSeleccionado !== precioBase && (
                    <span className="text-sm text-gray-500 line-through font-medium">
                      {producto.moneda} {precioBase.toLocaleString('es-PE')}
                    </span>
                  )}
                  {tipoCompra === 'caja' && producto.en_oferta && producto.precio_oferta_caja && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
                      style={{ background: "#9851F9" }}>OFERTA</span>
                  )}
                  {tipoCompra === 'unidad' && producto.en_oferta_unidad && producto.precio_oferta_unidad && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
                      style={{ background: "#9851F9" }}>OFERTA</span>
                  )}
                </div>

                {/* Detalles precio */}
                <div className="text-sm text-gray-400 space-y-1">
                  {tipoCompra === 'caja' ? (
                    <>
                      <p className="flex items-center gap-1">
                        <Package size={14} style={{ color: "#9851F9" }} />
                        Por caja ({producto.unidades_por_caja} unidades)
                      </p>
                      <p className="text-xs">
                        <span className="text-gray-500">Precio/unidad: </span>
                        <span className="text-white font-medium">S/ {producto.precio_unitario.toLocaleString('es-PE')}</span>
                      </p>
                      <p className="text-xs font-bold" style={{ color: "#c084fc" }}>
                        Total {cantidad} {cantidad===1?'caja':'cajas'}: S/ {(precioSeleccionado * cantidad).toLocaleString('es-PE')}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="flex items-center gap-1">
                        <Box size={14} style={{ color: "#9851F9" }} />
                        Por unidad suelta
                      </p>
                      <p className="text-xs">
                        <span className="text-gray-500">Eq. por caja: </span>
                        <span className="text-white font-medium">S/ {(producto.precio_unitario * producto.unidades_por_caja).toLocaleString('es-PE')}</span>
                      </p>
                      <p className="text-xs font-bold" style={{ color: "#c084fc" }}>
                        Total {cantidad} uds: S/ {(precioSeleccionado * cantidad).toLocaleString('es-PE')}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <TrendingUp size={12} style={{ color: "#9851F9" }} />
                  Precio especial B2B • IGV no incluido
                </div>
              </div>
            </div>

            {/* PRECIOS POR VOLUMEN */}
            <PreciosVolumenDisplay
              preciosVolumen={producto.precios_volumen}
              tipo={tipoCompra}
              precioCajaBase={producto.en_oferta && producto.precio_oferta_caja ? producto.precio_oferta_caja : producto.precio_caja}
              precioUnidadBase={producto.en_oferta_unidad && producto.precio_oferta_unidad ? producto.precio_oferta_unidad : producto.precio_unitario}
              onSelectPrecio={(precio, cantMin) => {
                setPrecioSeleccionado(precio);
                setCantidad(cantMin);
              }}
              precioSeleccionado={precioSeleccionado}
            />

            {/* CANTIDAD */}
            <QuantitySelector
              quantity={cantidad} setQuantity={setCantidad}
              max={maximo} tipo={tipoCompra}
              unidadesPorCaja={producto.unidades_por_caja}
              pedidoMinimo={producto.pedido_minimo}
              disabled={stockActual <= 0 || producto.estado !== "Activo"}
            />

            {enWishlist && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "#f87171" }}>
                <HeartIcon size={16} className="fill-red-500" />
                <span>En favoritos</span>
              </div>
            )}

            {/* BOTONES COMPRA */}
            <div className="flex gap-3">
              <button onClick={handleAgregarAlCarrito}
                disabled={stockActual <= 0 || producto.estado !== "Activo"}
                className="flex-1 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: agregado
                    ? "linear-gradient(135deg,#22c55e,#16a34a)"
                    : stockActual <= 0 || producto.estado !== "Activo"
                      ? "rgba(255,255,255,0.1)"
                      : "linear-gradient(135deg,#9851F9,#7c3aed)",
                  boxShadow: agregado || stockActual <= 0 ? "none" : "0 4px 20px rgba(152,81,249,0.35)",
                  color: "#fff"
                }}>
                {producto.estado !== "Activo"
                  ? <><AlertCircle size={16} /> Inactivo</>
                  : stockActual <= 0
                    ? <><AlertCircle size={16} /> Sin stock</>
                    : agregado
                      ? <><Check size={16} /> ¡Añadido!</>
                      : <><ShoppingCart size={16} /> Agregar ({tipoCompra})</>
                }
              </button>

              <button onClick={toggleWishlist} disabled={wishlistLoading || !currentUser}
                className="px-4 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: enWishlist ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
                  borderColor: enWishlist ? "rgba(239,68,68,0.3)" : "rgba(152,81,249,0.2)",
                  color: enWishlist ? "#f87171" : "#94a3b8"
                }}
                title={!currentUser ? "Inicia sesión" : ""}>
                {wishlistLoading
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : enWishlist
                    ? <><HeartIcon size={16} className="fill-red-500" /><span className="hidden sm:inline">Quitar</span></>
                    : <><HeartIcon size={16} /><span className="hidden sm:inline">Favoritos</span></>
                }
              </button>
            </div>

            {/* BENEFICIOS */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Truck,   color: "#9851F9", titulo: "Envío Express",           desc: "24-48h nacional" },
                { icon: Shield,  color: "#22c55e", titulo: `Garantía ${producto.garantia_meses}m`, desc: "B2B sin costos" },
                { icon: Lock,    color: "#a78bfa", titulo: "Pago Seguro",             desc: "SSL 256-bit" },
                { icon: Award,   color: "#fbbf24", titulo: "Calidad Premium",         desc: "Sellado original" },
              ].map(({ icon: Icon, color, titulo, desc }) => (
                <div key={titulo} className="rounded-lg p-2.5 transition-all"
                  style={{ background: "rgba(152,81,249,0.04)", border: "1px solid rgba(152,81,249,0.12)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(152,81,249,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(152,81,249,0.04)")}>
                  <div className="flex items-start gap-1.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${color}20` }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white mb-0.5">{titulo}</h4>
                      <p className="text-[10px] text-gray-400">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DATOS FÍSICOS */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { icon: Scale,    label: "Peso",     val: `${producto.peso_kg} kg`,     color: "#9851F9" },
                { icon: Calendar, label: "Garantía", val: `${producto.garantia_meses}m`, color: "#a78bfa" },
                { icon: Box,      label: "Dims.",    val: producto.dimensiones || "—",   color: "#9851F9" },
              ].map(({ icon: Icon, label, val, color }) => (
                <div key={label} className="rounded-lg p-2.5"
                  style={{ background: "rgba(152,81,249,0.04)", border: "1px solid rgba(152,81,249,0.12)" }}>
                  <div className="flex items-center gap-1 mb-1">
                    <Icon size={12} style={{ color }} />
                    <span className="font-bold text-white">{label}</span>
                  </div>
                  <span className="font-bold text-white text-[11px]">{val}</span>
                </div>
              ))}
            </div>

            {/* DESCARGAR FICHA TÉCNICA */}
            {producto.documento_ficha && (
              <div className="flex gap-2">
                <button onClick={handleDescargarFicha}
                  className="flex-1 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  style={{
                    background: "rgba(152,81,249,0.08)",
                    border: "1px solid rgba(152,81,249,0.25)",
                    color: "#c084fc"
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(152,81,249,0.15)";
                    (e.currentTarget as HTMLElement).style.borderColor = "#9851F9";
                    (e.currentTarget as HTMLElement).style.color = "#fff";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(152,81,249,0.08)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(152,81,249,0.25)";
                    (e.currentTarget as HTMLElement).style.color = "#c084fc";
                  }}>
                  <Download size={15} />
                  Descargar Ficha Técnica (PDF)
                </button>
                <a href={producto.documento_ficha} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all"
                  style={{
                    background: "rgba(152,81,249,0.05)",
                    border: "1px solid rgba(152,81,249,0.15)",
                    color: "#a78bfa"
                  }}>
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ══════ TABS ══════ */}
        <div className="mt-10" id="seccion-reseñas">
          {/* Tab nav */}
          <div className="flex gap-4 mb-6 overflow-x-auto"
            style={{ borderBottom: "1px solid rgba(152,81,249,0.15)" }}>
            {[
              { id: 'descripcion',      label: 'Descripción' },
              { id: 'especificaciones', label: 'Especificaciones' },
              { id: 'feedback',         label: 'Opiniones', count: estadisticas.totalReseñas },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="pb-2 px-1 text-sm font-semibold transition-all relative whitespace-nowrap flex items-center gap-1"
                style={{ color: activeTab === tab.id ? "#c084fc" : "#6b7280" }}>
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-[10px] px-1 py-0.5 rounded-full"
                    style={{ background: "rgba(152,81,249,0.2)", color: "#a78bfa" }}>
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: "linear-gradient(90deg,#9851F9,#c084fc)" }} />
                )}
              </button>
            ))}
          </div>

          {/* DESCRIPCIÓN */}
          {activeTab === 'descripcion' && (
            <div className="rounded-lg p-5"
              style={{ background: "rgba(152,81,249,0.04)", border: "1px solid rgba(152,81,249,0.15)" }}>
              <h3 className="text-base font-bold text-white mb-3">Descripción del producto</h3>
              <p className="text-gray-300 leading-relaxed text-sm mb-5">
                {producto.descripcion_corta || "Producto de alta calidad ideal para distribución B2B."}
              </p>
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={14} style={{ color: "#9851F9" }} />
                  Información rápida
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    ["SKU",           producto.sku],
                    ["Marca",         producto.marca],
                    ["Modelo",        producto.modelo   || 'N/A'],
                    ["Color",         producto.color    || 'N/A'],
                    ["Almacenamiento",producto.capacidad_almacenamiento || 'N/A'],
                    ["RAM",           producto.capacidad_ram            || 'N/A'],
                    ["SO",            producto.sistema_operativo        || 'N/A'],
                    ["Procesador",    producto.procesador               || 'N/A'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between p-2 rounded"
                      style={{ background: "rgba(152,81,249,0.04)", border: "1px solid rgba(152,81,249,0.08)" }}>
                      <span className="text-gray-400 font-medium">{k}:</span>
                      <span className="text-white font-bold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ESPECIFICACIONES */}
          {activeTab === 'especificaciones' && (
            <div className="rounded-lg p-5"
              style={{ background: "rgba(152,81,249,0.04)", border: "1px solid rgba(152,81,249,0.15)" }}>
              <h3 className="text-base font-bold text-white mb-4">Especificaciones Técnicas</h3>
              {specsArray.length > 0 ? (
                <div className="space-y-2">
                  {specsArray.map((item, i) => (
                    <div key={i} className="rounded-lg p-2.5 transition-all"
                      style={{ background: "rgba(152,81,249,0.04)", border: "1px solid rgba(152,81,249,0.1)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(152,81,249,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(152,81,249,0.04)")}>
                      <div className="flex items-start gap-1.5">
                        <List size={12} className="shrink-0 mt-0.5" style={{ color: "#9851F9" }} />
                        <span className="text-xs text-gray-300">{item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText size={32} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No hay especificaciones disponibles</p>
                </div>
              )}
            </div>
          )}

          {/* RESEÑAS */}
          {activeTab === 'feedback' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Panel izquierdo: resumen + formulario */}
              <div className="space-y-4">
                {/* Resumen ratings */}
                <div className="rounded-lg p-4"
                  style={{ background: "rgba(152,81,249,0.05)", border: "1px solid rgba(152,81,249,0.15)" }}>
                  <h3 className="text-sm font-bold text-white mb-3">Resumen de Calificaciones</h3>
                  <div className="text-center mb-3">
                    <div className="text-4xl font-bold text-white mb-1">{estadisticas.promedioRating}</div>
                    <StarRating rating={estadisticas.promedioRating} readonly size={18} />
                    <p className="text-xs text-gray-400 mt-1">
                      {estadisticas.totalReseñas} {estadisticas.totalReseñas===1?'opinión':'opiniones'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {[5,4,3,2,1].map(s => (
                      <div key={s} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-14">{s} ★</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden"
                          style={{ background: "rgba(152,81,249,0.1)" }}>
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${porcentajes[s as keyof typeof porcentajes]}%`,
                              background: "linear-gradient(90deg,#9851F9,#c084fc)"
                            }} />
                        </div>
                        <span className="text-xs text-gray-400 w-6 text-right">
                          {estadisticas.distribucionRating[s as keyof typeof estadisticas.distribucionRating]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formulario reseña */}
                {currentUser ? (
                  <div className="rounded-lg p-4"
                    style={{ background: "rgba(152,81,249,0.05)", border: "1px solid rgba(152,81,249,0.15)" }}>
                    <h3 className="text-sm font-bold text-white mb-3">Escribir reseña</h3>
                    <form onSubmit={handleEnviarReseña} className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Calificación</label>
                        <StarRating rating={puntuacion} setRating={setPuntuacion} size={22} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Comentario (mín. 10 caracteres)</label>
                        <textarea value={nuevaReseña} onChange={e => setNuevaReseña(e.target.value)}
                          rows={3} placeholder="Tu experiencia con este producto..."
                          className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none resize-none"
                          style={{
                            background: "rgba(152,81,249,0.06)",
                            border: "1px solid rgba(152,81,249,0.2)"
                          }} />
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                          <span>{nuevaReseña.length} chars</span>
                          <span>{nuevaReseña.length < 10 ? `Faltan ${10-nuevaReseña.length}` : '✓'}</span>
                        </div>
                      </div>
                      <ImageUploader
                        previewImages={previewImages} imagenesReseña={imagenesReseña}
                        handleImagenesReseña={handleImagenesReseña}
                        eliminarImagenPreview={eliminarImagenPreview} />
                      {uploadStatus && (
                        <div className="text-xs p-2 rounded" style={{ background: "rgba(152,81,249,0.1)", color: "#a78bfa" }}>
                          {uploadStatus}
                          {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="mt-1 w-full bg-gray-800 rounded-full h-1">
                              <div className="h-1 rounded-full transition-all"
                                style={{ width: `${uploadProgress}%`, background: "#9851F9" }} />
                            </div>
                          )}
                        </div>
                      )}
                      <button type="submit" disabled={enviando || nuevaReseña.length < 10}
                        className="w-full py-2.5 rounded-lg font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
                        style={{
                          background: enviando || nuevaReseña.length < 10
                            ? "rgba(255,255,255,0.05)"
                            : "linear-gradient(135deg,#9851F9,#7c3aed)"
                        }}>
                        {enviando ? "Publicando..." : "Publicar reseña"}
                      </button>
                      <p className="text-[9px] text-gray-600 text-center">
                        Al publicar aceptas que tu nombre sea visible públicamente
                      </p>
                    </form>
                  </div>
                ) : (
                  <div className="rounded-lg p-4 text-center"
                    style={{ background: "rgba(152,81,249,0.05)", border: "1px solid rgba(152,81,249,0.15)" }}>
                    <User size={28} className="mx-auto mb-2" style={{ color: "#9851F9" }} />
                    <p className="text-sm font-bold text-white mb-1">Inicia sesión</p>
                    <p className="text-xs text-gray-400 mb-3">Para dejar una reseña</p>
                    <Link href="/login"
                      className="inline-block px-4 py-2 text-white font-bold text-xs rounded-lg"
                      style={{ background: "linear-gradient(135deg,#9851F9,#7c3aed)" }}>
                      Iniciar sesión
                    </Link>
                  </div>
                )}
              </div>

              {/* Panel derecho: lista reseñas */}
              <div className="lg:col-span-2 space-y-4">
                {/* Fotos de clientes */}
                {todasImagenesReseñas.length > 0 && (
                  <div className="rounded-lg p-3"
                    style={{ background: "rgba(152,81,249,0.04)", border: "1px solid rgba(152,81,249,0.12)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1">
                        <Camera size={14} style={{ color: "#9851F9" }} />
                        Fotos de clientes
                      </h3>
                      <span className="text-xs text-gray-400">{todasImagenesReseñas.length} fotos</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {todasImagenesReseñas.slice(0, 10).map((img, i) => (
                        <button key={i} onClick={() => abrirGaleria(i)}
                          className="aspect-square rounded overflow-hidden bg-slate-800 group transition-all"
                          style={{ border: "1px solid rgba(152,81,249,0.15)" }}>
                          <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reseñas */}
                <h3 className="text-base font-bold text-white">Opiniones</h3>
                {reseñas.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {reseñas.map(r => (
                      <div key={r.id} className="rounded-lg p-3 transition-all"
                        style={{ background: "rgba(152,81,249,0.04)", border: "1px solid rgba(152,81,249,0.12)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(152,81,249,0.08)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(152,81,249,0.04)")}>
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex items-center gap-1.5">
                            {r.usuarioFoto
                              ? <img src={r.usuarioFoto} className="w-8 h-8 rounded-full object-cover border" style={{ borderColor: "rgba(152,81,249,0.3)" }} alt="" />
                              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                  style={{ background: "linear-gradient(135deg,#9851F9,#7c3aed)" }}>
                                  {r.usuario?.charAt(0).toUpperCase()}
                                </div>
                            }
                            <div>
                              <div className="flex items-center gap-1">
                                <h4 className="font-bold text-xs text-white">{r.usuario}</h4>
                                {r.verificado && (
                                  <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-full"
                                    style={{ background: "rgba(152,81,249,0.15)" }}>
                                    <BadgeCheck size={9} style={{ color: "#9851F9" }} />
                                    <span className="text-[9px] font-medium" style={{ color: "#a78bfa" }}>Verificado</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-500">{r.usuarioEmail}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <StarRating rating={r.rating} readonly size={13} />
                            <span className="text-[10px] text-gray-500">
                              {r.fecha?.toDate ? getRelativeTime(r.fecha.toDate()) : 'Reciente'}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed mb-2">{r.comentario}</p>
                        {r.imagenes?.length > 0 && (
                          <div className="flex gap-1 mb-2">
                            {r.imagenes.map((img, i) => (
                              <button key={i} onClick={() => abrirGaleria(todasImagenesReseñas.indexOf(img))}
                                className="w-12 h-12 rounded overflow-hidden"
                                style={{ border: "1px solid rgba(152,81,249,0.2)" }}>
                                <img src={img} className="w-full h-full object-cover" alt="" />
                              </button>
                            ))}
                          </div>
                        )}
                        <button onClick={() => marcarUtil(r.id)}
                          className="flex items-center gap-1 text-[10px] transition-colors px-2 py-1 rounded"
                          style={{ color: "#9851F9" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(152,81,249,0.1)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <Heart size={10} /> Útil ({r.util})
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 rounded-lg"
                    style={{ background: "rgba(152,81,249,0.04)", border: "1px solid rgba(152,81,249,0.12)" }}>
                    <Star size={32} className="text-gray-700 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-white mb-1">Sin reseñas aún</h3>
                    <p className="text-xs text-gray-500">¡Sé el primero en opinar!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ══════ MODAL GALERÍA ══════ */}
      {galleriaAbierta && todasImagenesReseñas.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.94)" }}>
          <button onClick={cerrarGaleria}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
            <X size={18} />
          </button>
          {todasImagenesReseñas.length > 1 && (
            <>
              <button onClick={() => navegarGaleria('prev')}
                className="absolute left-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => navegarGaleria('next')}
                className="absolute right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
                <ChevronRight size={20} />
              </button>
            </>
          )}
          <div className="max-w-3xl max-h-[80vh]">
            <img src={todasImagenesReseñas[imagenGaleriaActual]}
              className="max-w-full max-h-full object-contain rounded-xl mx-auto"
              alt={`Foto ${imagenGaleriaActual+1}`} />
            <p className="text-center text-white text-xs font-semibold mt-3">
              {imagenGaleriaActual+1} / {todasImagenesReseñas.length}
            </p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: rgba(152,81,249,0.4) transparent; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(152,81,249,0.4); border-radius: 10px; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}