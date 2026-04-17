import React, { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../services/api';

interface LeadRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  proveedor: { id: string | number; nombre: string } | null;
}

const LeadRequestModal: React.FC<LeadRequestModalProps> = ({ isOpen, onClose, proveedor }) => {
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!proveedor) throw new Error('Proveedor no válido');
      
      await api.post('/leads/', {
        proveedor: proveedor.id,
        mensaje_interes: mensaje,
      });

      toast.success('Solicitud enviada con éxito. El proveedor le contactará en breve.');
      onClose();
      setMensaje('');
    } catch (error) {
      console.error(error);
      toast.error('Ocurrió un error. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200">
        <div className="bg-slate-950 px-5 py-3.5 flex justify-between items-center text-white border-b border-slate-800">
          <h2 className="text-base font-serif font-semibold text-slate-100 tracking-tight">Solicitar Presupuesto</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5">
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Envía tu solicitud para <strong className="text-slate-800 font-semibold">{proveedor?.nombre}</strong> y uno de nuestros agentes te asesorará sin compromiso.
          </p>
          
          <div className="mb-4">
            <label htmlFor="mensaje" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              ¿Qué necesitas? (Opcional)
            </label>
            <textarea
              id="mensaje"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none transition-shadow resize-none bg-slate-50"
              placeholder="Describe los equipos en los que estás interesado..."
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 rounded-md hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm uppercase tracking-widest"
            >
              {loading ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadRequestModal;
