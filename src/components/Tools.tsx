import React, { useState } from 'react';
import { Scale, Search, Calculator, AlertTriangle, ExternalLink } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import Markdown from 'react-markdown';

export default function Tools() {
  const [dgetState, setDgetState] = useState('');
  const [dgetQuery, setDgetQuery] = useState('');
  const [dgetResult, setDgetResult] = useState<any>(null);
  const [isDgetLoading, setIsDgetLoading] = useState(false);

  const [crimeDetails, setCrimeDetails] = useState('');
  const [estimateResult, setEstimateResult] = useState('');
  const [isEstimateLoading, setIsEstimateLoading] = useState(false);

  const handleSearchDocket = async () => {
    if (!dgetState) return;
    setIsDgetLoading(true);
    try {
      const response = await geminiService.searchCourtDocket(dgetState, dgetQuery);
      setDgetResult(response);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDgetLoading(false);
    }
  };

  const handleEstimate = async () => {
    if (!crimeDetails) return;
    setIsEstimateLoading(true);
    try {
      const result = await geminiService.estimateSentence(crimeDetails);
      setEstimateResult(result || '');
    } catch (error) {
      console.error(error);
    } finally {
      setIsEstimateLoading(false);
    }
  };

  return (
    <div className="space-y-16">
      <header className="space-y-4">
        <h2 className="text-6xl font-serif italic tracking-tighter">Legal Tools</h2>
        <p className="text-xl opacity-60 max-w-2xl">
          Navigate the system. Search court dockets and estimate potential sentences.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Court Docket Search */}
        <section className="bg-white border border-[#141414] p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Search className="opacity-40" />
            <h3 className="text-3xl font-serif italic">Court Docket Search</h3>
          </div>
          <p className="text-sm opacity-60">
            Find official court records and case information by state.
          </p>
          <div className="space-y-4">
            <select 
              value={dgetState}
              onChange={(e) => setDgetState(e.target.value)}
              className="w-full border border-[#141414] p-4 bg-transparent focus:outline-none"
            >
              <option value="">Select State...</option>
              <option value="California">California</option>
              <option value="New York">New York</option>
              <option value="Texas">Texas</option>
              <option value="Florida">Florida</option>
              <option value="Colorado">Colorado</option>
              {/* Add more states as needed */}
            </select>
            <input 
              type="text" 
              value={dgetQuery}
              onChange={(e) => setDgetQuery(e.target.value)}
              placeholder="Case number or name (optional)..."
              className="w-full border border-[#141414] p-4 bg-transparent focus:outline-none"
            />
            <button 
              onClick={handleSearchDocket}
              disabled={isDgetLoading}
              className="w-full bg-[#141414] text-[#E4E3E0] py-4 uppercase tracking-widest font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isDgetLoading ? 'Searching...' : 'Search Dockets'}
            </button>
          </div>

          {dgetResult && (
            <div className="mt-8 space-y-4">
              <div className="p-4 bg-[#141414]/5 rounded-sm">
                <Markdown>{dgetResult.text}</Markdown>
              </div>
              {dgetResult.candidates?.[0]?.groundingMetadata?.groundingChunks && (
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-widest font-bold opacity-40">Sources</h4>
                  {dgetResult.candidates[0].groundingMetadata.groundingChunks.map((chunk: any, i: number) => (
                    chunk.web && (
                      <a 
                        key={i} 
                        href={chunk.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink size={14} /> {chunk.web.title}
                      </a>
                    )
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Sentence Estimator */}
        <section className="bg-[#141414] text-[#E4E3E0] p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Calculator className="text-yellow-400" />
            <h3 className="text-3xl font-serif italic">Sentence Estimator</h3>
          </div>
          <div className="flex items-start gap-3 p-4 bg-yellow-400/10 border border-yellow-400/20 rounded-sm">
            <AlertTriangle className="text-yellow-400 shrink-0" size={20} />
            <p className="text-xs opacity-80">
              DISCLAIMER: This tool provides rough estimates based on public data. It is NOT legal advice. Always consult with a qualified attorney.
            </p>
          </div>
          <div className="space-y-4">
            <textarea 
              value={crimeDetails}
              onChange={(e) => setCrimeDetails(e.target.value)}
              placeholder="Describe the charges, state, and any prior history..."
              className="w-full h-32 bg-white/10 border border-white/20 p-4 focus:outline-none focus:border-white/40"
            />
            <button 
              onClick={handleEstimate}
              disabled={isEstimateLoading}
              className="w-full bg-white text-[#141414] py-4 uppercase tracking-widest font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isEstimateLoading ? 'Calculating...' : 'Estimate Sentence'}
            </button>
          </div>

          {estimateResult && (
            <div className="mt-8 p-6 bg-white/5 rounded-sm prose prose-invert prose-sm">
              <Markdown>{estimateResult}</Markdown>
            </div>
          )}
        </section>

        {/* Parole Process & Check-ins */}
        <section className="lg:col-span-2 bg-white border border-[#141414] p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Scale className="opacity-40" />
            <h3 className="text-3xl font-serif italic">Parole Information & Check-In Guide</h3>
          </div>
          <p className="text-sm opacity-60 max-w-3xl">
            Understanding standard parole requirements, officer check-ins, and how to read your parole number.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            <div className="space-y-4">
              <h4 className="text-lg font-bold font-serif italic">1. Understanding Your Parole Number</h4>
              <p className="text-sm leading-relaxed opacity-80">
                Your parole number (often tied to your DOC number) is your primary identifier in the system. Memorize it. When interacting with any facility, officer, or automated system (like RMOMS), you will need to input this number correctly to verify your identity and confirm your compliance.
              </p>
              
              <h4 className="text-lg font-bold font-serif italic mt-6">2. Officer Check-ins</h4>
              <p className="text-sm leading-relaxed opacity-80">
                Regular check-ins with your Parole Officer (PO) are mandatory. 
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 opacity-80">
                <li><strong>Be Early:</strong> Arrive at least 15 minutes prior to your appointment.</li>
                <li><strong>Documentation:</strong> Always bring proof of employment, pay stubs, address verification, and any required program completion certificates.</li>
                <li><strong>Communication:</strong> If you are going to be late due to an emergency, call your PO immediately. Do not just fail to show up.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-bold font-serif italic">3. Urine Analysis (UA) & RMOMS</h4>
              <p className="text-sm leading-relaxed opacity-80">
                Many parolees are placed on a random urinalysis schedule, often managed by third-party systems like RMOMS (Rocky Mountain Offender Management Systems) or similar local agencies.
              </p>
              <ul className="list-disc pl-5 text-sm space-y-2 opacity-80">
                <li><strong>Daily Call-ins:</strong> You are usually required to call a hotline every day between specific hours (e.g., 5:00 AM - 9:00 AM) to see if your color or number is called.</li>
                <li><strong>Testing Window:</strong> If your color/number is called, you must report to the testing facility within their business hours that same day.</li>
                <li><strong>Dilution Warning:</strong> Do not drink excessive amounts of water before a test. A "diluted" sample is often treated as a positive test or a violation.</li>
              </ul>

              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-sm">
                <h5 className="text-xs uppercase font-bold tracking-widest text-emerald-800 mb-2">Standard Parole Requirements</h5>
                <ul className="list-disc pl-4 text-xs text-emerald-900 space-y-1">
                  <li>Maintain steady employment or enrollment in school.</li>
                  <li>Do not associate with known felons.</li>
                  <li>Do not leave the state (or sometimes county) without a travel pass from your PO.</li>
                  <li>Abide by all curfews and electronic monitoring rules if applicable.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
