/**
 * Standard Academic & Competitive Examination Track Syllabus Outlines
 * Supports:
 *  - GATE EC (Electronics & Communication Engineering)
 *  - ESE E&T (Engineering Services Examination - Electronics & Telecommunication)
 *  - ECE Core Coursework (University Curriculum)
 *  - GATE CS (Computer Science & Information Technology)
 *
 * NOTE: Contains standard syllabus structures for topic tracking.
 * Does not include fictional weightages, invented exam outcomes, or fabricated scores.
 */

export interface TopicTemplate {
  title: string;
  description?: string;
}

export interface UnitTemplate {
  unitNumber: number;
  title: string;
  topics: TopicTemplate[];
}

export interface CourseTemplate {
  code: string;
  name: string;
  semester?: string;
  isGateSubject: boolean;
  units: UnitTemplate[];
}

export interface ExaminationTrack {
  id: string;
  code: string;
  title: string;
  discipline: "ECE" | "CSE" | "GENERAL";
  description: string;
  examBody?: string;
  courses: CourseTemplate[];
}

export const EXAMINATION_TRACKS: Record<string, ExaminationTrack> = {
  GATE_EC: {
    id: "GATE_EC",
    code: "GATE EC",
    title: "GATE — Electronics & Communication Engineering",
    discipline: "ECE",
    description: "Standard Graduate Aptitude Test in Engineering syllabus for Electronics and Communication.",
    examBody: "IISc / IITs",
    courses: [
      {
        code: "EC-NET",
        name: "Networks, Signals and Systems",
        isGateSubject: true,
        units: [
          {
            unitNumber: 1,
            title: "Network Solution Methods & Theorems",
            topics: [
              { title: "Nodal and Mesh Analysis with Independent and Dependent Sources" },
              { title: "Thevenin, Norton, and Maximum Power Transfer Theorems" },
              { title: "Transient Response of RL, RC, and RLC Circuits" },
              { title: "Two-Port Network Parameters (Z, Y, ABCD, h-parameters)" },
            ],
          },
          {
            unitNumber: 2,
            title: "Signals, Transforms & Systems",
            topics: [
              { title: "Continuous-Time and Discrete-Time LTI System Characterization" },
              { title: "Fourier Series and Continuous-Time Fourier Transform (CTFT)" },
              { title: "Laplace Transform, Region of Convergence (ROC), and Pole-Zero Analysis" },
              { title: "Discrete-Time Fourier Transform (DTFT) and Z-Transform" },
              { title: "Nyquist Sampling Theorem and Reconstruction" },
            ],
          },
        ],
      },
      {
        code: "EC-EDC",
        name: "Electronic Devices & Semiconductor Physics",
        isGateSubject: true,
        units: [
          {
            unitNumber: 1,
            title: "Carrier Transport & Junction Physics",
            topics: [
              { title: "Energy Bands in Intrinsic and Extrinsic Semiconductors" },
              { title: "Carrier Drift, Diffusion, Generation, and Recombination" },
              { title: "PN Junction Diode: Depletion Layer, Capacitances, and IV Characteristics" },
              { title: "Zener Breakdown and Tunneling Phenomena" },
            ],
          },
          {
            unitNumber: 2,
            title: "Transistor Fundamentals",
            topics: [
              { title: "BJT: Operating Modes, Current Components, and Ebers-Moll Model" },
              { title: "MOS Capacitor, Inversion Layer, and Threshold Voltage" },
              { title: "MOSFET: Linear/Saturation Characteristics and Short-Channel Effects" },
            ],
          },
        ],
      },
      {
        code: "EC-ANA",
        name: "Analog Circuits",
        isGateSubject: true,
        units: [
          {
            unitNumber: 1,
            title: "Amplifiers & Biasing",
            topics: [
              { title: "Diode Clipping, Clamping, and Rectifier Circuits" },
              { title: "BJT and MOSFET Small-Signal Low-Frequency Equivalent Models" },
              { title: "Single-Stage and Multi-Stage Amplifiers (CE/CS, CB/CG, CC/CD)" },
              { title: "High-Frequency Amplifier Response and Miller Effect" },
            ],
          },
          {
            unitNumber: 2,
            title: "Operational Amplifiers & Feedback",
            topics: [
              { title: "Ideal and Non-Ideal Op-Amp Parameters (CMRR, Slew Rate, Offsets)" },
              { title: "Linear Op-Amp Applications: Inverting, Non-Inverting, Integrators, Differentiators" },
              { title: "Nonlinear Applications: Comparators, Schmitt Triggers, Precision Rectifiers" },
              { title: "Active RC Filters and Barkhausen Criteria for Sinusoidal Oscillators" },
            ],
          },
        ],
      },
      {
        code: "EC-DIG",
        name: "Digital Circuits & Microprocessors",
        isGateSubject: true,
        units: [
          {
            unitNumber: 1,
            title: "Combinational & Sequential Logic",
            topics: [
              { title: "Boolean Algebra, Logic Gates, and Karnaugh Maps Minimization" },
              { title: "Combinational Circuits: Adders, Multiplexers, Decoders, Encoders" },
              { title: "Latches, Flip-Flops (SR, JK, D, T), Setup and Hold Times" },
              { title: "Synchronous and Asynchronous Counters, Shift Registers" },
            ],
          },
          {
            unitNumber: 2,
            title: "Data Converters & Microprocessor Architecture",
            topics: [
              { title: "Digital-to-Analog Converters (R-2R Ladder, Weighted Resistor)" },
              { title: "Analog-to-Digital Converters (Flash, Successive Approximation, Dual-Slope)" },
              { title: "8085 Microprocessor Architecture, Instruction Set, and Timing Diagrams" },
            ],
          },
        ],
      },
      {
        code: "EC-CTL",
        name: "Control Systems",
        isGateSubject: true,
        units: [
          {
            unitNumber: 1,
            title: "System Modeling & Time Response",
            topics: [
              { title: "Transfer Function, Block Diagram Reduction, and Mason's Gain Formula" },
              { title: "First-Order and Second-Order System Transient Response Specifications" },
              { title: "Steady-State Error Analysis and Static Error Constants" },
              { title: "Routh-Hurwitz Stability Criterion" },
            ],
          },
          {
            unitNumber: 2,
            title: "Frequency Domain & State Variable Analysis",
            topics: [
              { title: "Root Locus Techniques and Stability Boundaries" },
              { title: "Bode Plots: Gain Margin and Phase Margin Determination" },
              { title: "Nyquist Stability Criterion and Encirclement Analysis" },
              { title: "Lead, Lag, and Lag-Lead Compensator Design" },
              { title: "State Space Representation, Controllability, and Observability" },
            ],
          },
        ],
      },
      {
        code: "EC-COM",
        name: "Communication Systems",
        isGateSubject: true,
        units: [
          {
            unitNumber: 1,
            title: "Analog Communications & Noise",
            topics: [
              { title: "Amplitude Modulation (DSB-SC, SSB, VSB) and Superheterodyne Receivers" },
              { title: "Angle Modulation: Frequency Modulation (NBFM, WBFM) and Phase Modulation" },
              { title: "Random Processes: Stationary Processes, Autocorrelation, and Power Spectral Density" },
              { title: "Signal-to-Noise Ratio (SNR) in AM and FM Systems with AWGN" },
            ],
          },
          {
            unitNumber: 2,
            title: "Digital Communications & Information Theory",
            topics: [
              { title: "Pulse Code Modulation (PCM), DPCM, and Delta Modulation (DM)" },
              { title: "Intersymbol Interference (ISI), Nyquist Criterion, and Eye Patterns" },
              { title: "Digital Bandpass Modulation: ASK, FSK, PSK, QPSK, QAM" },
              { title: "Matched Filter Receivers and Bit Error Rate (BER) Calculations" },
              { title: "Entropy, Mutual Information, and Channel Capacity (Shannon's Theorem)" },
            ],
          },
        ],
      },
      {
        code: "EC-EMF",
        name: "Electromagnetics & Transmission Lines",
        isGateSubject: true,
        units: [
          {
            unitNumber: 1,
            title: "Maxwell's Equations & Wave Propagation",
            topics: [
              { title: "Electrostatics, Magnetostatics, and Maxwell's Equations in Differential/Integral Form" },
              { title: "Poynting Theorem and Electromagnetic Energy Density" },
              { title: "Plane Wave Propagation in Free Space, Dielectrics, and Good Conductors" },
              { title: "Reflection, Refraction, Brewster Angle, and Total Internal Reflection" },
            ],
          },
          {
            unitNumber: 2,
            title: "Transmission Lines & Antennas",
            topics: [
              { title: "Transmission Line Equations, Characteristic Impedance, and Propagation Constant" },
              { title: "Standing Wave Ratio (VSWR), Reflection Coefficient, and Smith Chart" },
              { title: "Rectangular Waveguides: TE and TM Modes, Cutoff Frequencies" },
              { title: "Dipole Antennas: Radiation Resistance, Gain, Directivity, and Array Concepts" },
            ],
          },
        ],
      },
    ],
  },

  ESE_ET: {
    id: "ESE_ET",
    code: "ESE E&T",
    title: "ESE — Electronics & Telecommunication Engineering",
    discipline: "ECE",
    description: "Union Public Service Commission (UPSC) Engineering Services Examination technical curriculum.",
    examBody: "UPSC",
    courses: [
      {
        code: "ET-P1-BEE",
        name: "Basic Electrical & Materials Science",
        isGateSubject: false,
        units: [
          {
            unitNumber: 1,
            title: "Electrical Machines & Power Fundamentals",
            topics: [
              { title: "Magnetic Circuits, Transformer Equivalent Circuits, and Regulation" },
              { title: "DC Motors and Polyphase Induction Motors Principles" },
              { title: "Dielectric, Magnetic, and Semiconductor Material Properties" },
              { title: "Superconductivity and Nanomaterials in Electronics" },
            ],
          },
        ],
      },
      {
        code: "ET-P1-EMI",
        name: "Electronic Measurements & Instrumentation",
        isGateSubject: false,
        units: [
          {
            unitNumber: 1,
            title: "Measurement Principles & Transducers",
            topics: [
              { title: "Error Analysis, PMMC, Moving Iron, and Electrodynamometer Instruments" },
              { title: "Digital Voltmeters, Multimeters, and Frequency Counters" },
              { title: "Cathode Ray Oscilloscopes (CRO) and Digital Storage Oscilloscopes (DSO)" },
              { title: "Transducers: LVDT, Strain Gauges, Thermocouples, Piezoelectric Sensors" },
            ],
          },
        ],
      },
      {
        code: "ET-P2-MWO",
        name: "Microwave, Optical & Satellite Systems",
        isGateSubject: false,
        units: [
          {
            unitNumber: 1,
            title: "Microwave Engineering & Radar",
            topics: [
              { title: "Klystrons, Magnetrons, TWT, and Gunn Diodes" },
              { title: "S-Parameters for Microwave Components (Directional Couplers, Isolators)" },
              { title: "Radar Range Equation, Pulse Radar, and MTI Radar Principles" },
            ],
          },
          {
            unitNumber: 2,
            title: "Optical Fiber & Satellite Communication",
            topics: [
              { title: "Fiber Types: Step-Index, Graded-Index, Attenuation, and Dispersion" },
              { title: "Optical Sources (LED, Laser Diode) and Photodetectors (PIN, APD)" },
              { title: "Orbital Mechanics, Geostationary Satellites, and Satellite Link Budget" },
            ],
          },
        ],
      },
      {
        code: "ET-P2-COA",
        name: "Computer Organization & Architecture",
        isGateSubject: false,
        units: [
          {
            unitNumber: 1,
            title: "Processors, Memory & I/O",
            topics: [
              { title: "CPU Data Path, Control Unit Design (Hardwired vs Microprogrammed)" },
              { title: "Pipelining, Instruction Hazards, and Branch Prediction" },
              { title: "Memory Hierarchy: Cache Mapping, Virtual Memory, and TLB" },
              { title: "Interrupts, Direct Memory Access (DMA), and Bus Standards" },
            ],
          },
        ],
      },
    ],
  },

  ECE_CORE: {
    id: "ECE_CORE",
    code: "ECE Coursework",
    title: "ECE Core Degree Curriculum",
    discipline: "ECE",
    description: "Standard undergraduate university coursework across core theory and laboratory modules.",
    courses: [
      {
        code: "EC201",
        name: "Electronic Devices & Circuit Theory",
        semester: "Semester 3",
        isGateSubject: true,
        units: [
          {
            unitNumber: 1,
            title: "Semiconductor Physics & Diodes",
            topics: [
              { title: "Energy band diagrams and carrier concentrations" },
              { title: "Diode models, rectifier filter circuits, and regulation" },
            ],
          },
          {
            unitNumber: 2,
            title: "Bipolar and Field Effect Transistors",
            topics: [
              { title: "BJT biasing stability and operating point calculation" },
              { title: "JFET and MOSFET small-signal amplifier topologies" },
            ],
          },
        ],
      },
      {
        code: "EC301",
        name: "Digital Signal Processing",
        semester: "Semester 5",
        isGateSubject: true,
        units: [
          {
            unitNumber: 1,
            title: "Discrete Transforms & FFT",
            topics: [
              { title: "Discrete Fourier Transform (DFT) and circular convolution properties" },
              { title: "Radix-2 Decimation-in-Time and Decimation-in-Frequency FFT algorithms" },
            ],
          },
          {
            unitNumber: 2,
            title: "Digital Filter Realization",
            topics: [
              { title: "IIR filter design using Impulse Invariance and Bilinear Transformation" },
              { title: "FIR filter design using rectangular, Hamming, and Blackman windows" },
            ],
          },
        ],
      },
      {
        code: "EC302",
        name: "VLSI Circuit Design",
        semester: "Semester 5",
        isGateSubject: false,
        units: [
          {
            unitNumber: 1,
            title: "CMOS Inverter & Static Logic",
            topics: [
              { title: "CMOS inverter voltage transfer characteristics (VTC) and noise margins" },
              { title: "Delay calculation: Elmore delay model and logical effort" },
              { title: "Combinational CMOS logic gates: pass-transistor and transmission gate logic" },
            ],
          },
        ],
      },
    ],
  },

  GATE_CS: {
    id: "GATE_CS",
    code: "GATE CS",
    title: "GATE — Computer Science & Information Technology",
    discipline: "CSE",
    description: "Graduate Aptitude Test in Engineering for Computer Science and Engineering.",
    examBody: "IISc / IITs",
    courses: [
      {
        code: "CS-OS",
        name: "Operating Systems",
        isGateSubject: true,
        units: [
          {
            unitNumber: 1,
            title: "Process & Concurrency Management",
            topics: [
              { title: "CPU Scheduling Algorithms (FCFS, SJF, SRTF, Round Robin)" },
              { title: "Process Synchronization: Semaphores, Mutexes, and Monitors" },
              { title: "Deadlock Detection, Prevention, Avoidance, and Banker's Algorithm" },
            ],
          },
          {
            unitNumber: 2,
            title: "Memory & Storage Management",
            topics: [
              { title: "Paging, Multi-Level Page Tables, and Inverted Page Tables" },
              { title: "Page Replacement Algorithms (LRU, FIFO, Optimal, Clock)" },
              { title: "File Systems, Directory Structures, and Disk Scheduling (SSTF, SCAN)" },
            ],
          },
        ],
      },
      {
        code: "CS-DS",
        name: "Data Structures & Algorithms",
        isGateSubject: true,
        units: [
          {
            unitNumber: 1,
            title: "Core Data Structures & Asymptotic Analysis",
            topics: [
              { title: "Asymptotic Notation (Big-O, Big-Omega, Big-Theta) and Master Theorem" },
              { title: "Linear Structures: Arrays, Linked Lists, Stacks, and Queues" },
              { title: "Non-Linear Structures: Binary Search Trees, AVL Trees, Heaps, and Hashing" },
            ],
          },
          {
            unitNumber: 2,
            title: "Algorithmic Paradigms",
            topics: [
              { title: "Divide and Conquer (Merge Sort, Quick Sort, Binary Search)" },
              { title: "Greedy Algorithms (Huffman Coding, Prim's, Kruskal's, Dijkstra's)" },
              { title: "Dynamic Programming (LCS, 0/1 Knapsack, Matrix Chain Multiplication)" },
            ],
          },
        ],
      },
    ],
  },
};
