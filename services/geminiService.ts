import { GoogleGenAI } from "@google/genai";
import { LogEntry, Stats } from '../types';

export const analyzeDrivingHabits = async (logs: LogEntry[], stats: Stats | null): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key non configurata. Impossibile generare consigli.";
  }
  
  if (!stats || logs.length < 3) {
    return "Non hai abbastanza dati per un'analisi approfondita. Aggiungi almeno 3 rifornimenti o ricariche.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare a summarized version of logs to save tokens
    const recentLogs = logs.slice(0, 10).map(l => ({
      d: l.date,
      t: l.type,
      odo: l.odometer,
      c: l.cost,
      amt: l.amount
    }));

    const prompt = `
      Agisci come un ingegnere esperto di Cupra Formentor e-Hybrid.
      Analizza questi dati di guida e rifornimento.
      
      Statistiche Attuali:
      - Costo per 100km: €${stats.costPer100Km.toFixed(2)}
      - Consumo Benzina: ${stats.gasConsumption.toFixed(1)} L/100km
      - Consumo Elettrico: ${stats.elecConsumption.toFixed(1)} kWh/100km
      - % Spesa Elettrica: ${stats.percentageElectricCost.toFixed(0)}%
      - Distanza Totale Monitorata: ${stats.totalDistance} km
      
      Ultimi 10 Log (JSON semplificato):
      ${JSON.stringify(recentLogs)}
      
      Obiettivo: Dare un feedback breve, diretto e utile (max 3 frasi) all'utente su come sta gestendo l'ibrido plug-in.
      Se il costo/100km è alto (>10€), suggerisci di ricaricare di più.
      Se è basso (<6€), complimentati.
      Usa un tono "Cupra": sportivo, tecnologico, diretto.
      Non usare formattazione markdown complessa, solo testo semplice.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Analisi completata, ma nessun testo ricevuto.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Impossibile connettersi all'IA Cupra al momento.";
  }
};