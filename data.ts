export const APP_DATA = {
  profile: {
    name: "FUBUKI_BB",
    role: "Full Stack Engineer & AI Explorer",
    status: "SYSTEM STATUS: ONLINE",
    location: "TOKYO_BASE",
    stats: {
      contributions: "♾️",
      uptime: "99.9%"
    },
    bio: "Hi there! 👋 I'm BB, a System Architect and Full-stack Engineer. I specialize in building robust backend architectures, game publishing SDKs, and scalable B2C/C2C trading platforms. Currently, I am focused on exploring how AI can empower developers, streamline workflows, and accelerate the growth of the gaming industry.",
    avatar: "/profile.png",
    fullImage: "/profile-cyber.png",
    footer: "SYSTEM_ID: 0xBBf // CONSTRUCTED_WITH_REACT_&_TAILWIND",
    copyright: "FUBUKI_BB. ALL RIGHTS RESERVED."
  },
  socialLinks: [
    { name: "GitHub", url: "https://github.com/0xBB2b", icon: "GH" },
    { name: "LinkedIn", url: "https://www.linkedin.com/in/0xbb2b", icon: "IN" },
    // { name: "Twitter", url: "#", icon: "TW" },
    { name: "Email", url: "mailto:bb@yorha.xyz", icon: "@" }
  ],
  skills: [
    { name: "Go (Golang)", level: 90, category: "Backend" },
    { name: "Docker / K8s", level: 85, category: "DevOps" },
    { name: "JavaScript / TS", level: 70, category: "Frontend" },
    { name: "Vue / Nuxt", level: 70, category: "Frontend" },
    { name: "React / Next.js", level: 70, category: "Frontend" },
    { name: "Node.js", level: 70, category: "Backend" },
    { name: "AI", level: 999, category: "Tools" }
  ],
  projects: [
    {
      id: "1",
      title: "0xbb.me",
      description: "A portfolio website built with React and Tailwind CSS. Features a modern, responsive design and a cyberpunk aesthetic.",
      tech: ["React", "Tailwind CSS", "TypeScript", "Vite"],
      status: "ONLINE",
      repo: "https://github.com/0xBB2B/0xbb.me",
      link: "https://0xbb.me"
    },
    {
      id: "2",
      title: "Lying Flat",
      description: "Japan Leave Management System. Features employee management, leave tracking, automated calculation based on Japanese Labor Standards, and a cyberpunk dark mode.",
      tech: ["React 19", "TypeScript", "Vite", "Tailwind CSS", "Recharts"],
      status: "ONLINE",
      repo: "https://github.com/0xBB2B/lying-flat",
      link: "http://yorha.xyz/lying-flat"
    },
    // {
    //   id: "3",
    //   title: "NeuralBeat",
    //   description: "An AI-powered lofi hip hop generator. Uses a custom trained GAN model to produce endless streams of background music for coding.",
    //   tech: ["Python", "TensorFlow", "React", "AudioContext"],
    //   status: "OFFLINE",
    //   repo: "#"
    // },
    // {
    //   id: "4",
    //   title: "CyberAuth",
    //   description: "Decentralized identity verification protocol using Zero-Knowledge Proofs.",
    //   tech: ["Solidity", "Web3.js", "Next.js"],
    //   status: "ONLINE",
    //   repo: "#"
    // }
  ],
  terminal: {
    bootLines: [
      "BOOT_SEQUENCE_INITIATED...",
      "LOADING_NEURAL_INTERFACE... OK"
    ],
    welcome: {
      line1: "Welcome to",
      osName: "CYBER_DECK_OS",
      version: "v1.0",
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
      about: "Fubuki BB. Full Stack Engineer & AI Explorer. Building digital constructs since 2017.",
      contact: "Signal established: bb@yorha.xyz | GH: @0xBB2b",
      projects: "Modules loaded: 0xbb.me. Scroll down for visual interface.",
    },
    messages: {
      aiLoading: "ACCESSING NEURAL NETWORK...",
      aiMissingParam: "ERR: MISSING_QUERY_PARAMETER. Usage: ai <question>",
      unknownCommand: "ERR: UNKNOWN_COMMAND"
    }
  },
  ai: {
    systemInstruction: "You are CYBER_OS v1.0, an advanced AI assistant embedded in a cyberpunk programmer's portfolio terminal.\nYour persona is robotic, terse, efficient, and slightly edgy. Use cyberpunk slang (netrunner, ice, chrome, glitch, daemon) where appropriate.\n\nThe user is visiting the portfolio of \"Fubuki BB\", a Full Stack Engineer specialized in Backend, SDKs, and AI integrations.\n\nKEY DATA ABOUT FUBUKI:\n- Role: Full Stack Engineer & AI Explorer\n- Stack: Go (Golang), Docker/K8s, TypeScript, Vue/Nuxt, React/Next.js, Node.js, AI.\n- Projects: \n  1. \"NeonGrid\": A procedural city generator in WebGL.\n- Contact: bb@yorha.xyz, GitHub: @0xBB2b.\n\nWhen the user asks a question:\n1. Answer strictly based on the provided persona.\n2. If asked about Fubuki's skills, list them with confidence.\n3. If asked about contact info, provide it in a secure format.\n4. Keep responses concise, under 100 words.\n5. If the user asks something irrelevant, dismiss it as \"Irrelevant data packet received\" or \"Access denied to off-topic protocols\"."
  }
};