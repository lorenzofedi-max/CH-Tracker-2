import React, { useState } from 'react';
import { EntryType, LogEntry } from '../types';
import { X, Save, Zap, Fuel } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: LogEntry) => void;
  lastOdometer: number;
}

const InputModal: React.FC<InputModalProps> = ({ isOpen, onClose, onSave, lastOdometer }) => {
  const [type, setType] = useState<EntryType>('gas');
  const [odometer, setOdometer] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  
  // This state represents "Total Cost" if Gas, or "Cost Per kWh" if Electric
  const [costInput, setCostInput] = useState<string>(''); 
  
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!odometer || !amount || !costInput) return;

    const numOdometer = parseFloat(odometer);
    const numAmount = parseFloat(amount);
    const numInputCost = parseFloat(costInput);

    let calculatedTotalCost = 0;
    let calculatedPricePerUnit = 0;

    if (type === 'gas') {
      // User entered Total Cost
      calculatedTotalCost = numInputCost;
      calculatedPricePerUnit = numInputCost / numAmount;
    } else {
      // User entered Price Per kWh
      calculatedPricePerUnit = numInputCost;
      calculatedTotalCost = numAmount * numInputCost;
    }

    const newEntry: LogEntry = {
      id: uuidv4(),
      date,
      type,
      odometer: numOdometer,
      amount: numAmount,
      cost: calculatedTotalCost,
      pricePerUnit: calculatedPricePerUnit,
    };

    onSave(newEntry);
    
    // Reset form
    setOdometer('');
    setAmount('');
    setCostInput('');
    onClose();
  };

  const handleTypeChange = (newType: EntryType) => {
    setType(newType);
    setAmount('');
    setCostInput(''); // Clear cost input when switching context because scale is very different
  };

  // Helper to calculate display values preview
  const getSummaryPreview = () => {
    if (!amount || !costInput) return null;
    const valAmount = parseFloat(amount);
    const valCost = parseFloat(costInput);

    if (type === 'gas') {
      // Input is Total Cost -> Show Unit Price
      const unit = valCost / valAmount;
      return (
        <>Prezzo al Litro: <span className="text-white font-bold">€{unit.toFixed(3)}</span> /L</>
      );
    } else {
      // Input is Unit Price -> Show Total Cost
      const total = valAmount * valCost;
      return (
        <>Costo Totale Ricarica: <span className="text-white font-bold">€{total.toFixed(2)}</span></>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-cupra-card w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {type === 'gas' ? <Fuel className="text-cupra-petrol" /> : <Zap className="text-cupra-electric" />}
            Nuovo {type === 'gas' ? 'Rifornimento' : 'Ricarica'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Type Switcher */}
        <div className="flex p-2 gap-2 bg-gray-900/50">
          <button
            onClick={() => handleTypeChange('gas')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium ${
              type === 'gas' ? 'bg-cupra-petrol text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <Fuel size={18} /> Benzina
          </button>
          <button
            onClick={() => handleTypeChange('electric')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium ${
              type === 'electric' ? 'bg-cupra-electric text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <Zap size={18} /> Elettrico
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-medium text-cupra-muted uppercase mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-cupra-dark border border-gray-700 rounded-lg p-3 text-white focus:border-cupra-copper outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cupra-muted uppercase mb-1">
              Km Totali (Odo) {lastOdometer > 0 && <span className='normal-case text-gray-500'>Ultimo: {lastOdometer}</span>}
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder="es. 15430"
              className="w-full bg-cupra-dark border border-gray-700 rounded-lg p-3 text-white focus:border-cupra-copper outline-none"
              required
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-cupra-muted uppercase mb-1">
                {type === 'gas' ? 'Litri' : 'kWh'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-cupra-dark border border-gray-700 rounded-lg p-3 text-white focus:border-cupra-copper outline-none"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-cupra-muted uppercase mb-1">
                {type === 'gas' ? 'Costo Totale (€)' : 'Costo Unitario (€/kWh)'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.001"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                placeholder={type === 'gas' ? "50.00" : "0.22"}
                className="w-full bg-cupra-dark border border-gray-700 rounded-lg p-3 text-white focus:border-cupra-copper outline-none"
                required
              />
            </div>
          </div>

          {amount && costInput && (
            <div className="text-center text-sm text-gray-400 mt-2 p-2 bg-gray-900/50 rounded-lg border border-gray-800">
              {getSummaryPreview()}
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mt-6 transition-transform active:scale-95 ${
               type === 'gas' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-gradient-to-r from-blue-600 to-blue-500'
            } text-white shadow-lg`}
          >
            <Save size={20} /> Salva Dati
          </button>

        </form>
      </div>
    </div>
  );
};

export default InputModal;