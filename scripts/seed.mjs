import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    console.warn("⚠️ Production environment detected: Refusing to seed default demo student credentials in production.");
    return;
  }

  console.log("🌱 Seeding AMAHAS with realistic student data...");

  const existing = await prisma.user.findUnique({
    where: { email: "student@amahas.internal" },
  });

  if (existing) {
    console.log("ℹ️ Student user already exists, skipping re-creation.");
    return;
  }

  // 1. Create Student User & Profile
  const passwordHash = hashPassword("password123");
  const user = await prisma.user.create({
    data: {
      email: "student@amahas.internal",
      passwordHash,
      name: "Kishore Kumar",
      role: "student",
      profile: {
        create: {
          institution: "National Institute of Technology",
          program: "B.Tech Computer Science & Engineering",
          academicYear: "3rd Year",
          primaryFocus: "GATE CS 2027 + Edge AI Systems Research",
          bio: "Engineering student balancing core coursework, competitive exam preparation, systems research, and lifelong learning.",
          targetExams: "GATE Computer Science 2027, ESE IT",
        },
      },
      preferences: {
        create: {
          timeZone: "Asia/Kolkata",
          workingHoursStart: "08:30",
          workingHoursEnd: "22:30",
          preferredFocusMinutes: 45,
          theme: "dark",
          aiModelPreference: "openrouter/free",
          enableVoiceInput: true,
          enableVoiceOutput: false,
          autoScheduleBreaks: true,
          breakDurationMinutes: 15,
        },
      },
    },
  });

  console.log(`✅ Created User: ${user.name} (${user.email})`);

  // 2. Create Courses & Syllabi
  const osCourse = await prisma.course.create({
    data: {
      userId: user.id,
      code: "CS301",
      name: "Operating Systems & Virtualization",
      instructor: "Dr. A. Raman",
      semester: "Semester 5",
      confidence: 4,
      isGateSubject: true,
      weightage: 10,
      isDemo: true,
      track: "GATE_CS",
      units: {
        create: [
          {
            unitNumber: 1,
            title: "Process Management & Concurrency",
            topics: {
              create: [
                {
                  title: "CPU Scheduling Algorithms (SJF, Round Robin)",
                  status: "MASTERED",
                  confidenceLevel: 5,
                  revisionCount: 3,
                  lastStudiedAt: new Date(),
                  nextRevisionAt: new Date(Date.now() + 86400000 * 7),
                },
                {
                  title: "Classic Synchronization Problems (Semaphores & Monitors)",
                  status: "REVISED",
                  confidenceLevel: 4,
                  revisionCount: 2,
                  lastStudiedAt: new Date(),
                  nextRevisionAt: new Date(Date.now() + 86400000 * 3),
                },
                {
                  title: "Deadlock Detection & Banker's Algorithm",
                  status: "IN_PROGRESS",
                  confidenceLevel: 3,
                  revisionCount: 1,
                  lastStudiedAt: new Date(),
                  nextRevisionAt: new Date(Date.now() + 86400000 * 1),
                },
              ],
            },
          },
          {
            unitNumber: 2,
            title: "Memory Virtualization",
            topics: {
              create: [
                {
                  title: "Paging & Multi-Level Page Tables",
                  status: "MASTERED",
                  confidenceLevel: 5,
                  revisionCount: 4,
                  lastStudiedAt: new Date(),
                  nextRevisionAt: new Date(Date.now() + 86400000 * 14),
                },
                {
                  title: "Page Replacement Algorithms (LRU, Clock, Belady's Anomaly)",
                  status: "REVISED",
                  confidenceLevel: 4,
                  revisionCount: 2,
                  lastStudiedAt: new Date(),
                  nextRevisionAt: new Date(Date.now() + 86400000 * 4),
                },
              ],
            },
          },
        ],
      },
    },
  });

  const discreteCourse = await prisma.course.create({
    data: {
      userId: user.id,
      code: "MA201",
      name: "Discrete Mathematics & Graph Theory",
      instructor: "Prof. S. Varma",
      semester: "Semester 5",
      confidence: 3,
      isGateSubject: true,
      weightage: 12,
      isDemo: true,
      track: "GATE_CS",
      units: {
        create: [
          {
            unitNumber: 1,
            title: "Combinatorics & Generating Functions",
            topics: {
              create: [
                {
                  title: "Pigeonhole Principle & Inclusion-Exclusion",
                  status: "REVISED",
                  confidenceLevel: 4,
                  revisionCount: 2,
                  nextRevisionAt: new Date(Date.now() + 86400000 * 5),
                },
                {
                  title: "Recurrence Relations using Characteristic Equations",
                  status: "IN_PROGRESS",
                  confidenceLevel: 2,
                  revisionCount: 1,
                  nextRevisionAt: new Date(Date.now() + 86400000 * 1),
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("✅ Seeded Academic Courses & Syllabi");

  // 3. Create Research Project, Papers, and Experiments
  const research = await prisma.researchProject.create({
    data: {
      userId: user.id,
      title: "Sub-4-Bit Weight Quantization for On-Device Edge LLMs",
      description: "Investigating mixed-precision matrix decomposition to run 7B-parameter models under 4GB RAM on embedded edge accelerators.",
      abstract: "Large language models present severe memory bandwidth bottlenecks on mobile and micro-edge devices. This research analyzes post-training quantization error bounds across attention projection layers.",
      hypotheses: "Per-channel asymmetric 3-bit quantization with FP16 outlier retention preserves 98.5% reasoning accuracy while cutting memory bandwidth by 2.4x.",
      status: "ACTIVE",
      targetVenue: "MLSys 2027 Workshop on Edge Intelligence",
      papers: {
        create: [
          {
            title: "LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale",
            authors: "Tim Dettmers, Mike Lewis, Younes Belkada, Luke Zettlemoyer",
            year: 2022,
            doi: "10.48550/arXiv.2208.07339",
            arxivId: "2208.07339",
            venue: "NeurIPS 2022",
            readingStatus: "READ",
            userKeyTakeaways: "Vector-wise quantization with FP16 outlier coordinate retention effectively stabilizes perplexity degradation.",
            retrievedSource: "arXiv",
          },
          {
            title: "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration",
            authors: "Ji Lin, Jiaming Tang, Haotian Tang, Shang Yang, Song Han",
            year: 2023,
            arxivId: "2306.00978",
            venue: "MLSys 2024",
            readingStatus: "READING",
            userKeyTakeaways: "Protecting only 1% of salient weights based on activation magnitude minimizes quantization error without backprop.",
            retrievedSource: "OpenAlex",
          },
        ],
      },
      experiments: {
        create: [
          {
            experimentCode: "EXP-001",
            objective: "Baseline FP16 vs INT8 vs INT4 Perplexity on Wikitext-2",
            methodDescription: "Evaluated Llama-3-8B using AutoAWQ on Apple M3 Max unified memory with batch size 1.",
            configJson: JSON.stringify({ model: "Llama-3-8B", w_bit: 4, group_size: 128 }),
            metricsJson: JSON.stringify({ fp16_ppl: 5.42, int4_ppl: 5.68, latency_ms_per_tok: 18.2 }),
            resultSummary: "INT4 AWQ yields only 0.26 perplexity penalty while boosting generation throughput by 1.8x.",
            isReproducible: true,
          },
        ],
      },
      datasets: {
        create: [
          {
            name: "Wikitext-2 Raw Validation Set",
            description: "Standard benchmark corpus for language modeling perplexity evaluation.",
            sizeFormatted: "4.5 MB",
            sampleCount: 4358,
          },
        ],
      },
    },
  });

  console.log("✅ Seeded Research Lab Project & Papers");

  // 4. Create Vikunja-inspired Tasks & Projects
  const projectGeneral = await prisma.project.create({
    data: {
      userId: user.id,
      name: "GATE 2027 Mastery Milestone",
      objective: "Achieve top 100 All-India Rank in GATE Computer Science 2027.",
      status: "ACTIVE",
      priority: "HIGH",
      category: "academic",
    },
  });

  await prisma.task.createMany({
    data: [
      {
        userId: user.id,
        title: "Solve 20 Previous Years' GATE Questions on Multi-Level Paging",
        description: "Focus on virtual address breakdown into Page Directory, Page Table, and Offset.",
        status: "TODO",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 86400000 * 2),
        estimatedMinutes: 60,
        actualMinutes: 0,
        courseId: osCourse.id,
        projectId: projectGeneral.id,
      },
      {
        userId: user.id,
        title: "Implement INT3 Outlier Protection Matrix in Metal Shading Language",
        description: "Benchmark kernel execution time against standard Accelerate GEMM.",
        status: "IN_PROGRESS",
        priority: "URGENT",
        dueDate: new Date(Date.now() + 86400000 * 4),
        estimatedMinutes: 90,
        actualMinutes: 45,
        researchProjectId: research.id,
      },
      {
        userId: user.id,
        title: "Complete 15-Minute German Spaced Repetition Vocabulary Drill",
        description: "Review A2 engineering verbs and declensions.",
        status: "COMPLETED",
        priority: "MEDIUM",
        completedAt: new Date(),
        estimatedMinutes: 15,
        actualMinutes: 16,
      },
      {
        userId: user.id,
        title: "Read Chapter 4 of 'Designing Data-Intensive Applications'",
        description: "Encoding and Evolution: Protocol Buffers, Avro, and schema compatibility.",
        status: "TODO",
        priority: "LOW",
        estimatedMinutes: 45,
      },
    ],
  });

  console.log("✅ Seeded Tasks");

  // 5. Create Notes & Collections (AppFlowy-style)
  const collection = await prisma.noteCollection.create({
    data: {
      userId: user.id,
      name: "Systems & Architecture",
      color: "#00e5ff",
    },
  });

  await prisma.note.create({
    data: {
      userId: user.id,
      collectionId: collection.id,
      title: "Virtual Memory Derivations & Formulas",
      contentMarkdown: `# Virtual Memory Reference Notes

### Formula for Virtual Address Division:
$$\\text{Virtual Address Bits} = \\log_2(\\text{Virtual Address Space Size})$$
$$\\text{Page Size Offset} = \\log_2(\\text{Page Size})$$

### Multi-Level Paging Lookups:
1. Every extra page table level adds 1 memory access unless cached by TLB.
2. **Effective Access Time (EAT)**:
$$\\text{EAT} = h \\times (t_{\\text{TLB}} + t_{\\text{RAM}}) + (1 - h) \\times (t_{\\text{TLB}} + (N + 1) \\times t_{\\text{RAM}})$$
Where $h$ is TLB hit ratio and $N$ is page table levels.

*Connected to Course: CS301 (Operating Systems)*
`,
      isPinned: true,
      courseId: osCourse.id,
    },
  });

  // 6. Create 8-Language Vocabulary Cards
  const vocabSample = [
    { language: "German", word: "der Speicher", translation: "memory / storage", pronunciation: "dɛɐ̯ ˈʃpaɪ̯çɐ", sentence: "Der Speicher ist fast voll." },
    { language: "German", word: "die Schnittstelle", translation: "interface", pronunciation: "diː ˈʃnɪtˌʃtɛlə", sentence: "Die API ist eine standardisierte Schnittstelle." },
    { language: "Japanese", word: "関数 (かんすう)", translation: "function", pronunciation: "kansū", sentence: "この関数は引数を取ります。" },
    { language: "Spanish", word: "el algoritmo", translation: "algorithm", pronunciation: "el al-go-reet-mo", sentence: "El algoritmo tiene complejidad cuadrática." },
    { language: "French", word: "la mémoire tampon", translation: "buffer memory", pronunciation: "la me-mwar tan-pon", sentence: "Videz la mémoire tampon avant l'écriture." },
    { language: "Sanskrit", word: "प्रज्ञा (Prajñā)", translation: "intellect / higher awareness", pronunciation: "prajñā", sentence: "प्रज्ञा विवेकस्य मूलम्।" },
  ];

  for (const v of vocabSample) {
    await prisma.vocabularyCard.create({
      data: {
        userId: user.id,
        language: v.language,
        word: v.word,
        translation: v.translation,
        pronunciation: v.pronunciation,
        exampleSentence: v.sentence,
        repetitions: 1,
        intervalDays: 2,
        nextReviewAt: new Date(Date.now() + 86400000 * 2),
      },
    });
  }

  // 7. Create Books, Habits, Goals
  await prisma.book.create({
    data: {
      userId: user.id,
      title: "Designing Data-Intensive Applications",
      author: "Martin Kleppmann",
      format: "BOOK",
      totalUnits: 550,
      completedUnits: 210,
      status: "READING",
      rating: 5,
    },
  });

  const habit = await prisma.habit.create({
    data: {
      userId: user.id,
      name: "Daily Active Recall Revision (SM-2)",
      description: "At least 30 minutes solving flashcards or topic practice questions.",
      frequency: "DAILY",
      currentStreak: 14,
      longestStreak: 21,
      category: "study",
    },
  });

  const todayStr = new Date().toISOString().substring(0, 10);
  await prisma.habitLog.create({
    data: {
      habitId: habit.id,
      dateString: todayStr,
      completed: true,
      reflection: "Completed Operating Systems virtual memory active recall.",
    },
  });

  await prisma.goal.create({
    data: {
      userId: user.id,
      title: "Top 100 AIR in GATE Computer Science 2027",
      objective: "Master all 10 GATE CS syllabus subjects with >80% accuracy in mock exams.",
      category: "academics",
      targetDate: new Date("2027-02-15"),
      progressPct: 35,
      projectId: projectGeneral.id,
    },
  });

  // 8. Create Automations
  await prisma.automation.create({
    data: {
      userId: user.id,
      name: "Study Session Auto-Consolidation",
      description: "When a focus study session finishes, automatically update task duration, calculate next SM-2 interval, and refresh daily review.",
      triggerType: "ON_FOCUS_COMPLETED",
      actionsJson: JSON.stringify([
        { action: "UPDATE_TASK_ACTUAL_MINUTES" },
        { action: "CALCULATE_SM2_TOPIC_INTERVAL" },
        { action: "UPDATE_PRODUCTIVITY_ANALYTICS" },
      ]),
      isEnabled: true,
    },
  });

  // 9. Initial Verified AI Memories
  await prisma.aIMemory.createMany({
    data: [
      {
        userId: user.id,
        category: "academic",
        key: "primary_exam_target",
        value: "Preparing for GATE Computer Science 2027 with high priority on Operating Systems, Discrete Math, and Algorithms.",
        isApproved: true,
      },
      {
        userId: user.id,
        category: "research",
        key: "active_research_topic",
        value: "Sub-4-bit weight quantization for edge LLMs targeting MLSys 2027.",
        isApproved: true,
      },
    ],
  });

  console.log("✨ Seed completed successfully! All 28 entities initialized with verified student records.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
