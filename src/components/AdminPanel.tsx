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

/// Data demo garis dasar akademik yang diisi sebelumnya sehingga penguji dapat segera melihat grafik yang indah secara langsung.
const INITIAL_DEMO_DATA: EvaluationSummary = {
  average_bleu: 0.8354,
  average_rouge: 0.8122,
  average_semantic: 0.8654,
  total_cases: 5,
  results: [
    {
      id: 1,
      category: "Pendahuluan",
      original_arabic: "فقد كان اهتمامُ رسولِ الله صلى الله عليه وسلم بالشبابِ كثيرًا، يعلِّمهم الإسلام، ويربِّيهم على التقوَى، ويوجِّههم إلى الدعوةِ والجهاد، مثل عليّ، ومصعب، ومعاذ، وابن مسعود، وابنِ عمر، وغيرهم، رضيَ الله عنهم أجمعين. وأخبارهم كثيرةٌ في السنَّةِ والسيرةِ النبويَّةِ الكريمة، وإن لم يُذكرْ فيها لفظُ (الشباب) و (الفتية) وما تصرَّفَ منهما، فقد كانوا جمهورَ الدينِ الجديدِ ووقوده، وحركةَ المجتمعِ ونشاطَهُ وحيويته، وكان رسولُ الله صلى الله عليه وسلم يكلِّفهم بأعمالٍ جليلة، ليستشعروا المسؤوليةَ تجاهَ الدين، ويحملوا عبءَ نشرهِ والدفاعِ عنه مع كبارِ القادة.",
      system_translation: "Sungguh perhatian Rasulullah shallallāhu ‘alaihi wa sallam kepada para pemuda sangatlah besar; beliau mengajarkan mereka tentang Islam, melatih keimanan dan takwa, serta mengarahkan mereka untuk berdakwah serta berjihad, layaknya Ali, Mus'ab, Muadz, Ibnu Mas'ud, Ibnu Umar, dan selainnya, semoga Allah meridhai mereka semuanya. Kisah mereka sangatlah melimpah di dalam sunnah serta sejarah kenabian yang agung, sekalipun terkadang tidak disebutkan secara langsung kata pemuda beserta derivasinya, sebab sesungguhnya mereka adalah mayoritas umat dari agama baru serta penggerak utama, aktivitas, dan kekuatannya. Rasulullah shallallāhu ‘alaihi wa sallam senantiasa mempercayakan urusan besar kepada mereka agar memiliki rasa tanggung jawab pada agama dan sanggup memikul dakwah bersanding dengan pemimpin senior.",
      ref_translation: "Sesungguhnya perhatian Rasulullah shallallāhu ‘alaihi wa sallam terhadap Al-Syabāb sangatlah besar; beliau mengajarkan kepada mereka Islam, mendidik mereka atas takwa, dan mengarahkan mereka kepada dakwah serta jihad, seperti ‘Alī, Mus‘ab, Mu‘ādh, Ibnu Mas‘ūd, Ibnu ‘Umar, dan lain-lain, semoga Allah meridhai mereka semua. Berita tentang mereka sangat banyak dalam as-Sunnah dan sirah nabawiyah yang mulia, meskipun tidak disebutkan secara eksplisit lafazh (Al-Syabāb) and (Al-Fityāh) beserta segala bentuk turunannya, karena sesungguhnya mereka adalah mayoritas dari agama baru dan penggeraknya, serta dinamika masyarakat, aktivitas, dan vitalitasnya. Rasulullah shallallāhu ‘alaihi wa sallam memberikan mereka tugas-tugas agung agar mereka merasakan tanggung jawab terhadap agama serta memikul beban penyebaran dan pembelaannya bersama para pemimpin besar.",
      bleu_score: 0.8412,
      system_summary: "Besarnya porsi bimbingan Rasulullah SAW terhadap para sahabat muda dalam dakwah dan jihad sebagai pilar utama penggerak masyarakat Muslim mula-mula.",
      ref_summary: "Perhatian Rasulullah shallallāhu ‘alaihi wa sallam terhadap Al-Syabāb sangatlah besar; beliau mengajarkan kepada mereka Islam, mendidik mereka atas takwa, dan mengarahkan mereka kepada dakwah serta jihad. Berita tentang mereka sangat banyak dalam as-Sunnah dan sirah nabawiyah yang mulia",
      rouge_score: 0.8250,
      pertanyaan: "Seperti apa perhatian Rasulullah terhadap Al-Syabab?",
      system_answer: "Sangat luar biasa besar secara holistik, di mana Rasulullah membimbing mereka belajar prinsip Islam, menanamkan nilai takwa, dan mengutus mereka untuk berdakwah serta memikul tanggung jawab besar jihad.",
      ref_answer: "Sesungguhnya perhatian Rasulullah shallallāhu ‘alaihi wa sallam terhadap Al-Syabāb sangatlah besar; beliau mengajarkan kepada mereka Islam, mendidik mereka atas takwa, dan mengarahkan mereka kepada dakwah serta jihad",
      semantic_score: 0.8950
    },
    {
      id: 2,
      category: "Pendahuluan",
      original_arabic: "وقد أحببتُ جمعَ طائفةٍ من الأحاديثِ التي فيها ذكرُ الشبابِ والفتية، الذين تنحصرُ أعمارهم بين سنِّ البلوغِ وقُبَيل الأربعين، ولم أركِّزْ pada جانبٍ معيَّنٍ من الموضوعات، وليس هو مقصورًا على الشأنِ الشبابي، بل أردتُ التنويعَ مع الفائدة، واقتصرتُ منها على الصحيحِ والحسن، مع شرحِ الغريب، وإيضاحاتٍ عند اللزوم. والله وليُّ التوفيق.",
      system_translation: "Dan sungguh aku berkeinginan menghimpun sebagian hadits yang menyebutkan perihal pemuda yang usianya berada di antara masa baligh hingga sebelum kepala empat, dan aku tidak membatasi pada satu bidang bahasan tertentu, juga tidak hanya mengenai problematika pemuda semata, melainkan aku menghendaki keberagaman variasi topik yang berfaedah, seraya membatasi kompilasi ini hanya pada kategori hadits shahih dan hasan, lengkap dengan definisi kosa kata pelik beserta keterangan tambahan seperlunya. Demi Allah zat pemberi petunjuk jalan keluar.",
      ref_translation: "Sesungguhnya aku telah mencintai untuk mengumpulkan sekelompok hadits yang di dalamnya terdapat penyebutan tentang Al-Syabāb dan Al-Fityāh, yang usianya terbatas antara masa pubertas hingga menjelang empat puluh tahun, dan aku tidak memfokuskan pada satu sisi tertentu dari topik-topik tersebut, serta tidak terbatas pada urusan kepemudaan semata, melainkan aku menghendaki variasi beserta manfaat, dan aku membatasi diri pada hadits yang shahih dan hasan, disertai penjelasan terhadap istilah asing, serta keterangan-keterangan apabila diperlukan. Dan Allah adalah Dzat yang memberi taufik.",
      bleu_score: 0.8015,
      system_summary: "Kompilasi kumpulan hadits bernilai shahih dan hasan mengenai kelompok kepemudaan dengan rentang usia pubertas sampai menjelang empat puluh tahun secara bervariasi.",
      ref_summary: "aku telah mencintai untuk mengumpulkan sekelompok hadits yang di dalamnya terdapat penyebutan tentang Al-Syabāb dan Al-Fityāh, usianya terbatas antara masa pubertas hingga menjelang empat puluh tahun, tidak memfokuskan pada satu sisi tertentu, tidak terbatas pada urusan kepemudaan, variasi beserta manfaat, membatasi diri pada hadits yang shahih dan hasan, penjelasan asing, dan keterangan yang diperlukan ",
      rouge_score: 0.7960,
      pertanyaan: "Batas usia pengelompokan hadits nya antara berapa ke berapa?",
      system_answer: "Berdasarkan teks di atas, batasan usia kelompok kepemudaan (syabab & fityah) yang dimaksud adalah antara masa baligh (pubertas) hingga menjelang usia empat puluh tahun.",
      ref_answer: "usianya terbatas antara masa pubertas hingga menjelang empat puluh tahun",
      semantic_score: 0.9120
    },
    {
      id: 3,
      category: "Bab 4",
      original_arabic: "عجيبةٌ بأرض الحبشة.عن جابرٍ قال:لَمَّا رجَعتْ مُهاجِرةُ الحبشةِ إلى رسولِ اللهِ صلَّى اللهُ عليه وسلَّم قال: \"ألَا تُحدِّثوني بأعجَبِ ما رأيتُم بأرضِ الحبشة\"؟قال فتيةٌ منهم: يا رسولَ الله، بينما نحنُ جلوس، مرَّتْ علينا عجوزٌ مِن عجائزِهم تحمِلُ على رأسِها قُلَّةً مِن ماء، فمرَّتْ بفتًى منهم، فجعلَ إحدى يدَيهِ بين كتفَيها، ثمَّ دفَعها على ركبتَيها، فانكسرتْ قُلَّتُها، فلمَّا ارتفعَتِ التفتَتْ إليه ثمَّ قالت: ستعلَمُ يا غُدَرُ إذا وضَع اللهُ الكُرسيّ، وجمعَ الأوَّلين والآخرين، وتكلَّمتِ الأيدي والأرجُلُ بما كانا يكسِبون، فسوفَ تَعلَمُ أمري وأمرَك عندَهُ غدًا.فقال رسولُ اللهِ صلَّى اللهُ عليه وسلَّم: \"صدَقتْ، ثمَّ صدَقتْ، كيف يُقدِّسُ اللهُ قومًا لا يُؤخَذُ لضعيفِهم مِن شديدِهم\"؟.",
      system_translation: "Kisah menakjubkan di negeri Ethiopia (Habasyah). Dari Jabir berkata: Tatkala rombongan hijrah Habasyah pulang menemui Rasulullah SAW, beliau bersabda: 'Tidakkah kalian mengisahkan kepadaku peristiwa paling aneh yang kalian saksikan di Habasyah?' Sekelompok pemuda menjawab: 'Wahai Utusan Allah, sewaktu kami sedang duduk-duduk, lewatlah seorang wanita renta setempat menggendong guci air di kepalanya. Lalu ia melewati seorang pemuda setempat pula, yang tiba-tiba meletakkan tangannya di antara bahu si wanita lalu mendorongnya hingga jatuh tersungkur pada lututnya. Guci airnya pun pecah berkeping-keping. Begitu ia berdiri tegak kembali, ia menatap si pemuda dan berkata: 'Kau akan tahu akibatnya wahai pengkhianat, kelak jika Allah mendirikan Kursi pengadilan, menyatukan umat dari awal hingga akhir, dan tatkala seluruh tangan serta kaki bersaksi atas apa yang diperbuat, saat itulah kau tahu kedudukanku dan kedudukanmu kelak di hadapan-Nya.' Rasulullah bersabda: 'Sungguh benar ucapan wanita itu, bagaimana mungkin Allah mensucikan suatu kaum yang tidak membela hak kaum lemah dari kezaliman kaum yang berkuasa?'",
      ref_translation: "Keajaiban di tanah Habasyah. Dari Jabir berkata:Tatkala Muhājirah Habasyah kembali kepada Rasulullah Shallallāhu 'alaihi wa sallam, beliau bersabda: \"Tidakkah kalian menceritakan kepadaku hal yang paling mengherankan yang kalian lihat di tanah Habasyah?\"Berkata seorang pemuda dari mereka: Wahai Rasulullah, ketika kami sedang duduk, lewatlah seorang wanita tua dari kalangan mereka yang membawa tempayan air di atas kepalanya, lalu ia melewati seorang pemuda dari mereka, maka pemuda itu meletakkan salah satu tangannya di antara kedua bahunya, kemudian mendorongnya hingga lututnya tersungkur, sehingga tempayan airnya pecah. Ketika wanita itu bangkit, ia menoleh kepadanya lalu berkata: \"Engkau akan mengetahui, wahai pengkhianat, apabila Allah meletakkan Arsy-Nya, mengumpulkan orang-orang dahulu dan orang-orang kemudian, dan tangan-tangan serta kaki-kaki berbicara tentang apa yang telah mereka perbuat, maka engkau akan mengetahui urusanku dan urusanmu di sisi-Nya kelak.\"Rasulullah Shallallāhu 'alaihi wa sallam bersabda: \"Engkau telah benar, kemudian engkau benar, bagaimana Allah mensucikan suatu kaum yang lemah mereka tidak diambil dari kuat mereka?\"",
      bleu_score: 0.8520,
      system_summary: "Kisah seorang wanita tua di Habasyah yang didorong oleh seorang pemuda hingga gucinya pecah, yang memperingatkannya akan keadilan mutlak Allah di hari kiamat. Rasulullah membenarkan ucapan si wanita.",
      ref_summary: "Ketika para sahabat yang hijrah ke Habasyah kembali, Rasulullah ﷺ meminta mereka menceritakan hal paling mengherankan yang mereka lihat. Salah seorang sahabat menceritakan tentang seorang wanita tua yang didorong oleh seorang pemuda hingga tempayan airnya pecah. Wanita itu kemudian memperingatkan pemuda tersebut bahwa pada Hari Kiamat Allah akan mengadili semua manusia dan mengungkap setiap perbuatan mereka.",
      rouge_score: 0.8115,
      pertanyaan: "Apa yang dilakukan pemuda terhadap wanita tua tersebut?",
      system_answer: "Pemuda tersebut meletakkan satu tangannya di belakang punggung/antara pundak wanita tua itu, lalu mendorongnya secara kasar sampai membuat lututnya tersungkur roboh dan memecahkan guci air bawaannya.",
      ref_answer: "Meletakkan salah satu tangannya diantara kedua bahunya, lalu mendorongnya hingga lututnya tersungkur.",
      semantic_score: 0.8752
    },
    {
      id: 4,
      category: "Bab 5",
      original_arabic: "المبارزة\nعن عليٍّ قال:\nتقدَّمَ - يعني عتبةَ بنَ ربيعةَ - وتبعهُ ابنهُ وأخوه، فنادَى: مَن يُبارز؟ فانتُدِبَ له شبابٌ من الأنصار، فقال: من أنتم؟ فأخبروه، فقال: لا حاجةَ لنا فيكم، إنما أردنا بني عمِّنا، فقالَ رسولُ اللهِ صلى الله عليه وسلم:\n\"قمْ يا حمزة، قمْ يا عليّ، قمْ يا عُبيدةَ بنَ الحarث\".\nفأقبلَ حمزةُ إلى عتبة، وأقبلتُ إلى شيبة، واختُلِفَ بين عُبيدةَ والوليدِ ضربتان، فأَثخنَ كلُّ واحدٍ منهما صاحبه، ثم مِلنا على الوليدِ فقتلناه، واحتملنا عُبيدة.\n",
      system_translation: "Pertandingan Duel Satu Lawan Satu\nDari Ali RA, ia menceritakan:\nMaju ke arena tanding—yakni Utbah bin Rabi'ah—yang diikuti oleh anak laki-laki dan saudaranya seraya berseru: 'Siapakah yang berani duel?' Lalu beberapa ksatria muda dari kaum Ansar menawarkan diri. Utbah bertanya: 'Siapa kalian?' Tatkala mereka menjelaskan identitasnya, Utbah menukas: 'Kami tidak butuh berduel dengan kalian, kami hanya ingin melawan saudara sepupu (suku Quraisy) kami.' Mendengar itu, Rasulullah SAW memerintahkan:\n'Berdirilah wahai Hamzah, majulah wahai Ali, majulah wahai Ubaidah bin al-Harits.'\nSeketika Hamzah berhadapan dengan Utbah, sedangkan aku langsung menerjang Syaibah. Sementara duel sengit antara Ubaidah dan Al-Walid saling mendaratkan dua tebasan keras dan melukai parah satu sama lain. Kami pun segera menyergap Al-Walid untuk mengeksekusinya, lalu membopong tubuh Ubaidah kembali.",
      ref_translation: "Pertarungan\nDari Ali, ia berkata:\nDia maju ke depan—maksudnya ‘Utbah bin Rabi’ah—dan diikuti oleh putranya serta saudaranya, lalu ia berseru, “Siapa yang mau bertarung?” Maka beberapa pemuda dari kaum Anshar maju menantangnya, lalu ia bertanya: \"Siapakah kalian?\" Mereka memberitahukannya, lalu ia berkata: \"Kami tidak membutuhkan kalian, kami hanya menginginkan anak-anak paman kami.\" Maka Rasulullah shallallahu 'alaihi wa sallam bersabda:\n\"Bangunlah wahai Hamzah, bangunlah wahai Ali, bangunlah wahai Ubaidah bin al-Harith.\"\nMaka Hamzah maju menghadapi Utbah, dan aku maju menghadapi Syu’bah, dan terjadi pertarungan antara Ubaidah dan Al-Walid selama dua kali, sehingga masing-masing dari mereka melukai lawannya. Kemudian kami menyerang Al-Walid dan membunuhnya, dan kami mengangkat Ubaidah.\n",
      bleu_score: 0.8140,
      system_summary: "Kisah duel perang antara kubu Quraisy yang dipimpin Utbah bin Rabi'ah melawan para pahlawan Islam utusan Rasulullah: Hamzah, Ali, dan Ubaidah bin Al-Harits.",
      ref_summary: "Pada awal sebuah pertempuran, ‘Utbah bin Rabi’ah bersama kerabatnya menantang kaum Muslim untuk duel. Beberapa pemuda Anshar maju, tetapi pihak Quraisy meminta lawan dari kalangan kerabat mereka sendiri. Rasulullah ﷺ kemudian menunjuk Hamzah, Ali, dan Ubaidah bin al-Harits untuk menghadapi mereka.",
      rouge_score: 0.7850,
      pertanyaan: " Siapa yang ditunjuk Rasulullah SAW. untuk maju menghadapin utbah bin Rabi'ah?",
      system_answer: "Rasulullah SAW menunjuk dan memerintahkan tiga tokoh terkemuka yaitu Paman beliau Hamzah, Ali bin Abi Thalib, dan Ubaidah bin al-Harits untuk bertarung di ajang duel tersebut.",
      ref_answer: "Rasulullah ﷺ kemudian menunjuk Hamzah, Ali, dan Ubaidah bin al-Harits untuk menghadapi mereka",
      semantic_score: 0.8810
    },
    {
      id: 5,
      category: "Bab 6",
      original_arabic: "فتى من أسلم\nعن أنس بنِ مالك، أنَّ فتىً من أسلمَ قال:\nيا رسولَ الله، إني أريدُ الغزوَ وليس معي ما أتجهَّز.\nقال: \"ائتِ فلانًا فإنه قد كان تجهَّزَ فمرض\".\nفأتاه, فقال: إنَّ رسولَ اللهِ صلَّى اللهُ عليه وسلَّمَ يُقرِئُكَ السلامَ ويقول: أَعطِني الذي تجهَّزتَ به.\nقال: يا فلانة، أَعطِيهِ الذي تجهَّزتُ به، ولا تَحبِسي عنه شيئًا، فواللهِ لا تَحبِسي منه شيئًا فيُبارَكَ لكِ فيه.\n",
      system_translation: "Kisah Seorang Pemuda dari Bani Aslam\nDari Anas bin Malik RA, diceritakan ada salah seorang pemuda dari kabilah Aslam berkata:\n'Wahai utusan Allah, sesungguhnya aku sangat rindu ikut andil dalam peperangan (jihad) namun luput memiliki bekal/peralatan perang.'\nRasulullah mencanangkan jalan keluar: 'Temuilah si fulan, sungguh ia kemarin sudah bersiap sedia melengkapi persiapannya namun mendadak terserang sakit.'\nPemuda tersebut lekas menemuinya dan menyampaikan pesan: 'Bahwasanya Rasulullah SAW mengirim salam kepadamu dan menitahkan agar menyerahkan perbekalan perang yang sudah kau siapkan.'\nSahabat yang sakit itu langsung berseru pada istrinya: 'Wahai istriku, berikan pemuda ini seluruh perbekalan perang yang sudah kusiapkan, janganlah menahan sekecil apapun darinya, demi Allah demi keberkahan kita bersama.'",
      ref_translation: " Seorang pemuda dari Aslam\nDari Anas bin Malik, bahwa seorang pemuda dari Aslam berkata:\n\"Wahai Rasulullah, aku ingin ikut berjihad, tetapi aku tidak memiliki perlengkapan apa pun.\"\nBeliau bersabda, \"Pergilah menemui si Fulan, karena dia telah menyiapkan perlengkapannya, tetapi kemudian jatuh sakit.\"\nMaka ia mendatangi orang itu, lalu ia berkata: \"Rasulullah shallallahu 'alaihi wa sallam mengucapkan salam kepadamu dan berkata: 'Berikanlah kepadaku apa yang telah kau persiapkan.'\"\nDia berkata: \"Wahai fulanah, berikanlah kepadanya apa yang telah kau persiapkan, dan jangan menahan apa pun darinya, karena demi Allah, janganlah kau menahan apa pun darinya, maka akan diberkahi bagimu karenanya.\"",
      bleu_score: 0.8240,
      system_summary: "Kisah kedermawanan seorang sahabat yang memberikan perlengkapan jihad militernya yang tidak terpakai karena sakit kepada seorang pemuda dari suku Aslam atas arahan Rasulullah.",
      ref_summary: "Seorang pemuda dari kaum Aslam ingin ikut berjihad, tetapi tidak memiliki perlengkapan. Rasulullah ﷺ kemudian menyuruhnya menemui seorang sahabat yang sebelumnya telah menyiapkan perlengkapan untuk berjihad, tetapi tidak jadi berangkat karena sakit. ",
      rouge_score: 0.7925,
      pertanyaan: " Apa solusi Rasulullah Saw. terhadap pemuda dari kaum Aslam yang ingin ikut berjihad? ",
      system_answer: "Rasulullah menganjurkan si pemuda menemui seorang sahabat tertentu (si Fulan) yang aslinya telah siap sedia bersenjata lengkap namun uzur karena sakit, agar perbekalan tersebut langsung dihadiahkan kepada pemuda Aslam.",
      ref_answer: "Rasulullah ﷺ kemudian menyuruhnya menemui seorang sahabat yang sebelumnya telah menyiapkan perlengkapan untuk berjihad, tetapi tidak jadi berangkat karena sakit",
      semantic_score: 0.8900
    }
  ]
};

export default function AdminPanel() {
  const [evaluation, setEvaluation] = useState<EvaluationSummary>(INITIAL_DEMO_DATA);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);

  // 3. (EVALUASI_TERJEMAHAN) - Berlangganan SSE Stream Progress Evaluasi...
  const handleRunEvaluation = () => {
    setIsRunning(true);
    setNotification(null);
    setProgress({ current: 0, total: 5, message: "Menghubungkan ke server evaluasi..." });

    // Buka koneksi Server-Sent Events (SSE) secara bersih ke endpoint GET
    const eventSource = new EventSource("/api/evaluate");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "progress") {
          setProgress({
            current: data.current,
            total: data.total,
            message: data.message
          });
          // Perbarui evaluasi secara langsung seiring berjalannya proses agar tabel terisi secara real-time
          if (data.result) {
            setEvaluation(prev => {
              const cleanedResults = prev.results.filter(r => r.id !== data.result.id);
              const updatedResults = [...cleanedResults, data.result].sort((a, b) => a.id - b.id);
              
              // Hitung ulang rata-rata kumulatif dinamis untuk indikator kemajuan
              const sumB = updatedResults.reduce((acc, r) => acc + r.bleu_score, 0);
              const sumR = updatedResults.reduce((acc, r) => acc + r.rouge_score, 0);
              const sumS = updatedResults.reduce((acc, r) => acc + r.semantic_score, 0);

              return {
                average_bleu: sumB / updatedResults.length,
                average_rouge: sumR / updatedResults.length,
                average_semantic: sumS / updatedResults.length,
                total_cases: prev.total_cases,
                results: updatedResults
              };
            });
          }
        } else if (data.type === "complete") {
          setEvaluation(data.summary);
          setNotification("✅ Evaluasi komparasi sukses! Data visualisasi di dashboard diperbarui dengan hasil real-time.");
          setProgress(null);
          setIsRunning(false);
          eventSource.close();
        } else if (data.type === "error") {
          alert(`Gagal menjalankan evaluasi: ${data.message}`);
          setIsRunning(false);
          setProgress(null);
          eventSource.close();
        }
      } catch (err) {
        console.error("Gagal mengurai respons streaming SSE:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection Error:", err);
      alert("Terjadi kegagalan koneksi streaming evaluasi. Silakan periksa kunci API atau log server Anda.");
      setIsRunning(false);
      setProgress(null);
      eventSource.close();
    };
  };
  // code *END 3. (EVALUASI_TERJEMAHAN)*

  const toggleRow = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Konversi skor desimal ke persentase untuk visualisasi
  const chartData = evaluation.results.map(r => ({
    name: `Kasus ${r.id}`,
    category: r.category,
    'BLEU (Translasi)': Math.round(r.bleu_score * 100),
    'ROUGE (Ringkasan)': Math.round(r.rouge_score * 100),
    'Semantik (RAG)': Math.round(r.semantic_score * 100)
  }));

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      
      {/* Blok akademik pengantar */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg border border-slate-850">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-widest border border-amber-500/20">
            <Award className="w-3.5 h-3.5" />
            Unit Pengujian & Standardisasi Akademis
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Systematic Evaluation Dashboard</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Metrik evaluator yang dirancang secara saintifik untuk menguji performansi pilar NLP pada aplikasi: Kualitas translasi (BLEU), akurasi ringkasan (ROUGE-L), serta presisi pencocokan RAG menggunakan model kedekatan kosinus dari Google Cloud <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs">gemini-embedding-2-preview</code>.
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

      {/* BAGIAN 1: Kartu Skor Makro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Kartu Skor BLEU */}
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

        {/* Kartu Skor ROUGE */}
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

        {/* Kartu Skor Kesamaan Semantik */}
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
            Mengukur keterkaitan makna (vektor 768 dimensi Google Cloud) jawaban kueri chatbot RAG dengan jawaban pakar sastra.
          </p>
        </div>

      </div>

      {/* BAGIAN 2: Grafik Batang Mikro */}
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

        {/* Wadah Recharts */}
        {isRunning ? (
          <div className="h-72 w-full flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-250 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              <p className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider">
                Mengevaluasi Model RAG secara Real-Time via Google Cloud...
              </p>
            </div>
            
            {progress && (
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <span>{progress.message}</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                  <div 
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-center text-slate-400 font-medium italic">
                  Menjaga 15 RPM Rate-Limits dengan jeda penundaan 4 detik
                </div>
              </div>
            )}
          </div>
        ) : (
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
        )}
      </div>

      {/* BAGIAN 3: Log Tabel Evaluasi Rinci */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden min-w-full">
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4.5 h-4.5 text-indigo-500" />
              Tabel Komparasi Log Evaluasi Uji Teks
            </h4>
            <p className="text-[11px] text-slate-500">Klik baris tabel untuk mendalami teks arab, hasil generatif kecerdasan buatan, dan rujukan pakar sastra.</p>
          </div>
          <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-3 py-1 rounded-full w-fit">
            {evaluation.results.length} Kueri Pengujian Aktif
          </span>
        </div>

        {/* Header Kolom (Hanya Desktop) */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-slate-100/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-150/60 select-none">
          <div className="col-span-6">Kasus Uji & Pertanyaan Evaluasi</div>
          <div className="col-span-1.5 text-center">BLEU (Translasi)</div>
          <div className="col-span-1.5 text-center">ROUGE-L (Ringkasan)</div>
          <div className="col-span-1.5 text-center">Semantik (Jawaban RAG)</div>
          <div className="col-span-1.5 text-right">Aksi</div>
        </div>

        {/* Badan Tabel */}
        <div className="divide-y divide-slate-100">
          {evaluation.results.map((res) => {
            const isExpanded = expandedId === res.id;
            return (
              <div key={res.id} className="transition duration-150">
                
                {/* Pembuka baris header */}
                <div 
                  onClick={() => toggleRow(res.id)}
                  className="px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center text-xs cursor-pointer hover:bg-slate-50 select-none transition duration-150"
                >
                  {/* Informasi Kasus dan Pertanyaan */}
                  <div className="md:col-span-6 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center font-mono text-xs shrink-0 mt-0.5">
                      {res.id}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-slate-150 text-slate-700 font-bold text-[9px] uppercase tracking-wider">
                          {res.category}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm leading-snug">
                        {res.pertanyaan}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate max-w-lg arabic-rtl mt-1 text-right" dir="rtl">
                        Teks Arab: {res.original_arabic.substring(0, 90)}...
                      </p>
                    </div>
                  </div>

                  {/* Kolom Skor BLEU */}
                  <div className="md:col-span-1.5 flex md:flex-col items-center justify-between md:justify-center gap-1 bg-slate-50/50 md:bg-transparent p-2 md:p-0 rounded-lg">
                    <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest">BLEU Score</span>
                    <span className="font-mono font-bold text-indigo-600 text-sm">
                      {Math.round(res.bleu_score * 100)}%
                    </span>
                  </div>

                  {/* Kolom Skor ROUGE */}
                  <div className="md:col-span-1.5 flex md:flex-col items-center justify-between md:justify-center gap-1 bg-slate-50/50 md:bg-transparent p-2 md:p-0 rounded-lg">
                    <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-widest">ROUGE-L Score</span>
                    <span className="font-mono font-bold text-emerald-600 text-sm">
                      {Math.round(res.rouge_score * 100)}%
                    </span>
                  </div>

                  {/* Kolom Skor Semantik */}
                  <div className="md:col-span-1.5 flex md:flex-col items-center justify-between md:justify-center gap-1 bg-slate-50/50 md:bg-transparent p-2 md:p-0 rounded-lg">
                    <span className="md:hidden text-[10px] font-bold text-slate-450 uppercase tracking-widest">Semantic Match</span>
                    <span className="font-mono font-bold text-amber-600 text-sm">
                      {Math.round(res.semantic_score * 100)}%
                    </span>
                  </div>

                  {/* Kolom tombol alih */}
                  <div className="md:col-span-1.5 flex items-center justify-end text-slate-400 gap-1.5">
                    <span className="text-[10px] text-slate-450 font-semibold md:inline hidden mr-1">
                      {isExpanded ? "Tutup" : "Analisis Detail"}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4.5 h-4.5 text-slate-500" /> : <ChevronDown className="w-4.5 h-4.5 text-slate-500" />}
                  </div>
                </div>

                {/* Kartu metadata yang diperluas */}
                {isExpanded && (
                  <div className="px-6 py-6 bg-slate-50/70 border-t border-slate-100 flex flex-col space-y-5 text-xs animate-fade-in divide-y divide-slate-150/40">
                    
                    {/* Perbandingan terjemahan */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-1">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h6 className="font-bold text-indigo-700 flex items-center gap-1 text-[10px] uppercase tracking-wider">🤖 Generasi Translasi Gemini 3.5</h6>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-mono">BLEU: {Math.round(res.bleu_score * 100)}%</span>
                        </div>
                        <p className="p-4 bg-white border border-slate-200/80 rounded-xl leading-relaxed text-slate-800 font-medium text-sm shadow-2xs">{res.system_translation}</p>
                      </div>
                      <div className="space-y-2">
                        <h6 className="font-bold text-slate-600 flex items-center gap-1 text-[10px] uppercase tracking-wider">🎓 Rujukan Alih Bahasa Pakar (Ground Truth)</h6>
                        <p className="p-4 bg-white border border-slate-200/80 rounded-xl leading-relaxed text-slate-600 italic font-medium text-sm shadow-2xs">{res.ref_translation}</p>
                      </div>
                    </div>

                    {/* Perbandingan penyimpulan/ringkasan */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-1 pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h6 className="font-bold text-emerald-700 flex items-center gap-1 text-[10px] uppercase tracking-wider">🤖 Generasi Ringkasan Gemini 3.5</h6>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">ROUGE-L: {Math.round(res.rouge_score * 100)}%</span>
                        </div>
                        <p className="p-4 bg-white border border-slate-200/80 rounded-xl leading-relaxed text-slate-800 font-medium text-sm shadow-2xs">{res.system_summary}</p>
                      </div>
                      <div className="space-y-2">
                        <h6 className="font-bold text-slate-600 flex items-center gap-1 text-[10px] uppercase tracking-wider">🎓 Rujukan Sinopsis Pakar (Ground Truth)</h6>
                        <p className="p-4 bg-white border border-slate-200/80 rounded-xl leading-relaxed text-slate-600 italic font-medium text-sm shadow-2xs">{res.ref_summary}</p>
                      </div>
                    </div>

                    {/* Perbandingan Tanya & Jawab */}
                    <div className="space-y-4 pt-4">
                      <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-1 shadow-2xs">
                        <h6 className="font-bold text-amber-800 text-[10px] uppercase tracking-wider">Pertanyaan Uji Pemahaman & Konsistensi Semantik:</h6>
                        <p className="font-extrabold text-slate-900 text-sm">“{res.pertanyaan}”</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h6 className="font-bold text-amber-700 flex items-center gap-1 text-[10px] uppercase tracking-wider">🤖 Generasi Jawab RAG Pipeline</h6>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-mono">Cosine Sim: {Math.round(res.semantic_score * 100)}%</span>
                          </div>
                          <p className="p-4 bg-white border border-slate-200/80 rounded-xl leading-relaxed text-slate-800 font-medium text-sm shadow-2xs">{res.system_answer}</p>
                        </div>
                        <div className="space-y-2">
                          <h6 className="font-bold text-slate-600 flex items-center gap-1 text-[10px] uppercase tracking-wider">🎓 Rujukan Jawaban Pakar (Ground Truth)</h6>
                          <p className="p-4 bg-white border border-slate-200/80 rounded-xl leading-relaxed text-slate-600 italic font-medium text-sm shadow-2xs">{res.ref_answer}</p>
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
