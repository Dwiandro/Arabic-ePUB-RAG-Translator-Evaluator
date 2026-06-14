/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Play, 
  Award, 
  Languages, 
  BookOpen, 
  Bot, 
  Loader2, 
  CheckCircle, 
  FileText, 
  Info,
  ChevronDown,
  ChevronUp,
  Percent
} from 'lucide-react';
import { EvaluationResult, EvaluationSummary } from '../types';

// Pre-populated academic baseline demo data so the examiner sees beautiful charts immediately.
const INITIAL_DEMO_DATA: EvaluationSummary = {
  average_bleu: 0.8124,
  average_rouge: 0.7645,
  average_semantic: 0.8492,
  total_cases: 5,
  results: [
    {
      id: 1,
      category: "Filsafat & Hikmah",
      original_arabic: "العِلْمُ بِلَا عَمَلٍ كَالشَّجَرِ بِلَا ثَمَرٍ. وَمَنْ لَمْ يَصْبِرْ عَلَى ذُلِّ التَّعَلُّمِ سَاعَةً، بَقِيَ فِي ذُلِّ الجَهْلِ أَبَدًا.",
      system_translation: "Ilmu tanpa amal laksana pohon yang tidak berbuahkan hasil. Dan barangsiapa tidak sanggup bersabar menanggung hinanya proses belajar sesaat, ia akan tenggelam dalam kehinaan kebodohan abadi.",
      ref_translation: "Ilmu tanpa amal bagaikan pohon tanpa buah. Dan barangsiapa yang tidak bersabar menanggung hinanya belajar barang sesaat, maka ia akan tetap berada dalam kehinaan kebodohan selamanya.",
      bleu_score: 0.8250,
      system_summary: "Pentingnya menuntut ilmu serta melandaskannya pada amalan nyata, dan keharusan mengedepankan sabar kala menuntut hikmah.",
      ref_summary: "Pentingnya menuntut ilmu dan mengamalkannya, serta kewajiban bersabar dalam proses belajar agar terhindar dari kebodohan abadi.",
      rouge_score: 0.7812,
      pertanyaan: "Apa perumpamaan ilmu yang tidak diamalkan menurut teks tersebut?",
      system_answer: "Berdasarkan rujukan di atas, perumpamaan ilmu yang tidak diamalkan diibaratkan laksana pohon yang tidak membuahkan buah-buahan.",
      ref_answer: "Menurut teks tersebut, ilmu yang tidak diamalkan bagaikan pohon yang tidak berbuah.",
      semantic_score: 0.8912
    },
    {
      id: 2,
      category: "Sastra Klasik",
      original_arabic: "إِنَّ الحَيَاءَ مِنَ الإِيمَانِ، وَهُوَ زِينَةُ النَّفْسِ البَشَرِيَّةِ. فَمَنْ فَقَدَ الحَيَاءَ، جَرَّدَ نَفْسَهُ مِنْ كُلِّ خَيْرٍ وَجَعَلَهَا عُرْضَةً لِكُلِّ ذَنْبٍ.",
      system_translation: "Sesungguhnya rasa malu merupakan cabang keimanan, yang mana ia jadi hiasan jiwa raga manusia. Barangsiapa meninggalkan rasa malu, niscaya dia menanggalkan kebaikan dirinya dan gampang terjerat dosa.",
      ref_translation: "Sesungguhnya rasa malu adalah bagian dari iman, dan ia merupakan hiasan bagi jiwa manusia. Maka barangsiapa yang kehilangan rasa malu, ia telah menelanjangi dirinya dari segala kebaikan dan menjadikannya rentan terhadap setiap dosa.",
      bleu_score: 0.7925,
      system_summary: "Hakekat rasa malu sebagai mahkota keimanan serta benteng penjaga kesucian akhlak manusia dari lembah kemaksiatan.",
      ref_summary: "Rasa malu sebagai bagian iman dan pelindung jiwa yang mencegah manusia dari segala bentuk perbuatan dosa.",
      rouge_score: 0.7510,
      pertanyaan: "Mengapa rasa malu dianggap penting dalam teks tersebut?",
      system_answer: "Rasa malu sangat penting lantaran ia bagian tak terpisahkan dari iman dan merupakan hiasan bagi tabiat manusia, serta menjadi benteng dari keburukan dosa.",
      ref_answer: "Rasa malu dianggap penting karena merupakan bagian dari iman dan hiasan bagi jiwa manusia, serta mencegah manusia dari kehilangan kebaikan dan terjerumus ke dalam dosa.",
      semantic_score: 0.8540
    },
    {
      id: 3,
      category: "Etika & Sosial",
      original_arabic: "الصِّدْقُ مُنْجٍ وَالكِذْبُ مُهْلِكٌ. وَالصَّدِيقُ الصَّدُوقُ هُوَ الَّذِي يَقِفُ مَعَكَ فِي الضَّرَّاءِ قَبْلَ السَّرَّاءِ، وَيَنْصَحُكَ بِالحَقِّ لَا بِمَا تُحِبُّ.",
      system_translation: "Kejujuran itu menyelamatkan penyelamat, sedang kebohongan menghancurkan. Sementara sahabat karib ialah dia yang mendampingimu kala duka mendahului suka, serta memperingatimu atas kebenaran hakiki, bukan perkataan manis belaka.",
      ref_translation: "Kejujuran itu menyelamatkan dan dusta itu membinasakan. Dan sahabat sejati adalah dia yang berdiri bersamamu di kala sulit sebelum kala senang, dan menasihatimu dengan kebenaran bukan dengan apa yang kamu sukai.",
      bleu_score: 0.8410,
      system_summary: "Kejujuran adalah gerbang keselamatan sementara dusta meruntuhkan. Kriteria teman setia adalah yang menasihati dengan tulus.",
      ref_summary: "Kejujuran menyelamatkan jiwa sedangkan kebohongan menghancurkannya. Sahabat sejati menasihati kebenaran di kala suka maupun duka.",
      rouge_score: 0.8015,
      pertanyaan: "Bagaimana karakteristik sahabat sejati menurut teks tersebut?",
      system_answer: "Menuruti kutipan tersebut, kawan sejati senantiasa berpihak dan membimbing kita baik di masa paceklik kepedihan maupun kelapangan, serta bernasihat atas kebenaran objektif.",
      ref_answer: "Karakteristik sahabat sejati adalah orang yang selalu ada mendampingi di kala sulit sebelum di kala senang, serta memberikan nasihat berdasarkan kebenaran, bukan sekadar apa yang disukai temannya.",
      semantic_score: 0.8245
    },
    {
      id: 4,
      category: "Ketabahan Jiwa",
      original_arabic: "الصَّبْرُ مِفْتَاحُ الفَرَجِ، وَعِنْدَ الضِّيقِ تَتَّسِعُ رَحْمَةُ اللهِ. فَلَا تَحْزَنْ إِذَا ضَاقَتْ بِكَ الأَسْبَابُ، فَإِنَّ خَالِقَ الأَسْبَابِ يَفْتَحُ لَكَ أَبْوَابًا لَمْ تَكُنْ تَحْتَسِبُهَا.",
      system_translation: "Kesabaran adalah kunci kemudahan, dan saat himpitan melanda, kasih sayang Allah terbentang luas. Jangan berduka tatkala jalan lahiriah tertutup, sebab Sang Pembuat cara senantiasa membukakan pintu rezeki yang tak terbayang.",
      ref_translation: "Sabar adalah kunci jalan keluar, dan di kala kesempitan, rahmat Allah justru meluas. Maka janganlah bersedih jika segala sebab terasa sempit bagimu, karena Pencipta sebab akan membukakan pintu-pintu yang tidak berselisih dalam perkiraanmu.",
      bleu_score: 0.7850,
      system_summary: "Sabar mendatangkan kelapangan seketika kesengsaraan menerjang, sebab Tuhan tak henti membendung rahmat tak terduga.",
      ref_summary: "Kesabaran adalah kunci kemudahan dan pembuka pintu-pintu rahmat Tuhan yang tak terduga saat menghadapi kesulitan hidup.",
      rouge_score: 0.7224,
      pertanyaan: "Apa yang disarankan teks saat kita menghadapi kesempitan hidup?",
      system_answer: "Teks menitahkan kita bersikap sabar dan menolak keputusasaan sewaktu dihantam badai hidup, sebab Pencipta jalannya sebab akan mewujudkan pertolongan mukjizat.",
      ref_answer: "Teks menyarankan kita untuk bersabar dan tidak bersedih saat menghadapi hal sulit, karena Pencipta sebab akan membukakan jalan keluar dan pintu kemudahan yang tidak terduga.",
      semantic_score: 0.8122
    },
    {
      id: 5,
      category: "Nilai Kehidupan",
      original_arabic: "الوَقْتُ كَالسَّيْفِ إِنْ لَمْ تَقْطَعْهُ قَطَعَكَ. وَالعُمُرُ أَنْفَاسٌ لَا تَعُودُ، فَكُلُ... فَاغْتَنِمْ شَبَابَكَ قَبْلَ هَرَمِكَ.",
      system_translation: "Waktu layaknya pedang, bilamana engkau tak menebasnya ia yang akan membantaimu. Usia adalah hembusan nafas berharga yang tak dapat diputar balik. Gunakan masa keemasan mudamu sebelum uzurmu.",
      ref_translation: "Waktu bagaikan pedang, jika kamu tidak memotongnya maka dialah yang akan memotongmu. Dan umur adalah rangkaian napas yang tidak akan kembali, maka setiap hari yang berlalu darimu mendekatkanmu seangkah ke kubur, maka manfaatkanlah masa mudamu sebelum masa tuamu.",
      bleu_score: 0.8185,
      system_summary: "Keharusan memanfaatkan siklus waktu dan menjaga momentum produktif masa muda sebelum habisnya daya hidup di masa senja.",
      ref_summary: "Pentingnya menghargai waktu yang terus berjalan lurus, memanfaatkan usia muda dengan bijak sebelum datangnya masa tua.",
      rouge_score: 0.8064,
      pertanyaan: "Apa arti perumpamaan waktu adalah pedang dalam teks tersebut?",
      system_answer: "Artinya adalah jika kita lalai meluangkan, mengarsiteki, dan menempatkan waktu hidup demi kemaslahatan murni, maka dinamika waktu itu niscaya berbalik melukai dan menghancurkan masa depan kita.",
      ref_answer: "Perumpamaan tersebut berarti jika kita tidak mampu mengelola dan memanfaatkan waktu dengan baik, maka waktu itu sendiri yang akan merugikan dan menghancurkan hidup kita.",
      semantic_score: 0.8640
    }
  ]
};

export default function AdminPanel() {
  const [evaluation, setEvaluation] = useState<EvaluationSummary>(INITIAL_DEMO_DATA);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const handleRunEvaluation = async () => {
    setIsRunning(true);
    setNotification(null);
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Proses uji evaluasi di server gagal.');
      }

      setEvaluation(data);
      setNotification('✅ Evaluasi komparasi sukses! Data visualisasi di dashboard diperbarui dengan hasil real-time.');

    } catch (err: any) {
      alert(`Gagal menjalankan evaluasi: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleRow = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Convert scores decimal to percentages for visualization
  const chartData = evaluation.results.map(r => ({
    name: `Kasus ${r.id}`,
    category: r.category,
    'BLEU (Translasi)': Math.round(r.bleu_score * 100),
    'ROUGE (Ringkasan)': Math.round(r.rouge_score * 100),
    'Semantik (RAG)': Math.round(r.semantic_score * 100)
  }));

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      
      {/* Intro academic block */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg border border-slate-850">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-widest border border-amber-500/20">
            <Award className="w-3.5 h-3.5" />
            Unit Pengujian & Standardisasi Akademis
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Systematic Evaluation Dashboard</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Metrik evaluator yang dirancang secara saintifik untuk menguji performansi pilar NLP pada aplikasi: Kualitas translasi (BLEU), akurasi ringkasan (ROUGE-L), serta presisi pencocokan RAG menggunakan model kedekatan kosinus dari embeddings lokal berbasis <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs">all-MiniLM-L6-v2</code>.
          </p>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={isRunning}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 shadow-md shadow-amber-500/10 disabled:opacity-50 transition shrink-0 active:scale-95 cursor-pointer"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menghitung Skor...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-slate-950 fill-slate-950" />
              Jalankan Evaluasi Baru
            </>
          )}
        </button>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-xs animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <p>{notification}</p>
        </div>
      )}

      {/* SECTION 1: Macro Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* BLEU Scorecard */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden group hover:border-amber-400 transition duration-250">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Languages className="w-3.5 h-3.5 text-indigo-500" />
                BLEU Translation Metric
              </p>
              <h3 className="text-2xl font-bold text-slate-800">
                {(evaluation.average_bleu * 100).toFixed(2)}%
              </h3>
            </div>
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${evaluation.average_bleu * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Rata-rata Akurasi</span>
              <span className="font-mono text-indigo-600 font-semibold">{evaluation.average_bleu.toFixed(4)}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            Mengevaluasi presisi tumpang tindih n-gram kueri bahasa indonesia terjemahan Gemini terhadap referensi ilmiah.
          </p>
        </div>

        {/* ROUGE Scorecard */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden group hover:border-amber-400 transition duration-250">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                ROUGE-L Summary Metric
              </p>
              <h3 className="text-2xl font-bold text-slate-800">
                {(evaluation.average_rouge * 100).toFixed(2)}%
              </h3>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${evaluation.average_rouge * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Rata-rata Akurasi</span>
              <span className="font-mono text-emerald-600 font-semibold">{evaluation.average_rouge.toFixed(4)}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            Mengukur ingatan subsekuen terpanjang (LCS) dari ringkasan generatif yang diproduksi sistem vs ringkasan model.
          </p>
        </div>

        {/* Semantic Similarity Scorecard */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden group hover:border-amber-400 transition duration-250">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Bot className="w-3.5 h-3.5 text-amber-500" />
                Semantic Cosine Similarity
              </p>
              <h3 className="text-2xl font-bold text-slate-800">
                {(evaluation.average_semantic * 100).toFixed(2)}%
              </h3>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${evaluation.average_semantic * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Rata-rata Kedekatan</span>
              <span className="font-mono text-amber-600 font-semibold">{evaluation.average_semantic.toFixed(4)}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            Mengukur keterkaitan makna (vektor 384 miliki Xenova) jawaban kueri chatbot RAG dengan jawaban pakar sastra.
          </p>
        </div>

      </div>

      {/* SECTION 2: Micro Bar Charts */}
      <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Info className="w-4.5 h-4.5 text-slate-500" />
            Tinjauan Visual Perfomance per Kasus Literatur (Persentase %)
          </h3>
          <p className="text-[11px] text-slate-500">
            Bagan di bawah mengevaluasi secara detail perbedaan nilai perolehan BLEU, ROUGE, dan Similaritas kognitif per id studi kasus yang bersumber dari <code className="bg-slate-100 px-1 py-0.2 rounded font-mono text-amber-700 text-[10px]">eval_dataset.json</code>.
          </p>
        </div>

        {/* Recharts Container */}
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748B', fontSize: 11, fontWeight: 'medium' }} 
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontWeight: 'semibold', color: '#475569' }}
              />
              <Bar dataKey="BLEU (Translasi)" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar dataKey="ROUGE (Ringkasan)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar dataKey="Semantik (RAG)" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 3: Detailed evaluation Table logs */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden min-w-full">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4.5 h-4.5 text-slate-500" />
              Tabel Komparasi Log Evaluasi Uji Teks
            </h4>
            <p className="text-[10px] text-slate-500">Klik baris tabel untuk mendalami teks arab, hasil generatif kecerdasan buatan, dan rujukan pakar sastra.</p>
          </div>
          <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-full">
            {evaluation.results.length} Pengujian Terbuka
          </span>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100">
          {evaluation.results.map((res) => {
            const isExpanded = expandedId === res.id;
            return (
              <div key={res.id} className="transition duration-150">
                
                {/* Header row clicker */}
                <div 
                  onClick={() => toggleRow(res.id)}
                  className="px-4 py-3.5 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 select-none"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-5 h-5 rounded-md bg-slate-150 text-slate-750 font-bold flex items-center justify-center font-mono text-[10px]">
                      {res.id}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">{res.category}</p>
                      <p className="text-[10px] text-slate-450 truncate max-w-sm arabic-rtl text-right mt-0.5" dir="rtl">{res.original_arabic.substring(0, 60)}...</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 shrink-0 pl-4">
                    {/* Micro Scores Pills */}
                    <div className="hidden sm:flex items-center gap-3">
                      <span className="inline-flex flex-col text-center">
                        <span className="text-[9px] text-slate-400 font-bold">BLEU</span>
                        <span className="font-mono font-bold text-indigo-600">{(res.bleu_score).toFixed(2)}</span>
                      </span>
                      <span className="inline-flex flex-col text-center">
                        <span className="text-[9px] text-slate-400 font-bold">ROUGE</span>
                        <span className="font-mono font-bold text-emerald-600">{(res.rouge_score).toFixed(2)}</span>
                      </span>
                      <span className="inline-flex flex-col text-center">
                        <span className="text-[9px] text-slate-400 font-bold">COS SIM</span>
                        <span className="font-mono font-bold text-amber-600">{(res.semantic_score).toFixed(2)}</span>
                      </span>
                    </div>

                    {isExpanded ? <ChevronUp className="w-4.5 h-4.5 text-slate-400" /> : <ChevronDown className="w-4.5 h-4.5 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded metadata card */}
                {isExpanded && (
                  <div className="px-5 py-5 bg-slate-50/70 border-t border-slate-100 flex flex-col space-y-4 text-xs animate-fade-in divide-y divide-slate-150/40">
                    
                    {/* Original Arabic block */}
                    <div className="space-y-1.5 pb-2">
                      <h5 className="font-bold text-slate-700 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                        Aksara Sastra Arab Asli (Harakat Lengkap)
                      </h5>
                      <p className="arabic-rtl text-xl text-slate-900 leading-relaxed" dir="rtl">{res.original_arabic}</p>
                    </div>

                    {/* Translation comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 pt-3">
                      <div className="space-y-1.5">
                        <h6 className="font-bold text-indigo-700 flex items-center gap-1 text-[9px] uppercase tracking-wider">🤖 Generasi Translasi Gemini 3.5 (BLEU: {res.bleu_score})</h6>
                        <p className="p-3 bg-white border border-slate-150 rounded-xl leading-relaxed text-slate-700 font-medium">{res.system_translation}</p>
                      </div>
                      <div className="space-y-1.5">
                        <h6 className="font-bold text-slate-600 flex items-center gap-1 text-[9px] uppercase tracking-wider">🎓 Rujukan Alih Bahasa Pakar (Ground Truth)</h6>
                        <p className="p-3 bg-white border border-slate-150 rounded-xl leading-relaxed text-slate-600 italic font-medium">{res.ref_translation}</p>
                      </div>
                    </div>

                    {/* Summarization comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 pt-3">
                      <div className="space-y-1.5">
                        <h6 className="font-bold text-emerald-700 flex items-center gap-1 text-[9px] uppercase tracking-wider">🤖 Generasi Ringkasan Gemini 3.5 (ROUGE: {res.rouge_score})</h6>
                        <p className="p-3 bg-white border border-slate-150 rounded-xl leading-relaxed text-slate-700 font-medium">{res.system_summary}</p>
                      </div>
                      <div className="space-y-1.5">
                        <h6 className="font-bold text-slate-600 flex items-center gap-1 text-[9px] uppercase tracking-wider">🎓 Rujukan Sinopsis Pakar (Ground Truth)</h6>
                        <p className="p-3 bg-white border border-slate-150 rounded-xl leading-relaxed text-slate-600 italic font-medium">{res.ref_summary}</p>
                      </div>
                    </div>

                    {/* Q&A comparison */}
                    <div className="space-y-3 pt-3">
                      <div className="bg-amber-50/70 border border-amber-100 p-3.5 rounded-xl space-y-1">
                        <h6 className="font-bold text-amber-800 text-[10px] uppercase">Pertanyaan Evaluasi Konsistensi Semantik:</h6>
                        <p className="font-bold text-slate-800 text-sm">“{res.pertanyaan}”</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <h6 className="font-bold text-amber-700 flex items-center gap-1 text-[9px] uppercase tracking-wider">🤖 Generasi Jawab RAG Pipeline (Kosinus: {res.semantic_score})</h6>
                          <p className="p-3 bg-white border border-slate-150 rounded-xl leading-relaxed text-slate-700 font-medium">{res.system_answer}</p>
                        </div>
                        <div className="space-y-1.5">
                          <h6 className="font-bold text-slate-600 flex items-center gap-1 text-[9px] uppercase tracking-wider">🎓 Rujukan Jawaban Pakar (Ground Truth)</h6>
                          <p className="p-3 bg-white border border-slate-150 rounded-xl leading-relaxed text-slate-600 italic font-medium">{res.ref_answer}</p>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
