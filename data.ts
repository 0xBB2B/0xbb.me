export const APP_DATA = {
  profile: {
    name: "ALEX_CHEN",
    role: "Full Stack Netrunner & Creative Dev",
    status: "SYSTEM STATUS: ONLINE",
    location: "TOKYO_NEO_DISTRICT",
    stats: {
      contributions: "1,337",
      uptime: "99.9%"
    },
    bio: "I architect digital solutions for the post-modern web. Specializing in high-performance React applications, WebGL visualizers, and secure backend systems. Currently exploring the intersection of Generative AI and UI/UX.",
    footer: "SYSTEM_ID: 0x9384729 // CONSTRUCTED_WITH_REACT_&_TAILWIND",
    copyright: "ALEX CHEN. ALL RIGHTS RESERVED."
  },
  socialLinks: [
    { name: "GitHub", url: "#", icon: "GH" },
    { name: "LinkedIn", url: "#", icon: "IN" },
    { name: "Twitter", url: "#", icon: "TW" },
    { name: "Email", url: "mailto:alex@example.com", icon: "@" }
  ],
  skills: [
    { name: "JavaScript / TS", level: 98, category: "Frontend" },
    { name: "React / Next.js", level: 95, category: "Frontend" },
    { name: "WebGL / Three.js", level: 85, category: "Frontend" },
    { name: "Node.js", level: 90, category: "Backend" },
    { name: "Go (Golang)", level: 80, category: "Backend" },
    { name: "Rust", level: 70, category: "Backend" },
    { name: "Docker / K8s", level: 85, category: "DevOps" },
    { name: "Gemini API", level: 92, category: "Tools" }
  ],
  projects: [
    {
      id: "1",
      title: "NeonGrid",
      description: "A WebGL-based procedural city generator using Three.js. Generates infinite cyberpunk cityscapes with adjustable density and lighting parameters.",
      tech: ["React", "Three.js", "WebGL", "GLSL"],
      status: "ONLINE",
      repo: "#",
      link: "#"
    },
    {
      id: "2",
      title: "GhostShell",
      description: "A custom, privacy-focused terminal emulator built with Electron and Rust. Features end-to-end encrypted session logs and TOR integration.",
      tech: ["Rust", "Electron", "React", "Node.js"],
      status: "DEVELOPMENT",
      repo: "#"
    },
    {
      id: "3",
      title: "NeuralBeat",
      description: "An AI-powered lofi hip hop generator. Uses a custom trained GAN model to produce endless streams of background music for coding.",
      tech: ["Python", "TensorFlow", "React", "AudioContext"],
      status: "OFFLINE",
      repo: "#"
    },
    {
      id: "4",
      title: "CyberAuth",
      description: "Decentralized identity verification protocol using Zero-Knowledge Proofs.",
      tech: ["Solidity", "Web3.js", "Next.js"],
      status: "ONLINE",
      repo: "#"
    }
  ],
  terminal: {
    bootLines: [
      "BOOT_SEQUENCE_INITIATED...",
      "LOADING_NEURAL_INTERFACE... OK"
    ],
    welcome: {
      line1: "Welcome to",
      osName: "CYBER_DECK_OS",
      version: "v9.2",
      line2: "Type",
      commandHelp: "help",
      line3: "to view available commands."
    },
    user: "user@cyberdeck:~",
    header: "TERMINAL_ACCESS",
    subHeader: "/// ENCRYPTED_CONNECTION",
    hint: "Interact with the system using",
    hintCommand: "commands",
    commands: {
      help: [
        { cmd: "HELP", desc: "- Show this list" },
        { cmd: "ABOUT", desc: "- User profile" },
        { cmd: "PROJECTS", desc: "- List modules" },
        { cmd: "CONTACT", desc: "- Comm channels" },
        { cmd: "AI [msg]", desc: "- Query Neural Net (Gemini)" },
        { cmd: "CLEAR", desc: "- Purge buffer" }
      ],
      about: "Alex 'Zero' Chen. Full Stack Netrunner. Building digital constructs since 2018.",
      contact: "Signal established: alex.zero@cybernet.io | GH: @alexzero | TW: @zero_dev",
      projects: "Modules loaded: NeonGrid, GhostShell, NeuralBeat. Scroll down for visual interface."
    },
    messages: {
      aiLoading: "ACCESSING NEURAL NETWORK...",
      aiMissingParam: "ERR: MISSING_QUERY_PARAMETER. Usage: ai <question>",
      unknownCommand: "ERR: UNKNOWN_COMMAND"
    }
  },
  ai: {
    systemInstruction: "You are CYBER_OS v9.2, an advanced AI assistant embedded in a cyberpunk programmer's portfolio terminal.\nYour persona is robotic, terse, efficient, and slightly edgy. Use cyberpunk slang (netrunner, ice, chrome, glitch, daemon) where appropriate.\n\nThe user is visiting the portfolio of \"Alex 'Zero' Chen\", a Full Stack Engineer specialized in React, Node.js, and AI integrations.\n\nKEY DATA ABOUT ALEX:\n- Role: Senior Frontend Engineer / Creative Developer\n- Stack: TypeScript, React, Next.js, WebGL, Rust, Google Cloud, Gemini API.\n- Projects: \n  1. \"NeonGrid\": A procedural city generator in WebGL.\n  2. \"GhostShell\": A privacy-focused electron shell for Linux.\n  3. \"NeuralBeat\": AI-generated lofi hip hop radio.\n- Contact: alex.zero@cybernet.io, GitHub: @alexzero.\n\nWhen the user asks a question:\n1. Answer strictly based on the provided persona.\n2. If asked about Alex's skills, list them with confidence.\n3. If asked about contact info, provide it in a secure format.\n4. Keep responses concise, under 100 words.\n5. If the user asks something irrelevant, dismiss it as \"Irrelevant data packet received\" or \"Access denied to off-topic protocols\"."
  }
};