import React, { useState } from 'react';
import { Scale, Search, Calculator, AlertTriangle, ExternalLink, Contact, Users } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import Markdown from 'react-markdown';

export default function Tools() {
  const [dgetState, setDgetState] = useState('');
  const [dgetQuery, setDgetQuery] = useState('');
  const [inmateId, setInmateId] = useState('');
  const [dgetResult, setDgetResult] = useState<any>(null);
  const [isDgetLoading, setIsDgetLoading] = useState(false);

  const [crimeDetails, setCrimeDetails] = useState('');
  const [estimateResult, setEstimateResult] = useState('');
  const [isEstimateLoading, setIsEstimateLoading] = useState(false);

  const handleSearchDocket = async () => {
    if (!dgetState) return;
    setIsDgetLoading(true);
    try {
      const query = inmateId ? `${dgetQuery} Inmate ID: ${inmateId}` : dgetQuery;
      const response = await geminiService.searchCourtDocket(dgetState, query);
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
            Find official court records and case information by state and inmate ID.
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
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="text" 
                value={dgetQuery}
                onChange={(e) => setDgetQuery(e.target.value)}
                placeholder="Case number or name..."
                className="w-full border border-[#141414] p-4 bg-transparent focus:outline-none"
              />
              <input 
                type="text" 
                value={inmateId}
                onChange={(e) => setInmateId(e.target.value)}
                placeholder="Inmate ID..."
                className="w-full border border-[#141414] p-4 bg-transparent focus:outline-none"
              />
            </div>
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
              DISCLAIMER: This tool provides rough educational estimates based on public data. It is NOT legal advice. Always consult with a qualified attorney regarding your specific situation.
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

        {/* Parole Information & Contacts */}
        <section className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white border border-[#141414] p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-[#141414]/10 pb-4">
              <Users size={28} className="text-[#141414]" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold block">Eligibility & Contacts</span>
                <h3 className="text-2xl font-serif italic font-bold">Parole Board Info</h3>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-widest text-[#141414]">Parole Eligibility</h4>
                <p className="text-xs opacity-70 leading-relaxed">
                  Eligibility dates are generally calculated based on the statutory requirement of your specific offense and the time served. Good time or earned time credits may adjust this date. This is highly state-dependent. Consult your case manager or the state's department of corrections portal using your inmate ID to find your specific projected release date.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-widest text-[#141414]">Officer Contacts</h4>
                <p className="text-xs opacity-70 leading-relaxed">
                  Upon release, you will be assigned a Parole Officer (PO). It is critical to establish contact immediately, usually within 24-48 hours. Keep their office number, mobile number, and email saved. Always report changes in employment or address immediately.
                </p>
                <div className="bg-[#141414]/5 p-3 flex items-center gap-3">
                  <Contact size={16} className="opacity-50" />
                  <span className="text-xs font-mono font-bold opacity-70">Contact your local parole office directly for officer assignments.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Parole Process & Check-ins */}
          <div className="bg-white border border-[#141414] p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-[#141414]/10 pb-4">
              <Scale size={28} className="text-[#141414]" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold block">Compliance</span>
                <h3 className="text-2xl font-serif italic font-bold">Check-In Guide</h3>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-widest text-[#141414]">RMOMS & Urine Analysis</h4>
                <p className="text-xs opacity-70 leading-relaxed">
                  Many parolees are placed on a random urinalysis schedule, often managed by third-party systems like RMOMS.
                </p>
                <ul className="list-disc pl-5 text-xs space-y-1 opacity-70">
                  <li><strong>Daily Call-ins:</strong> Call the hotline every day to see if your color/number is called.</li>
                  <li><strong>Testing Window:</strong> Report to the testing facility within business hours the same day.</li>
                  <li><strong>Dilution:</strong> Do not drink excessive water before a test; it may be flagged as a violation.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase tracking-widest text-[#141414]">Standard Requirements</h4>
                <div className="p-4 bg-emerald-50 border border-emerald-200">
                  <ul className="list-disc pl-4 text-xs text-emerald-900 space-y-1">
                    <li>Maintain steady employment or enrollment in school.</li>
                    <li>Do not associate with known felons.</li>
                    <li>Do not leave the state/county without a travel pass.</li>
                    <li>Abide by curfews and electronic monitoring rules.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
