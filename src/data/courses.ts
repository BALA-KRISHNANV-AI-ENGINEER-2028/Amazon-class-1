import heroQuantumImg from '../assets/images/hero_quantum_computing_1792738428621.jpg';
import neuralArchImg from '../assets/images/course_neural_architectures_1792738430175.jpg';
import astroCosmosImg from '../assets/images/course_astrophysics_cosmos_1792738430637.jpg';
import bioEngImg from '../assets/images/course_molecular_bioengineering_1792738432640.jpg';
import roboticsImg from '../assets/images/course_autonomous_robotics_1792738432927.jpg';
import historyComputingImg from '../assets/images/history_computing_origins_1792739554505.jpg';
import oceanScienceImg from '../assets/images/science_oceanic_abyss_1792739555955.jpg';
import type { LearnerProfile } from '../components/AmazonHeader';

export interface LectureChapter {
  id: string;
  title: string;
  startSeconds: number;
  durationLabel: string;
  subtitleCue: string;
  transcriptSnippet: string;
}

export interface XRayInsightsData {
  summary: string;
  keyTakeaways: string[];
  coreEquation: string;
  quizQuestion: string;
  quizOptions: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface CourseItem {
  id: string;
  title: string;
  instructor: string;
  institution: string;
  category: 'quantum' | 'ai' | 'science' | 'robotics' | 'history' | 'popular-science';
  isLiveLab?: boolean;
  duration: string;
  durationSeconds: number;
  moduleCount: string;
  resolution: string;
  year: string;
  synopsis: string;
  thumbnailUri: string;
  heroUri: string;
  videoUri: string;
  lectureTheme: 'quantum' | 'neural' | 'astro' | 'bio' | 'robotics';
  initialProgressPercent: number;
  chapters: LectureChapter[];
  defaultXRay: XRayInsightsData;
}

export const LEARNER_PROFILES: LearnerProfile[] = [
  {
    id: 'alex',
    name: 'Alex Rivera',
    role: 'Graduate Fellow · Physics & ML',
    initials: 'AR',
  },
  {
    id: 'maya',
    name: 'Dr. Maya Lin',
    role: 'Principal Robotics Researcher',
    initials: 'ML',
  },
  {
    id: 'sam',
    name: 'Samir Patel',
    role: 'Undergraduate CS Honors',
    initials: 'SP',
  },
];

export const COURSES_CATALOG: CourseItem[] = [
  {
    id: 'quantum-error-correction',
    title: 'Fault-Tolerant Superconducting Qubits',
    instructor: 'Dr. Elena Vance',
    institution: 'MIT Quantum Engineering',
    category: 'quantum',
    isLiveLab: true,
    duration: '48m',
    durationSeconds: 2880,
    moduleCount: 'Module 4 of 8',
    resolution: '4K UHD',
    year: '2026',
    synopsis:
      'Step inside a millikelvin dilution refrigerator to engineer surface-code logical qubits, suppress decoherence channels, and calibrate microwave readout resonators.',
    thumbnailUri: heroQuantumImg,
    heroUri: heroQuantumImg,
    videoUri: 'classstream://quantum-error-correction',
    lectureTheme: 'quantum',
    initialProgressPercent: 62,
    chapters: [
      {
        id: 'ch-1',
        title: '01. Transmon Anharmonicity & Josephson Energy',
        startSeconds: 0,
        durationLabel: '12:00',
        subtitleCue:
          'Unlike harmonic LC oscillators, the Josephson junction introduces non-linear inductance so we can address the |0⟩ to |1⟩ transition selectively.',
        transcriptSnippet:
          'The transmon regime operates at a high EJ over EC ratio, exponentially suppressing charge noise sensitivity while retaining sufficient anharmonicity around -250 MHz for fast microwave gate pulses.',
      },
      {
        id: 'ch-2',
        title: '02. Dispersive Readout at 15 Millikelvin',
        startSeconds: 720,
        durationLabel: '12:00',
        subtitleCue:
          'By detuning the readout cavity from the qubit frequency, the resonator experiences a state-dependent dispersive shift chi.',
        transcriptSnippet:
          'In the dispersive limit where delta is much larger than coupling g, the interaction Hamiltonian shifts the resonator frequency by plus or minus g squared over delta without destroying the quantum state.',
      },
      {
        id: 'ch-3',
        title: '03. Surface Code Stabilizer Syndromes',
        startSeconds: 1440,
        durationLabel: '14:00',
        subtitleCue:
          'Ancilla qubits measure four-body X and Z parity checks continuously without collapsing the encoded logical qubit.',
        transcriptSnippet:
          'When physical gate error rates drop below the 1% surface-code threshold, increasing lattice distance d exponentially suppresses logical error per syndrome cycle.',
      },
      {
        id: 'ch-4',
        title: '04. Real-Time Cryogenic FPGA Decoding',
        startSeconds: 2280,
        durationLabel: '10:00',
        subtitleCue:
          'Minimum-weight perfect matching must complete within a single 1-microsecond stabilizer round to prevent backlog.',
        transcriptSnippet:
          'Streaming syndrome graphs into low-latency decoders tracks Pauli frames in software, avoiding unnecessary physical corrective pulses until non-Clifford T gates execute.',
      },
    ],
    defaultXRay: {
      summary:
        'Transmon qubits balance charge-noise immunity against anharmonicity while surface-code parity checks detect bit-flip and phase-flip errors non-destructively.',
      keyTakeaways: [
        'Operating at EJ / EC ≈ 50 flattens energy bands to suppress 1/f charge fluctuations.',
        'Dispersive readout infers qubit state from microwave phase shift without direct absorption.',
        'Surface codes achieve exponential error suppression once physical gate error falls below ~1%.',
      ],
      coreEquation: 'H_disp = ω_r a†a + (ω_q + χ a†a)(σ_z / 2),  where χ = g² / Δ',
      quizQuestion:
        'Why do superconducting transmon circuits include a non-linear Josephson junction alongside a shunt capacitor?',
      quizOptions: [
        'To isolate the |0⟩ ↔ |1⟩ transition from higher energy levels',
        'To raise the cryostat temperature above 4 Kelvin',
        'To eliminate the need for microwave control lines',
      ],
      correctOptionIndex: 0,
      explanation:
        'Non-linear inductance spaces energy levels unevenly (anharmonicity), preventing resonant pulses from leaking population into |2⟩.',
    },
  },
  {
    id: 'transformer-scaling-laws',
    title: 'Sparse Mixture-of-Experts & Attention Mechanics',
    instructor: 'Prof. Marcus Sterling',
    institution: 'Stanford Systems Lab',
    category: 'ai',
    isLiveLab: true,
    duration: '54m',
    durationSeconds: 3240,
    moduleCount: 'Module 6 of 10',
    resolution: '4K UHD',
    year: '2026',
    synopsis:
      'Dissect multi-head latent attention, FlashAttention SRAM tiling, and load-balanced router topologies that scale frontier foundation models cleanly.',
    thumbnailUri: neuralArchImg,
    heroUri: neuralArchImg,
    videoUri: 'classstream://transformer-scaling-laws',
    lectureTheme: 'neural',
    initialProgressPercent: 38,
    chapters: [
      {
        id: 'ch-1',
        title: '01. IO-Aware Exact Softmax Tiling',
        startSeconds: 0,
        durationLabel: '14:00',
        subtitleCue:
          'Standard attention is bottlenecked by HBM memory bandwidth rather than tensor-core FLOPs.',
        transcriptSnippet:
          'FlashAttention fuses QK transpose, online softmax rescaling, and V multiplication inside on-chip SRAM, avoiding materializing the quadratic N-by-N attention matrix in HBM.',
      },
      {
        id: 'ch-2',
        title: '02. Multi-Head Latent KV Compression',
        startSeconds: 840,
        durationLabel: '18:00',
        subtitleCue:
          'Low-rank joint compression shrinks the KV cache footprint during long-context autoregressive decoding.',
        transcriptSnippet:
          'Projecting keys and values into a shared low-dimensional latent vector dramatically reduces memory traffic per generated token while preserving full head expressivity.',
      },
      {
        id: 'ch-3',
        title: '03. Auxiliary-Free MoE Router Balancing',
        startSeconds: 1920,
        durationLabel: '22:00',
        subtitleCue:
          'Top-k token routing decouples parameter capacity from per-token FLOPs across distributed clusters.',
        transcriptSnippet:
          'Dynamic bias terms adjust expert selection thresholds without injecting interfering auxiliary loss gradients into language modeling objectives.',
      },
    ],
    defaultXRay: {
      summary:
        'Hardware-aware attention tiling and sparse expert routing decouple model capacity from memory bandwidth and per-token compute budgets.',
      keyTakeaways: [
        'Online softmax tracks running maxima to compute exact attention in fixed SRAM blocks.',
        'Latent KV compression removes autoregressive memory bottlenecks at 128K+ context lengths.',
        'Top-k sparse routing activates only a fraction of feed-forward parameters per token.',
      ],
      coreEquation: 'Attention(Q, K, V) = softmax((Q Kᵀ) / √d_k) V',
      quizQuestion:
        'What primary hardware bottleneck does SRAM block-tiling resolve in exact self-attention?',
      quizOptions: [
        'High-Bandwidth Memory (HBM) read/write traffic of the N × N matrix',
        'CPU PCIe interrupt latency during tokenization',
        'Ethernet packet loss during inference batching',
      ],
      correctOptionIndex: 0,
      explanation:
        'Fusing attention operations inside fast on-chip SRAM avoids writing and reading the massive quadratic N × N score matrix to off-chip HBM.',
    },
  },
  {
    id: 'relativistic-astrophysics',
    title: 'Relativistic Accretion Disks & Black Hole Photonics',
    instructor: 'Dr. Aris Thorne',
    institution: 'Caltech Observational Cosmology',
    category: 'science',
    isLiveLab: false,
    duration: '42m',
    durationSeconds: 2520,
    moduleCount: 'Module 3 of 6',
    resolution: '4K HDR',
    year: '2026',
    synopsis:
      'Trace null geodesics around spinning Kerr black holes to derive photon rings, Doppler beaming asymmetries, and Event Horizon Telescope interferometry.',
    thumbnailUri: astroCosmosImg,
    heroUri: astroCosmosImg,
    videoUri: 'classstream://relativistic-astrophysics',
    lectureTheme: 'astro',
    initialProgressPercent: 0,
    chapters: [
      {
        id: 'ch-1',
        title: '01. Kerr Metric & Frame Dragging',
        startSeconds: 0,
        durationLabel: '14:00',
        subtitleCue:
          'Angular momentum drags local inertial frames inside the ergosphere, shifting the innermost stable circular orbit.',
        transcriptSnippet:
          'For a prograde accretion flow around a maximally spinning Kerr black hole, the ISCO shrinks from 6 gravitational radii down to 1 gravitational radius.',
      },
      {
        id: 'ch-2',
        title: '02. Photon Sphere & Critical Impact Parameter',
        startSeconds: 840,
        durationLabel: '14:00',
        subtitleCue:
          'Light rays grazing the unstable photon orbit wind multiple times around the horizon, creating nested lensed sub-rings.',
        transcriptSnippet:
          'At impact parameter b_c = 3√3 GM/c² for a Schwarzschild metric, photons execute unstable circular orbits whose lensed projection bounds the central shadow.',
      },
      {
        id: 'ch-3',
        title: '03. VLBI Baseline Phase Closure',
        startSeconds: 1680,
        durationLabel: '14:00',
        subtitleCue:
          'Earth-diameter millimeter baselines sample Fourier visibilities to reconstruct microarcsecond horizon structure.',
        transcriptSnippet:
          'Closure phases around triangles of radio dishes cancel atmospheric phase delays above individual observatories.',
      },
    ],
    defaultXRay: {
      summary:
        'Strong-field general relativity bends emission from magnetized plasma into an asymmetric photon ring whose diameter tests the Kerr metric directly.',
      keyTakeaways: [
        'Relativistic Doppler boosting brightens plasma approaching the observer.',
        'Shadow diameter depends primarily on mass-to-distance ratio M/D, weakly on spin.',
        'Very-Long-Baseline Interferometry measures spatial Fourier components across Earth-sized baselines.',
      ],
      coreEquation: 'r_s = 2GM / c²   ·   b_crit = 3√3 (GM / c²)',
      quizQuestion:
        'Why does one side of a relativistic black hole accretion ring appear noticeably brighter in millimeter images?',
      quizOptions: [
        'Relativistic Doppler beaming of plasma orbiting at near-light speed',
        'Gravitational shielding by foreground interstellar dust clouds',
        'Thermal reflection from a solid surface inside the horizon',
      ],
      correctOptionIndex: 0,
      explanation:
        'Plasma moving toward the observer at relativistic orbital velocities experiences strong forward beaming and frequency blueshifting.',
    },
  },
  {
    id: 'programmable-gene-editing',
    title: 'Prime Editing & Programmable RNA-Guided Nucleases',
    instructor: 'Dr. Clara Sato',
    institution: 'UCSF Molecular Therapeutics',
    category: 'science',
    isLiveLab: false,
    duration: '46m',
    durationSeconds: 2760,
    moduleCount: 'Module 5 of 7',
    resolution: '4K UHD',
    year: '2026',
    synopsis:
      'Analyze Cas9 R-loop kinetics, nickase-fused reverse transcriptases, and pegRNA structural design for precise single-base genomic edits without double-strand breaks.',
    thumbnailUri: bioEngImg,
    heroUri: bioEngImg,
    videoUri: 'classstream://programmable-gene-editing',
    lectureTheme: 'bio',
    initialProgressPercent: 80,
    chapters: [
      {
        id: 'ch-1',
        title: '01. PAM Recognition & R-Loop Zipping',
        startSeconds: 0,
        durationLabel: '15:00',
        subtitleCue:
          'Cas9 scans duplex DNA via 3D collisions until encountering a 5′-NGG-3′ protospacer adjacent motif.',
        transcriptSnippet:
          'PAM binding triggers local DNA melting, allowing directional RNA-DNA heteroduplex formation across the seed region.',
      },
      {
        id: 'ch-2',
        title: '02. Nickase + Reverse Transcriptase Architecture',
        startSeconds: 900,
        durationLabel: '16:00',
        subtitleCue:
          'Prime editors nick only the non-target strand and polymerize edited DNA directly from the pegRNA template.',
        transcriptSnippet:
          'Avoiding double-strand DNA breaks minimizes indel byproducts and chromosomal translocations in post-mitotic cells.',
      },
      {
        id: 'ch-3',
        title: '03. 3′ Flap Equilibration & Mismatch Repair',
        startSeconds: 1860,
        durationLabel: '15:00',
        subtitleCue:
          'Cellular fen1 endonucleases cleave the unedited 5′ flap so ligation locks in the desired sequence.',
        transcriptSnippet:
          'Structured 3′ RNA motifs protect pegRNA extensions from exonuclease degradation prior to reverse transcription.',
      },
    ],
    defaultXRay: {
      summary:
        'Prime editing couples a Cas9 H840A single-strand nickase with an engineered reverse transcriptase to write targeted insertions, deletions, and all 12 base-to-base conversions.',
      keyTakeaways: [
        'PAM recognition precedes guide-RNA seed hybridization, accelerating genome-wide search.',
        'Single-strand nicking avoids error-prone non-homologous end joining (NHEJ).',
        '3′ structured RNA pseudoknots shield the pegRNA template from cellular exonucleases.',
      ],
      coreEquation: 'k_cleave = (k_open · k_chem) / (k_close + k_chem)',
      quizQuestion:
        'How does Prime Editing introduce new DNA sequences without requiring a donor DNA plasmid or double-strand break?',
      quizOptions: [
        'An engineered reverse transcriptase copies an extension on the pegRNA directly into the nicked DNA strand',
        'Restriction enzymes digest both strands and wait for random recombination',
        'Ribosomes translate the guide RNA directly into chromosomal histones',
      ],
      correctOptionIndex: 0,
      explanation:
        'The Cas9 nickase exposes a 3′-OH DNA primer that hybridizes to the pegRNA primer-binding site, templating direct reverse transcription.',
    },
  },
  {
    id: 'visuomotor-robotics-policies',
    title: 'Visuomotor Diffusion Policies for Dexterous Manipulation',
    instructor: 'Dr. Kenji Takahashi',
    institution: 'CMU Robotics Institute',
    category: 'robotics',
    isLiveLab: true,
    duration: '51m',
    durationSeconds: 3060,
    moduleCount: 'Module 2 of 9',
    resolution: '4K UHD',
    year: '2026',
    synopsis:
      'Train closed-loop SE(3) score-based diffusion policies that map multi-camera RGB-D wrist observations to smooth, multimodal torque-controlled manipulation trajectories.',
    thumbnailUri: roboticsImg,
    heroUri: roboticsImg,
    videoUri: 'classstream://visuomotor-robotics-policies',
    lectureTheme: 'robotics',
    initialProgressPercent: 18,
    chapters: [
      {
        id: 'ch-1',
        title: '01. Why Multimodal Action Distributions Matter',
        startSeconds: 0,
        durationLabel: '16:00',
        subtitleCue:
          'Mean-squared behavior cloning averages left and right obstacle-avoidance paths straight into collisions.',
        transcriptSnippet:
          'Representing the conditional policy as a denoising score field preserves distinct valid trajectories around symmetric manipulation obstacles.',
      },
      {
        id: 'ch-2',
        title: '02. Receding-Horizon Action Chunking',
        startSeconds: 960,
        durationLabel: '18:00',
        subtitleCue:
          'Predicting 16-step action horizons while executing 8 steps balances temporal smoothness with closed-loop reactivity.',
        transcriptSnippet:
          'DDIM accelerated sampling generates smooth joint-space trajectories in under 18 milliseconds on embedded edge GPUs.',
      },
      {
        id: 'ch-3',
        title: '03. Compliant Impedance & Contact Force Feedback',
        startSeconds: 2040,
        durationLabel: '17:00',
        subtitleCue:
          'Joint torque sensing prevents brittle jamming during sub-millimeter connector insertion.',
        transcriptSnippet:
          'Task-space impedance control shapes stiffness matrices orthogonally along contact normals versus sliding tangents.',
      },
    ],
    defaultXRay: {
      summary:
        'Diffusion policies cast robot visuomotor control as conditional trajectory denoising, solving multimodal human demonstration averaging while maintaining real-time closed-loop stability.',
      keyTakeaways: [
        'Score-based denoising captures multimodal manipulation strategies without mode-averaging collisions.',
        'Receding-horizon action chunks eliminate high-frequency jitter across camera frames.',
        'Task-space impedance control bounds contact forces during tight-tolerance assembly.',
      ],
      coreEquation: 'τ = Jᵀ(q) [ K_p (x_des − x) + K_d (ẋ_des − ẋ) ] + g(q)',
      quizQuestion:
        'Why does naive L2 regression fail when learning from human demonstrations that pass either left or right around an obstacle?',
      quizOptions: [
        'It predicts the arithmetic mean of the two modes, steering directly into the obstacle',
        'It requires supernatural camera frame rates above 10,000 FPS',
        'It disables gravity compensation on the robot manipulator joints',
      ],
      correctOptionIndex: 0,
      explanation:
        'Minimizing L2 loss over a bimodal action distribution outputs the conditional expectation halfway between modes.',
    },
  },
  {
    id: 'origins-of-computation',
    title: 'Origins of Computing: Turing, Von Neumann & Bletchley',
    instructor: 'Prof. Arthur Pendelton',
    institution: 'Cambridge History of Science',
    category: 'history',
    isLiveLab: false,
    duration: '52m',
    durationSeconds: 3120,
    moduleCount: 'Episode 1 of 4',
    resolution: '4K Remastered',
    year: '2026',
    synopsis:
      'Explore the birth of universal computation from Alan Turing’s 1936 paper machine through the electromechanical Bombe decoders and the architecture of the stored-program computer.',
    thumbnailUri: historyComputingImg,
    heroUri: historyComputingImg,
    videoUri: 'classstream://origins-of-computation',
    lectureTheme: 'neural',
    initialProgressPercent: 0,
    chapters: [
      {
        id: 'ch-1',
        title: '01. The Entscheidungsproblem & Universal Machines',
        startSeconds: 0,
        durationLabel: '18:00',
        subtitleCue:
          'Turing re-framed Hilbert’s question about mathematical decidability as a mechanical process on an infinite tape.',
        transcriptSnippet:
          'The concept of a single machine capable of simulating any other computing machine by reading its description table laid the conceptual blueprint for software.',
      },
      {
        id: 'ch-2',
        title: '02. Bletchley Park & The Cryptanalytic Bombe',
        startSeconds: 1080,
        durationLabel: '16:00',
        subtitleCue:
          'Dozens of rotating commutator drums eliminated contradictory Enigma rotor permutations at electrical speeds.',
        transcriptSnippet:
          'Diagonal board feedback allowed a single discovered deduction to propagate through 26 electrical states instantaneously.',
      },
      {
        id: 'ch-3',
        title: '03. The First Draft: Von Neumann Architecture',
        startSeconds: 2040,
        durationLabel: '18:00',
        subtitleCue:
          'Unifying program instructions and data into the same addressable memory matrix transformed hardwired calculation into general programming.',
        transcriptSnippet:
          'The EDVAC report codified the ALU, control unit, sequential memory hierarchy, and input/output channels that define modern silicon architectures.',
      },
    ],
    defaultXRay: {
      summary:
        'Universal computation arose from pure mathematical logic and wartime cryptanalysis, culminating in the stored-program architecture where programs and data coexist in shared memory.',
      keyTakeaways: [
        'Universal Turing Machines established that hardware can be static while software is programmable.',
        'Bletchley Bombes used electrical deduction propagation to break high-combinatoric Enigma keys.',
        'The Von Neumann report formalized the stored-program paradigm and sequential execution loop.',
      ],
      coreEquation: 'UTM(⟨M⟩, w) = M(w)   ·   f(instruction) ∈ MemorySpace',
      quizQuestion:
        'What was the key architectural breakthrough of John von Neumann’s 1945 EDVAC report?',
      quizOptions: [
        'Storing program instructions and data in the exact same addressable physical memory',
        'Inventing the silicon CMOS transistor gate',
        'Designing the first wireless networking protocol',
      ],
      correctOptionIndex: 0,
      explanation:
        'Prior machines like ENIAC required physical re-cabling; storing instructions in unified memory allowed software to modify and sequence its own execution.',
    },
  },
  {
    id: 'abyssal-geobiology',
    title: 'Extreme Geobiology at Hydrothermal Vents',
    instructor: 'Dr. Vivienne Moreau',
    institution: 'Woods Hole Oceanographic Institution',
    category: 'popular-science',
    isLiveLab: true,
    duration: '44m',
    durationSeconds: 2640,
    moduleCount: 'Expedition 3 of 5',
    resolution: '4K IMAX',
    year: '2026',
    synopsis:
      'Descend 2,500 meters into total oceanic darkness to study chemolithoautotrophic ecosystems flourishing on hydrogen sulfide and 350°C mineral chimneys without sunlight.',
    thumbnailUri: oceanScienceImg,
    heroUri: oceanScienceImg,
    videoUri: 'classstream://abyssal-geobiology',
    lectureTheme: 'bio',
    initialProgressPercent: 45,
    chapters: [
      {
        id: 'ch-1',
        title: '01. Black Smokers & Serpentinization',
        startSeconds: 0,
        durationLabel: '14:00',
        subtitleCue:
          'Seawater percolates through fractured basalt, superheats under 250 atmospheres of pressure, and vents metal sulfide plumes.',
        transcriptSnippet:
          'The precipitation of iron, copper, and zinc sulfides forms towering hollow chimney conduits that channel mineral-rich fluids into the cold abyssal water.',
      },
      {
        id: 'ch-2',
        title: '02. Chemolithoautotrophy & Sulfur Oxidation',
        startSeconds: 840,
        durationLabel: '16:00',
        subtitleCue:
          'Endosymbiotic bacteria power the metabolism of giant tube worms using dissolved hydrogen sulfide as an electron donor.',
        transcriptSnippet:
          'Riftia pachyptila possess specialized hemoglobin that binds both toxic sulfide and oxygen simultaneously, delivering them to intracellular symbiont bacteriocytes.',
      },
      {
        id: 'ch-3',
        title: '03. Alkaline Vents & The Origins of Cellular Life',
        startSeconds: 1800,
        durationLabel: '14:00',
        subtitleCue:
          'Natural proton gradients across porous iron-sulfur catalytic membranes mirror the chemiosmotic mechanics of ATP synthase.',
        transcriptSnippet:
          'Microporous inorganic chimneys provided the thermodynamic nonequilibrium, catalytic minerals, and proton motive force before biological membranes evolved.',
      },
    ],
    defaultXRay: {
      summary:
        'Hydrothermal vent ecosystems operate completely independent of photosynthetic sunlight, utilizing geochemical redox disequilibria that may represent the cradle of terrestrial life.',
      keyTakeaways: [
        'Superheated hydrothermal fluids precipitate metal sulfide chimneys under hydrostatic pressure.',
        'Chemolithoautotrophic bacteria oxidize H2S to fix inorganic carbon into biological biomass.',
        'Naturally occurring proton gradients across vent pores predate biological ATP synthesis.',
      ],
      coreEquation: 'CO₂ + 4H₂S + O₂ → CH₂O + 4S⁰ + 3H₂O   ·   ΔG° = −273 kJ/mol',
      quizQuestion:
        'How do giant hydrothermal vent tube worms (Riftia pachyptila) survive without a mouth, gut, or digestive tract?',
      quizOptions: [
        'They host billions of sulfur-oxidizing symbiotic bacteria in a specialized organ (trophosome)',
        'They absorb dissolved sunlight through translucent epidermal scales',
        'They continuously filter volcanic ash particles directly through external gills',
      ],
      correctOptionIndex: 0,
      explanation:
        'The worm’s vascular system delivers hydrogen sulfide and oxygen to intracellular bacterial symbionts, which synthesize organic carbon for both host and microbe.',
    },
  },
];
